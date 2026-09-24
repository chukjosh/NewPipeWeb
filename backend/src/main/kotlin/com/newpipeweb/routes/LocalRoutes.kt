package com.newpipeweb.routes

import com.newpipeweb.database.repositories.*
import com.newpipeweb.models.*
import com.newpipeweb.services.ExtractorService
import com.newpipeweb.services.SubscriptionImportParser
import io.ktor.http.*
import io.ktor.server.application.*
import io.ktor.server.request.*
import io.ktor.server.response.*
import io.ktor.server.routing.*

// ─────────────────────────────────────────────
// HISTORY
// ─────────────────────────────────────────────

fun Route.historyRoutes() {
    route("/history") {
        get {
            call.respond(HistoryRepository.getAll())
        }
        post {
            val request = call.receive<AddToHistoryRequest>()
            HistoryRepository.add(request)
            call.respond(HttpStatusCode.Created)
        }
        delete {
            HistoryRepository.clearAll()
            call.respond(HttpStatusCode.NoContent)
        }
        delete("/{id}") {
            val id = call.parameters["id"]?.toIntOrNull()
                ?: return@delete call.respond(HttpStatusCode.BadRequest, "Invalid id")
            HistoryRepository.deleteOne(id)
            call.respond(HttpStatusCode.NoContent)
        }
    }
}

// ─────────────────────────────────────────────
// WATCHLIST
// ─────────────────────────────────────────────

fun Route.watchlistRoutes() {
    route("/watchlist") {
        get {
            call.respond(WatchlistRepository.getAll())
        }
        post {
            val request = call.receive<AddToWatchlistRequest>()
            WatchlistRepository.add(request)
            call.respond(HttpStatusCode.Created)
        }
        delete("/{id}") {
            val id = call.parameters["id"]?.toIntOrNull()
                ?: return@delete call.respond(HttpStatusCode.BadRequest, "Invalid id")
            WatchlistRepository.remove(id)
            call.respond(HttpStatusCode.NoContent)
        }
    }
}

// ─────────────────────────────────────────────
// PLAYLISTS
// ─────────────────────────────────────────────

fun Route.playlistRoutes() {
    route("/playlists") {
        get {
            call.respond(PlaylistRepository.getAll())
        }
        post {
            val request = call.receive<CreatePlaylistRequest>()
            val id = PlaylistRepository.create(request)
            call.respond(HttpStatusCode.Created, mapOf("id" to id))
        }
        get("/{id}") {
            val id = call.parameters["id"]?.toIntOrNull()
                ?: return@get call.respond(HttpStatusCode.BadRequest, "Invalid id")
            val playlist = PlaylistRepository.getById(id)
                ?: return@get call.respond(HttpStatusCode.NotFound, "Playlist not found")
            call.respond(playlist)
        }
        delete("/{id}") {
            val id = call.parameters["id"]?.toIntOrNull()
                ?: return@delete call.respond(HttpStatusCode.BadRequest, "Invalid id")
            PlaylistRepository.delete(id)
            call.respond(HttpStatusCode.NoContent)
        }
        post("/{id}/videos") {
            val id = call.parameters["id"]?.toIntOrNull()
                ?: return@post call.respond(HttpStatusCode.BadRequest, "Invalid playlist id")
            val request = call.receive<AddToPlaylistRequest>()
            PlaylistRepository.addVideo(id, request)
            call.respond(HttpStatusCode.Created)
        }
        delete("/{id}/videos/{videoItemId}") {
            val id = call.parameters["id"]?.toIntOrNull()
                ?: return@delete call.respond(HttpStatusCode.BadRequest, "Invalid playlist id")
            val videoItemId = call.parameters["videoItemId"]?.toIntOrNull()
                ?: return@delete call.respond(HttpStatusCode.BadRequest, "Invalid video item id")
            PlaylistRepository.removeVideo(id, videoItemId)
            call.respond(HttpStatusCode.NoContent)
        }
    }
}

// ─────────────────────────────────────────────
// SUBSCRIPTIONS
// ─────────────────────────────────────────────

fun Route.subscriptionRoutes() {
    route("/subscriptions") {
        get {
            call.respond(SubscriptionRepository.getAll())
        }

        get("/export") {
            val format = call.request.queryParameters["format"]?.trim()?.lowercase() ?: "json"
            when (format) {
                "json" -> call.respond(SubscriptionRepository.getAll())
                "txt", "text" -> call.respondText(
                    SubscriptionRepository.exportText(),
                    ContentType.Text.Plain
                )
                else -> call.respond(HttpStatusCode.BadRequest, "Unsupported export format: $format")
            }
        }

        post {
            val request = call.receive<SubscribeRequest>()
            val created = SubscriptionRepository.subscribe(request)
            call.respond(if (created) HttpStatusCode.Created else HttpStatusCode.OK)
        }

        post("/import") {
            val raw = call.receiveText()
            val requestedFormat = call.request.queryParameters["format"]?.trim()?.lowercase()
            val format = requestedFormat ?: detectImportFormat(raw, call.request.header(HttpHeaders.ContentType))

            val requests = try {
                when (format) {
                    "json" -> SubscriptionImportParser.parse(raw, "json")
                    "txt", "text" -> SubscriptionImportParser.parse(raw, "txt")
                        .mapNotNull { request ->
                            val url = request.channelUrl.trim()
                            try {
                                val channel = ExtractorService.getChannel(url)
                                SubscribeRequest(
                                    channelId = channel.id,
                                    channelName = channel.name,
                                    channelUrl = channel.url,
                                    avatarUrl = channel.avatarUrl,
                                    service = channel.service
                                )
                            } catch (_: Exception) {
                                null
                            }
                        }
                    else -> return@post call.respond(HttpStatusCode.BadRequest, "Unsupported import format: $format")
                }
            } catch (e: Exception) {
                return@post call.respond(HttpStatusCode.BadRequest, "Invalid import payload: ${e.message}")
            }

            val summary = SubscriptionRepository.import(requests)
            call.respond(summary)
        }

        delete("/{id}") {
            val id = call.parameters["id"]?.toIntOrNull()
                ?: return@delete call.respond(HttpStatusCode.BadRequest, "Invalid id")
            SubscriptionRepository.unsubscribe(id)
            call.respond(HttpStatusCode.NoContent)
        }
    }
}

private fun detectImportFormat(rawBody: String, contentType: String?): String? {
    val normalizedContentType = contentType?.lowercase() ?: ""
    if (normalizedContentType.contains("json")) return "json"
    if (normalizedContentType.contains("text/plain") || normalizedContentType.contains("text")) return "txt"
    if (rawBody.trimStart().startsWith("[")) return "json"
    return "txt"
}

// ─────────────────────────────────────────────
// FEED (latest videos from subscribed channels)
// ─────────────────────────────────────────────

fun Route.feedRoutes() {
    get("/feed") {
        val subscriptions = SubscriptionRepository.getAll()
        if (subscriptions.isEmpty()) {
            call.respond(emptyList<Any>())
            return@get
        }

        // Fetch latest videos from each subscribed channel (in parallel via coroutines)
        val feedVideos = subscriptions
            .flatMap { subscription ->
                try {
                    val channel = com.newpipeweb.services.ExtractorService.getChannel(subscription.channelUrl)
                    channel.videos.take(5) // latest 5 per channel
                } catch (e: Exception) {
                    emptyList()
                }
            }
            .sortedByDescending { it.uploadDate }

        call.respond(feedVideos)
    }
}
