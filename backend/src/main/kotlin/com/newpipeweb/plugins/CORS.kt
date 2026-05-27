package com.newpipeweb.plugins

import io.ktor.http.*
import io.ktor.server.application.*
import io.ktor.server.plugins.cors.routing.*

fun Application.configureCORS() {
    install(CORS) {
        // Allow requests from the React frontend
        allowHost("localhost:5173")   // Vite dev server
        allowHost("localhost:3000")   // Alternative dev port
        allowHost("localhost:4173")   // Vite preview
        allowHost("localhost:80")     // Production frontend

        // Allow all headers and methods needed by the frontend
        allowHeader(HttpHeaders.ContentType)
        allowHeader(HttpHeaders.Authorization)
        allowMethod(HttpMethod.Get)
        allowMethod(HttpMethod.Post)
        allowMethod(HttpMethod.Delete)
        allowMethod(HttpMethod.Put)
        allowMethod(HttpMethod.Options)
    }
}
