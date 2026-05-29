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
import java.io.File
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.launch
import io.ktor.utils.io.readAvailable



private val httpClient = HttpClient(CIO)

private fun isHlsManifest(url: String): Boolean =
    url.contains(".m3u8", ignoreCase = true) ||
    url.contains("application/vnd.apple.mpegurl", ignoreCase = true)

private fun guessExtension(streamUrl: String, format: String?, isAudioOnly: Boolean): String {
    val normalizedFormat = format?.lowercase() ?: ""
    return when {
        streamUrl.contains(".mp3", ignoreCase = true) || normalizedFormat.contains("mp3") -> "mp3"
        streamUrl.contains(".m4a", ignoreCase = true) || normalizedFormat.contains("m4a") -> "m4a"
        streamUrl.contains(".webm", ignoreCase = true) || normalizedFormat.contains("webm") -> "webm"
        streamUrl.contains(".ogg", ignoreCase = true) || normalizedFormat.contains("ogg") -> "ogg"
        normalizedFormat.contains("aac") -> "m4a"
        normalizedFormat.contains("mp4") || streamUrl.contains(".mp4", ignoreCase = true) -> "mp4"
        isAudioOnly -> "m4a"
        else -> "mp4"
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

            if (isHlsManifest(request.streamUrl)) {
                return@post call.respond(HttpStatusCode.BadRequest,
                    "Cannot download HLS/M3U8 manifest URLs directly. Please select a direct audio or video stream.")
            }

            val downloadsDir = resolveDownloadsDir()
            downloadsDir.mkdirs()

            val ext = guessExtension(request.streamUrl, request.format, request.isAudioOnly)
            val safeTitle = request.title.replace(Regex("[^a-zA-Z0-9._-]"), "_").take(100)
            val filePath = "${downloadsDir.absolutePath}/${safeTitle}_${request.videoId}.$ext"

            val downloadId = DownloadRepository.create(
                videoId = request.videoId,
                title = request.title,
                uploader = request.uploader,
                thumbnailUrl = request.thumbnailUrl,
                filePath = filePath,
                quality = request.quality,
                isAudioOnly = request.isAudioOnly
            )

            // Stream the download in the background
            call.application.launch(Dispatchers.IO) {
                try {
                    val response = httpClient.get(request.streamUrl) {
                        headers {
                            append(HttpHeaders.UserAgent, "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36")
                        }
                    }
                    val contentLength = response.contentLength() ?: -1L
                    val outputFile = File(filePath)
                    var downloadedBytes = 0L

                    response.bodyAsChannel().also { channel ->
                        outputFile.outputStream().use { outputStream ->
                            val buffer = ByteArray(8192)
                            while (!channel.isClosedForRead) {
                                val read = channel.readAvailable(buffer, 0, buffer.size)
                                if (read > 0) {
                                    outputStream.write(buffer, 0, read)
                                    downloadedBytes += read.toLong()
                                    DownloadRepository.updateProgress(
                                        downloadId, downloadedBytes, contentLength
                                    )
                                }
                            }
                        }
                    }

                    DownloadRepository.markCompleted(downloadId, downloadedBytes)
                } catch (e: Exception) {
                    println("Download failed for $downloadId: ${e.message}")
                    e.printStackTrace()
                    DownloadRepository.markFailed(downloadId)
                }
            }

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

        // Delete a download record (and optionally the file)
        delete("/{id}") {
            val id = call.parameters["id"]?.toIntOrNull()
                ?: return@delete call.respond(HttpStatusCode.BadRequest, "Invalid id")
            val download = DownloadRepository.getById(id)
            download?.let { File(it.filePath).delete() }
            DownloadRepository.delete(id)
            call.respond(HttpStatusCode.NoContent)
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
