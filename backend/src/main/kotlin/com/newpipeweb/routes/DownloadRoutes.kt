package com.newpipeweb.routes

import com.newpipeweb.database.repositories.DownloadRepository
import com.newpipeweb.models.StartDownloadRequest
import io.ktor.client.*
import io.ktor.client.engine.cio.*
import io.ktor.client.request.*
import io.ktor.client.statement.*
import io.ktor.http.*
import io.ktor.server.application.*
import io.ktor.server.request.*
import io.ktor.server.response.*
import io.ktor.server.routing.*
import com.newpipeweb.util.resolveDownloadsDir
import java.io.FileOutputStream
import java.io.File
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.Job
import kotlinx.coroutines.CoroutineStart
import kotlinx.coroutines.cancelAndJoin
import kotlinx.coroutines.launch
import io.ktor.utils.io.readAvailable
import java.io.BufferedOutputStream
import java.util.concurrent.ConcurrentHashMap



private val httpClient = HttpClient(CIO) {
    expectSuccess = false
    engine {
        requestTimeout = 0
    }
}

private val downloadJobs = ConcurrentHashMap<Int, Job>()
private const val DOWNLOAD_BUFFER_SIZE = 64 * 1024
private const val PROGRESS_UPDATE_INTERVAL_MS = 500L
private const val PROGRESS_UPDATE_BYTES = 1024L * 1024L

private fun Application.launchDownload(
    downloadId: Int,
    streamUrl: String,
    filePath: String,
    resume: Boolean
): Job = launch(Dispatchers.IO, start = CoroutineStart.LAZY) {
    try {
        val outputFile = File(filePath)
        val existingBytes = if (resume && outputFile.exists()) outputFile.length() else 0L
        val response = httpClient.get(streamUrl) {
            headers {
                append(HttpHeaders.UserAgent, "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36")
                if (existingBytes > 0) {
                    append(HttpHeaders.Range, "bytes=$existingBytes-")
                }
            }
        }
        val appendToFile = existingBytes > 0 && response.status == HttpStatusCode.PartialContent
        val startingBytes = if (appendToFile) existingBytes else 0L
        val responseLength = response.contentLength() ?: -1L
        val contentLength = if (responseLength > 0) responseLength + startingBytes else responseLength
        var downloadedBytes = startingBytes

        response.bodyAsChannel().also { channel ->
            BufferedOutputStream(
                FileOutputStream(outputFile, appendToFile),
                DOWNLOAD_BUFFER_SIZE
            ).use { outputStream ->
                val buffer = ByteArray(DOWNLOAD_BUFFER_SIZE)
                var lastProgressUpdateAt = System.currentTimeMillis()
                var lastProgressUpdateBytes = startingBytes
                while (!channel.isClosedForRead) {
                    val read = channel.readAvailable(buffer, 0, buffer.size)
                    if (read > 0) {
                        outputStream.write(buffer, 0, read)
                        downloadedBytes += read.toLong()
                        val now = System.currentTimeMillis()
                        if (downloadedBytes - lastProgressUpdateBytes >= PROGRESS_UPDATE_BYTES ||
                            now - lastProgressUpdateAt >= PROGRESS_UPDATE_INTERVAL_MS
                        ) {
                            DownloadRepository.updateProgress(downloadId, downloadedBytes, contentLength)
                            lastProgressUpdateAt = now
                            lastProgressUpdateBytes = downloadedBytes
                        }
                    }
                }
            }
        }

        DownloadRepository.markCompleted(downloadId, downloadedBytes)
    } catch (e: Exception) {
        if (e is kotlinx.coroutines.CancellationException) throw e
        println("Download failed for $downloadId: ${e.message}")
        e.printStackTrace()
        DownloadRepository.markFailed(downloadId)
    } finally {
        downloadJobs.remove(downloadId)
    }
}

