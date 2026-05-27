/**
 * Routing.kt
 *
 * Registers all route handlers with the Ktor application.
 * Split into two groups:
 *   - Extraction routes: call NewPipeExtractor for live online content
 *   - Local routes: read/write the SQLite database for user data
 */

package com.newpipeweb.plugins

import com.newpipeweb.routes.*
import io.ktor.server.application.*
import io.ktor.server.routing.*

fun Application.configureRouting() {
    routing {
        // ── NewPipeExtractor routes (online content) ──────────
        servicesRoutes()     // GET /services — list supported platforms
        searchRoutes()       // GET /search?q=&service=
        streamRoutes()       // GET /stream?url= or /stream/{youtubeId}
        channelRoutes()      // GET /channel?url= or /channel/{youtubeId}
        trendingRoutes()     // GET /trending?service=
        commentRoutes()      // GET /comments?url= or /comments/{youtubeId}

        // ── Local database routes (user data) ─────────────────
        historyRoutes()      // GET/POST/DELETE /history
        watchlistRoutes()    // GET/POST/DELETE /watchlist
        playlistRoutes()     // GET/POST/DELETE /playlists
        subscriptionRoutes() // GET/POST/DELETE /subscriptions
        feedRoutes()         // GET /feed
        downloadRoutes()     // GET/POST/DELETE /downloads
    }
}
