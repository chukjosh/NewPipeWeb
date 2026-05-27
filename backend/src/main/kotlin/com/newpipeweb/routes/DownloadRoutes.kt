package com.newpipeweb.routes

import com.newpipeweb.database.repositories.DownloadRepository
import com.newpipeweb.models.StartDownloadRequest
import io.ktor.client.*
import io.ktor.client.engine.cio.*
import io.ktor.client.request.*
import io.ktor.client.statement.*
import io.ktor.http.*
import io.ktor.server.request.*
import io.ktor.server.response.*
import io.ktor.server.routing.*
import io.ktor.utils.io.*
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.launch
import java.io.File

private val httpClient = HttpClient(CIO)

fun Route.downloadRoutes() {
    route("/downloads") {

        // List all downloads
        get {
            call.respond(DownloadRepository.getAll())
        }

        // Start a new download
        post {
            val request = call.receive<StartDownloadRequest>()

            val downloadsDir = File(System.getenv("DOWNLOADS_DIR") ?: "./downloads")
            downloadsDir.mkdirs()

            val ext = if (request.isAudioOnly) "m4a" else "mp4"
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
                    val response = httpClient.get(request.streamUrl)
                    val contentLength = response.contentLength() ?: -1L
                    val outputFile = File(filePath)
                    var downloadedBytes = 0L

                    response.bodyAsChannel().also { channel ->
                        outputFile.outputStream().use { outputStream ->
                            val buffer = ByteArray(8192)
                            while (!channel.isClosedForRead) {
                                val read = channel.readAvailable(buffer)
                                if (read > 0) {
                                    outputStream.write(buffer, 0, read)
                                    downloadedBytes += read
                                    DownloadRepository.updateProgress(
                                        downloadId, downloadedBytes, contentLength
                                    )
                                }
                            }
                        }
                    }

                    DownloadRepository.markCompleted(downloadId, downloadedBytes)
                } catch (e: Exception) {
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
