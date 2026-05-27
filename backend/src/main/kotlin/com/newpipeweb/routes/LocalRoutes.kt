package com.newpipeweb.routes

import com.newpipeweb.database.repositories.*
import com.newpipeweb.models.*
import io.ktor.http.*
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
        post {
            val request = call.receive<SubscribeRequest>()
            SubscriptionRepository.subscribe(request)
            call.respond(HttpStatusCode.Created)
        }
        delete("/{id}") {
            val id = call.parameters["id"]?.toIntOrNull()
                ?: return@delete call.respond(HttpStatusCode.BadRequest, "Invalid id")
            SubscriptionRepository.unsubscribe(id)
            call.respond(HttpStatusCode.NoContent)
        }
    }
}

// ─────────────────────────────────────────────
// FEED (latest videos from subscribed channels)
// ─────────────────────────────────────────────

fun Route.feedRoutes() {
    get("/feed") {
        val channelIds = SubscriptionRepository.getAllChannelIds()
        if (channelIds.isEmpty()) {
            call.respond(emptyList<Any>())
            return@get
        }

        // Fetch latest videos from each subscribed channel (in parallel via coroutines)
        val feedVideos = channelIds
            .flatMap { channelId ->
                try {
                    val channel = com.newpipeweb.services.YouTubeService.getChannel(channelId)
                    channel.videos.take(5) // latest 5 per channel
                } catch (e: Exception) {
                    emptyList()
                }
            }
            .sortedByDescending { it.uploadDate }

        call.respond(feedVideos)
    }
}
