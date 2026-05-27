package com.newpipeweb

import com.newpipeweb.database.DatabaseFactory
import com.newpipeweb.plugins.*
import io.ktor.server.application.*
import io.ktor.server.engine.*
import io.ktor.server.netty.*
import org.schabi.newpipe.extractor.NewPipe
import org.schabi.newpipe.extractor.downloader.Downloader

fun main() {
    // Initialize NewPipeExtractor with an HTTP downloader
    NewPipe.init(NewPipeDownloader.getInstance())

    // Initialize the SQLite database
    DatabaseFactory.init()

    embeddedServer(
        Netty,
        port = 8080,
        host = "0.0.0.0",
        module = Application::module
    ).start(wait = true)
}

fun Application.module() {
    configureSerialization()
    configureCORS()
    configureStatusPages()
    configureRouting()
}
