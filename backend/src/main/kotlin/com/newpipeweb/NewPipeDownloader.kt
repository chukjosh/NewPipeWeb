package com.newpipeweb

import org.schabi.newpipe.extractor.downloader.Downloader
import org.schabi.newpipe.extractor.downloader.Request
import org.schabi.newpipe.extractor.downloader.Response
import java.net.HttpURLConnection
import java.net.URL

/**
 * NewPipeExtractor requires a Downloader implementation to make HTTP requests.
 * This is a simple implementation using Java's HttpURLConnection.
 */
class NewPipeDownloader private constructor() : Downloader() {

    companion object {
        private var instance: NewPipeDownloader? = null

        fun getInstance(): NewPipeDownloader {
            if (instance == null) {
                instance = NewPipeDownloader()
            }
            return instance!!
        }
    }

    override fun execute(request: Request): Response {
        val url = URL(request.url())
        val connection = url.openConnection() as HttpURLConnection

        // Set request headers from NewPipeExtractor
        request.headers().forEach { (key, values) ->
            values.forEach { value ->
                connection.setRequestProperty(key, value)
            }
        }

        // Set a realistic User-Agent to avoid blocks
        connection.setRequestProperty(
            "User-Agent",
            "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 " +
            "(KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
        )

        connection.requestMethod = request.httpMethod()
        connection.connectTimeout = 30_000
        connection.readTimeout = 30_000
        connection.doInput = true

        // Handle POST body if present
        if (request.dataToSend() != null) {
            connection.doOutput = true
            connection.outputStream.write(request.dataToSend())
        }

        val responseCode = connection.responseCode
        val responseBody = try {
            connection.inputStream.bufferedReader().readText()
        } catch (e: Exception) {
            connection.errorStream?.bufferedReader()?.readText() ?: ""
        }

        val responseHeaders = mutableMapOf<String, MutableList<String>>()
        connection.headerFields.forEach { (key, values) ->
            if (key != null) responseHeaders[key] = values.toMutableList()
        }

        return Response(
            responseCode,
            connection.responseMessage,
            responseHeaders,
            responseBody,
            request.url()
        )
    }
}
