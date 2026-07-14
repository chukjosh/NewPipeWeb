package com.newpipeweb

import com.newpipeweb.database.DatabaseFactory
import com.newpipeweb.plugins.*
import io.github.cdimascio.dotenv.dotenv
import io.ktor.server.application.*
import io.ktor.server.engine.*
import io.ktor.server.netty.*
import org.schabi.newpipe.extractor.NewPipe

fun main() {
    // Load environment variables from a local .env file if one exists.
    // In Docker, environment variables are typically provided by Docker Compose,
    // so we ignore missing or malformed .env files.
    dotenv {
        ignoreIfMissing = true
        ignoreIfMalformed = true
    }

    // Initialize NewPipeExtractor with the custom HTTP downloader.
    // This must be done before using any extractor functionality.
    NewPipe.init(NewPipeDownloader.getInstance())

    // Initialize the SQLite database and create tables if necessary.
    DatabaseFactory.init()

    // Start the embedded Ktor server.
    embeddedServer(
        Netty,
        port = 8080,
        host = "0.0.0.0",
        module = Application::module
    ).start(wait = true)
}

// Configure the Ktor application.
fun Application.module() {
    configureSerialization()
    configureCORS()
    configureStatusPages()
    configureRouting()
}
