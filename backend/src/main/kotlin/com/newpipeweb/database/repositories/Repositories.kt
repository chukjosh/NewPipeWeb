package com.newpipeweb.database.repositories

import com.newpipeweb.database.tables.*
import com.newpipeweb.models.*
import org.jetbrains.exposed.sql.*
import org.jetbrains.exposed.sql.SqlExpressionBuilder.eq
import org.jetbrains.exposed.sql.transactions.transaction
import java.time.LocalDateTime
import java.time.format.DateTimeFormatter

private val formatter = DateTimeFormatter.ISO_LOCAL_DATE_TIME

// ─────────────────────────────────────────────
// HISTORY REPOSITORY
// ─────────────────────────────────────────────

object HistoryRepository {

    fun getAll(): List<HistoryModel> = transaction {
        HistoryTable.selectAll()
            .orderBy(HistoryTable.watchedAt, SortOrder.DESC)
            .map { row ->
                HistoryModel(
                    id = row[HistoryTable.id],
                    videoId = row[HistoryTable.videoId],
                    title = row[HistoryTable.title],
                    uploader = row[HistoryTable.uploader],
                    thumbnailUrl = row[HistoryTable.thumbnailUrl],
                    duration = row[HistoryTable.duration],
                    watchedAt = row[HistoryTable.watchedAt].format(formatter),
                    watchedSeconds = row[HistoryTable.watchedSeconds]
                )
            }
    }

    fun add(request: AddToHistoryRequest) = transaction {
        // Remove old entry for same video if exists (update to latest watch)
        HistoryTable.deleteWhere { videoId eq request.videoId }
        HistoryTable.insert {
            it[videoId] = request.videoId
            it[title] = request.title
            it[uploader] = request.uploader
            it[thumbnailUrl] = request.thumbnailUrl
            it[duration] = request.duration
            it[watchedAt] = LocalDateTime.now()
            it[watchedSeconds] = request.watchedSeconds
        }
    }

    fun deleteOne(id: Int) = transaction {
        HistoryTable.deleteWhere { HistoryTable.id eq id }
    }

    fun clearAll() = transaction {
        HistoryTable.deleteAll()
    }
}

// ─────────────────────────────────────────────
// WATCHLIST REPOSITORY
// ─────────────────────────────────────────────

object WatchlistRepository {

    fun getAll(): List<WatchlistModel> = transaction {
        WatchlistTable.selectAll()
            .orderBy(WatchlistTable.addedAt, SortOrder.DESC)
            .map { row ->
                WatchlistModel(
                    id = row[WatchlistTable.id],
                    videoId = row[WatchlistTable.videoId],
                    title = row[WatchlistTable.title],
                    uploader = row[WatchlistTable.uploader],
                    thumbnailUrl = row[WatchlistTable.thumbnailUrl],
                    duration = row[WatchlistTable.duration],
                    addedAt = row[WatchlistTable.addedAt].format(formatter)
                )
            }
    }

    fun add(request: AddToWatchlistRequest) = transaction {
        WatchlistTable.insertIgnore {
            it[videoId] = request.videoId
            it[title] = request.title
            it[uploader] = request.uploader
            it[thumbnailUrl] = request.thumbnailUrl
            it[duration] = request.duration
            it[addedAt] = LocalDateTime.now()
        }
    }

    fun remove(id: Int) = transaction {
        WatchlistTable.deleteWhere { WatchlistTable.id eq id }
    }
}

// ─────────────────────────────────────────────
// PLAYLIST REPOSITORY
// ─────────────────────────────────────────────

object PlaylistRepository {

