package com.newpipeweb.routes

import io.ktor.client.*
import io.ktor.client.engine.cio.*
import io.ktor.client.request.*
import io.ktor.client.statement.*
import io.ktor.http.*
import io.ktor.http.content.*
import io.ktor.server.application.*
import io.ktor.server.response.*
import io.ktor.server.routing.*
import io.ktor.utils.io.*
import java.net.InetAddress
import java.net.URI

private val proxyClient = HttpClient(CIO) {
    expectSuccess = false
}

private const val PROXY_USER_AGENT =
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 " +
        "(KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"

/**
 * Proxies media stream URLs through the backend so the browser can play
 * SoundCloud, PeerTube, media.ccc.de, etc. without CDN CORS blocks.
 *
 * GET /proxy?url=https://...
 * Supports Range requests for seeking in the HTML5 player.
 */
fun Route.streamProxyRoutes() {
    get("/proxy") {
        val rawUrl = call.parameters["url"]?.trim()?.takeIf { it.isNotBlank() }
            ?: return@get call.respond(HttpStatusCode.BadRequest, "Missing 'url' parameter")

        if (!isAllowedProxyUrl(rawUrl)) {
            return@get call.respond(HttpStatusCode.Forbidden, "URL not allowed")
        }

        val rangeHeader = call.request.headers[HttpHeaders.Range]

        proxyClient.prepareGet(rawUrl) {
            headers {
                append(HttpHeaders.UserAgent, PROXY_USER_AGENT)
                rangeHeader?.let { append(HttpHeaders.Range, it) }
            }
        }.execute { upstream ->
            val contentType = upstream.headers[HttpHeaders.ContentType]
                ?.let { ContentType.parse(it) }
                ?: ContentType.Application.OctetStream

            // Forward headers critical for HTML5 <video> playback.
            // Without Accept-Ranges and Content-Range the browser cannot
            // determine duration, seek, or sometimes even start playing.
            val upstreamAcceptRanges = upstream.headers[HttpHeaders.AcceptRanges]
            val upstreamContentRange = upstream.headers[HttpHeaders.ContentRange]

            call.respond(object : OutgoingContent.WriteChannelContent() {
                override val status: HttpStatusCode? = HttpStatusCode.fromValue(upstream.status.value)
                override val contentType: ContentType = contentType
                override val contentLength: Long? = upstream.contentLength()

                override val headers: Headers = Headers.build {
                    // Tell the browser the upstream supports byte-range requests
                    if (upstreamAcceptRanges != null) {
                        append(HttpHeaders.AcceptRanges, upstreamAcceptRanges)
                    } else {
                        // Most media CDNs support ranges; advertise it even if
                        // the upstream omitted the header on a full 200 response.
                        append(HttpHeaders.AcceptRanges, "bytes")
                    }
                    // Forward the Content-Range for 206 Partial Content responses
                    if (upstreamContentRange != null) {
                        append(HttpHeaders.ContentRange, upstreamContentRange)
                    }
                }

                override suspend fun writeTo(channel: ByteWriteChannel) {
                    val body = upstream.bodyAsChannel()
                    val buffer = ByteArray(8192)
                    while (!body.isClosedForRead) {
                        val read = body.readAvailable(buffer, 0, buffer.size)
                        if (read <= 0) break
                        channel.writeFully(buffer, 0, read)
                        channel.flush()
                    }
                }
            })
        }
    }
}

/** Only proxy public http(s) URLs; block obvious SSRF targets. */
private fun isAllowedProxyUrl(url: String): Boolean {
    return try {
        val uri = URI(url)
        val scheme = uri.scheme?.lowercase()
        if (scheme != "http" && scheme != "https") return false

        val host = uri.host?.lowercase() ?: return false
        if (host == "localhost" || host.endsWith(".localhost")) return false

        val address = InetAddress.getByName(host)
        if (address.isAnyLocalAddress || address.isLoopbackAddress || address.isLinkLocalAddress) {
            return false
        }
        if (address.isSiteLocalAddress) return false

        true
    } catch (_: Exception) {
        false
    }
}
