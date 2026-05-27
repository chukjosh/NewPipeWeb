package com.newpipeweb.routes

import com.newpipeweb.util.Paths.resolveDataDir
import com.newpipeweb.util.Paths.resolveDownloadsDir
import com.newpipeweb.util.StorageSettingsRepository
import io.ktor.http.*
import io.ktor.server.application.*
import io.ktor.server.request.*
import io.ktor.server.response.*
import io.ktor.server.routing.*
import kotlinx.serialization.Serializable
import kotlinx.serialization.json.Json

/**
 * Storage settings API – allows clients to query and update custom storage directories.
 *
 * GET  /settings/storage   -> { downloadsDir: String, dataDir: String }
 * POST /settings/storage   -> { downloadsDir?: String, dataDir?: String }
 */
fun Route.storageSettingsRoutes() {
    route("/settings/storage") {
        get {
            // Resolve current effective paths
            val current = mapOf(
                "downloadsDir" to resolveDownloadsDir().absolutePath,
                "dataDir" to resolveDataDir().absolutePath
            )
            call.respond(current)
        }
        post {
            // Accept a JSON body with optional overrides
            @Serializable
            data class SettingsPayload(val downloadsDir: String? = null, val dataDir: String? = null)
            val payload = call.receive<SettingsPayload>()
            // Load existing settings (if any)
            val existing = StorageSettingsRepository.load()
            val newSettings = com.newpipeweb.util.StorageSettings(
                downloadsDir = payload.downloadsDir ?: existing?.downloadsDir,
                dataDir = payload.dataDir ?: existing?.dataDir
            )
            // Persist the new settings
            StorageSettingsRepository.save(newSettings)
            call.respond(HttpStatusCode.OK, mapOf("status" to "saved"))
        }
    }
}