    fun getAll(): List<PlaylistModel> = transaction {
        PlaylistsTable.selectAll()
            .orderBy(PlaylistsTable.createdAt, SortOrder.DESC)
            .map { row ->
                val videoCount = PlaylistItemsTable
                    .select(PlaylistItemsTable.id)
                    .where { PlaylistItemsTable.playlistId eq row[PlaylistsTable.id] }
                    .count().toInt()

                val thumbnail = PlaylistItemsTable
                    .selectAll()
                    .where { PlaylistItemsTable.playlistId eq row[PlaylistsTable.id] }
                    .orderBy(PlaylistItemsTable.position)
                    .firstOrNull()
                    ?.get(PlaylistItemsTable.thumbnailUrl)

                PlaylistModel(
                    id = row[PlaylistsTable.id],
                    name = row[PlaylistsTable.name],
                    description = row[PlaylistsTable.description],
                    createdAt = row[PlaylistsTable.createdAt].format(formatter),
                    videoCount = videoCount,
                    thumbnailUrl = thumbnail
                )
            }
    }

    fun getById(id: Int): PlaylistWithVideos? = transaction {
        val playlist = PlaylistsTable.selectAll()
            .where { PlaylistsTable.id eq id }
            .firstOrNull() ?: return@transaction null

        val videos = PlaylistItemsTable.selectAll()
            .where { PlaylistItemsTable.playlistId eq id }
            .orderBy(PlaylistItemsTable.position)
            .map { row ->
                PlaylistVideoModel(
                    id = row[PlaylistItemsTable.id],
                    videoId = row[PlaylistItemsTable.videoId],
                    title = row[PlaylistItemsTable.title],
                    uploader = row[PlaylistItemsTable.uploader],
                    thumbnailUrl = row[PlaylistItemsTable.thumbnailUrl],
                    duration = row[PlaylistItemsTable.duration],
                    addedAt = row[PlaylistItemsTable.addedAt].format(formatter),
                    position = row[PlaylistItemsTable.position]
                )
            }

        PlaylistWithVideos(
            id = playlist[PlaylistsTable.id],
            name = playlist[PlaylistsTable.name],
            description = playlist[PlaylistsTable.description],
            createdAt = playlist[PlaylistsTable.createdAt].format(formatter),
            videos = videos
        )
    }

    fun create(request: CreatePlaylistRequest): Int = transaction {
        PlaylistsTable.insertAndGetId {
            it[name] = request.name
            it[description] = request.description
            it[createdAt] = LocalDateTime.now()
        }.value
    }

    fun delete(id: Int) = transaction {
        PlaylistItemsTable.deleteWhere { playlistId eq id }
        PlaylistsTable.deleteWhere { PlaylistsTable.id eq id }
    }

    fun addVideo(playlistId: Int, request: AddToPlaylistRequest) = transaction {
        val position = PlaylistItemsTable
            .select(PlaylistItemsTable.id)
            .where { PlaylistItemsTable.playlistId eq playlistId }
            .count().toInt()

        PlaylistItemsTable.insert {
            it[PlaylistItemsTable.playlistId] = playlistId
            it[videoId] = request.videoId
            it[title] = request.title
            it[uploader] = request.uploader
            it[thumbnailUrl] = request.thumbnailUrl
            it[duration] = request.duration
            it[addedAt] = LocalDateTime.now()
            it[PlaylistItemsTable.position] = position
        }
    }

    fun removeVideo(playlistId: Int, videoItemId: Int) = transaction {
        PlaylistItemsTable.deleteWhere {
            (PlaylistItemsTable.playlistId eq playlistId) and
            (PlaylistItemsTable.id eq videoItemId)
        }
    }
}

// ─────────────────────────────────────────────
// SUBSCRIPTION REPOSITORY
// ─────────────────────────────────────────────

object SubscriptionRepository {

    fun getAll(): List<SubscriptionModel> = transaction {
        SubscriptionsTable.selectAll()
            .orderBy(SubscriptionsTable.channelName)
            .map { row ->
                SubscriptionModel(
                    id = row[SubscriptionsTable.id],
                    channelId = row[SubscriptionsTable.channelId],
                    channelName = row[SubscriptionsTable.channelName],
                    channelUrl = row[SubscriptionsTable.channelUrl],
                    avatarUrl = row[SubscriptionsTable.avatarUrl],
                    subscribedAt = row[SubscriptionsTable.subscribedAt].format(formatter)
                )
            }
    }