fun Route.downloadRoutes() {
    route("/downloads") {

        // List all downloads
        get {
            call.respond(DownloadRepository.getAll())
        }

        // Start a new download
        post {
            val request = call.receive<StartDownloadRequest>()

            val downloadsDir = resolveDownloadsDir()
            downloadsDir.mkdirs()

            val ext = if (request.isAudioOnly) "m4a" else "mp4"
            val safeTitle = request.title.replace(Regex("[^a-zA-Z0-9._-]"), "_").take(100)
            val safeVideoId = request.videoId.replace(Regex("[^a-zA-Z0-9._-]"), "_").take(50)
            val filePath = "${downloadsDir.absolutePath}/${safeTitle}_${safeVideoId}.$ext"

            val downloadId = DownloadRepository.create(
                videoId = request.videoId,
                title = request.title,
                uploader = request.uploader,
                thumbnailUrl = request.thumbnailUrl,
                filePath = filePath,
                quality = request.quality,
                isAudioOnly = request.isAudioOnly,
                streamUrl = request.streamUrl
            )

            // Stream the download in the background
            val downloadJob = call.application.launchDownload(downloadId, request.streamUrl, filePath, resume = false)
            downloadJobs[downloadId] = downloadJob
            downloadJob.start()

            call.respond(HttpStatusCode.Accepted, mapOf("id" to downloadId))
        }

        // Get single download status
        get("/{id}") {
            val id = call.parameters["id"]?.toIntOrNull()
                ?: return@get call.respond(HttpStatusCode.BadRequest, "Invalid id")
            val download = DownloadRepository.getById(id)
                ?: return@get call.respond(HttpStatusCode.NotFound)
            call.respond(download)
        }

        // Pause an active download while preserving its partial file.
        post("/{id}/pause") {
            val id = call.parameters["id"]?.toIntOrNull()
                ?: return@post call.respond(HttpStatusCode.BadRequest, "Invalid id")
            val download = DownloadRepository.getById(id)
                ?: return@post call.respond(HttpStatusCode.NotFound)
            if (download.status != "PENDING" && download.status != "DOWNLOADING") {
                return@post call.respond(HttpStatusCode.Conflict, "Download is not active")
            }

            downloadJobs.remove(id)?.cancelAndJoin()
            DownloadRepository.markPaused(id)
            call.respond(HttpStatusCode.NoContent)
        }

        // Resume a paused download, continuing from the existing partial file when supported.
        post("/{id}/resume") {
            val id = call.parameters["id"]?.toIntOrNull()
                ?: return@post call.respond(HttpStatusCode.BadRequest, "Invalid id")
            val download = DownloadRepository.getById(id)
                ?: return@post call.respond(HttpStatusCode.NotFound)
            if (download.status != "PAUSED") {
                return@post call.respond(HttpStatusCode.Conflict, "Only paused downloads can be resumed")
            }
            val streamUrl = download.streamUrl
                ?: return@post call.respond(HttpStatusCode.UnprocessableEntity, "No stream URL stored")

            DownloadRepository.markPending(id)
            val downloadJob = call.application.launchDownload(id, streamUrl, download.filePath, resume = true)
            downloadJobs[id] = downloadJob
            downloadJob.start()
            call.respond(HttpStatusCode.Accepted, mapOf("id" to id))
        }

        // Delete a download record (and optionally the file)
        delete("/{id}") {
            val id = call.parameters["id"]?.toIntOrNull()
                ?: return@delete call.respond(HttpStatusCode.BadRequest, "Invalid id")
            downloadJobs.remove(id)?.cancelAndJoin()
            val download = DownloadRepository.getById(id)
            download?.let { File(it.filePath).delete() }
            DownloadRepository.delete(id)
            call.respond(HttpStatusCode.NoContent)
        }

        // Retry a FAILED download
        post("/{id}/retry") {
            val id = call.parameters["id"]?.toIntOrNull()
                ?: return@post call.respond(HttpStatusCode.BadRequest, "Invalid id")

            val download = DownloadRepository.getById(id)
                ?: return@post call.respond(HttpStatusCode.NotFound)

            if (download.status != "FAILED") {
                return@post call.respond(
                    HttpStatusCode.Conflict,
                    "Only FAILED downloads can be retried (current status: ${download.status})"
                )
            }

            val streamUrl = DownloadRepository.resetForRetry(id)
                ?: return@post call.respond(
                    HttpStatusCode.UnprocessableEntity,
                    "No stream URL stored for this download, please restart it from the watch page"
                )

            // Re-launch the background download job
            val downloadJob = call.application.launchDownload(id, streamUrl, download.filePath, resume = false)
            downloadJobs[id] = downloadJob
            downloadJob.start()

            call.respond(HttpStatusCode.Accepted, mapOf("id" to id))
        }

        // Serve the actual downloaded file
        get("/{id}/file") {
            val id = call.parameters["id"]?.toIntOrNull()
                ?: return@get call.respond(HttpStatusCode.BadRequest, "Invalid id")
            val download = DownloadRepository.getById(id)
                ?: return@get call.respond(HttpStatusCode.NotFound)

            val file = File(download.filePath)
            if (!file.exists()) {
                return@get call.respond(HttpStatusCode.NotFound, "File not found on disk")
            }

            call.response.header(
                HttpHeaders.ContentDisposition,
                ContentDisposition.Attachment.withParameter(
                    ContentDisposition.Parameters.FileName,
                    file.name
                ).toString()
            )
            call.respondFile(file)
        }
    }
}
