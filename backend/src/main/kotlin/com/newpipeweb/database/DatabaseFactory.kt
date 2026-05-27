package com.newpipeweb.database

import com.newpipeweb.database.tables.*
import org.jetbrains.exposed.sql.Database
import org.jetbrains.exposed.sql.SchemaUtils
import org.jetbrains.exposed.sql.transactions.transaction
import java.io.File

object DatabaseFactory {

    fun init() {
        // Store the database file in /app/data (Docker volume) or ./data (local)
        val dataDir = File(System.getenv("DATA_DIR") ?: "./data")
        dataDir.mkdirs()

        val dbPath = "${dataDir.absolutePath}/newpipe.db"

        Database.connect(
            url = "jdbc:sqlite:$dbPath",
            driver = "org.sqlite.JDBC"
        )

        // Create all tables if they don't exist
        transaction {
            SchemaUtils.createMissingTablesAndColumns(
                HistoryTable,
                WatchlistTable,
                PlaylistsTable,
                PlaylistItemsTable,
                SubscriptionsTable,
                DownloadsTable
            )
        }
    }
}