    fun subscribe(request: SubscribeRequest) = transaction {
        SubscriptionsTable.insertIgnore {
            it[channelId] = request.channelId
            it[channelName] = request.channelName
            it[channelUrl] = request.channelUrl
            it[avatarUrl] = request.avatarUrl
            it[subscribedAt] = LocalDateTime.now()
        }
    }

    fun unsubscribe(id: Int) = transaction {
        SubscriptionsTable.deleteWhere { SubscriptionsTable.id eq id }
    }

    fun getAllChannelIds(): List<String> = transaction {
        SubscriptionsTable
            .select(SubscriptionsTable.channelId)
            .map { it[SubscriptionsTable.channelId] }
    }
}

// ─────────────────────────────────────────────
// DOWNLOAD REPOSITORY
// ─────────────────────────────────────────────

object DownloadRepository {

    fun getAll(): List<DownloadModel> = transaction {
        DownloadsTable.selectAll()
            .orderBy(DownloadsTable.createdAt, SortOrder.DESC)
            .map { it.toDownloadModel() }
    }

    fun getById(id: Int): DownloadModel? = transaction {
        DownloadsTable.selectAll()
            .where { DownloadsTable.id eq id }
            .firstOrNull()
            ?.toDownloadModel()
    }

    fun create(
        videoId: String, title: String, uploader: String,
        thumbnailUrl: String, filePath: String,
        quality: String, isAudioOnly: Boolean
    ): Int = transaction {
        DownloadsTable.insertAndGetId {
            it[DownloadsTable.videoId] = videoId
            it[DownloadsTable.title] = title
            it[DownloadsTable.uploader] = uploader
            it[DownloadsTable.thumbnailUrl] = thumbnailUrl
            it[DownloadsTable.filePath] = filePath
            it[DownloadsTable.quality] = quality
            it[DownloadsTable.isAudioOnly] = isAudioOnly
            it[status] = "PENDING"
            it[createdAt] = LocalDateTime.now()
        }.value
    }

    fun updateProgress(id: Int, downloadedBytes: Long, fileSize: Long) = transaction {
        DownloadsTable.update({ DownloadsTable.id eq id }) {
            it[DownloadsTable.downloadedBytes] = downloadedBytes
            it[DownloadsTable.fileSize] = fileSize
            it[status] = "DOWNLOADING"
        }
    }

    fun markCompleted(id: Int, fileSize: Long) = transaction {
        DownloadsTable.update({ DownloadsTable.id eq id }) {
            it[DownloadsTable.fileSize] = fileSize
            it[downloadedBytes] = fileSize
            it[status] = "COMPLETED"
        }
    }

    fun markFailed(id: Int) = transaction {
        DownloadsTable.update({ DownloadsTable.id eq id }) {
            it[status] = "FAILED"
        }
    }

    fun delete(id: Int) = transaction {
        DownloadsTable.deleteWhere { DownloadsTable.id eq id }
    }

    private fun ResultRow.toDownloadModel() = DownloadModel(
        id = this[DownloadsTable.id],
        videoId = this[DownloadsTable.videoId],
        title = this[DownloadsTable.title],
        uploader = this[DownloadsTable.uploader],
        thumbnailUrl = this[DownloadsTable.thumbnailUrl],
        filePath = this[DownloadsTable.filePath],
        fileSize = this[DownloadsTable.fileSize],
        downloadedBytes = this[DownloadsTable.downloadedBytes],
        status = this[DownloadsTable.status],
        quality = this[DownloadsTable.quality],
        isAudioOnly = this[DownloadsTable.isAudioOnly],
        createdAt = this[DownloadsTable.createdAt].format(formatter)
    )
}
