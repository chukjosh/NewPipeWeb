/**
 * ExtractorService.kt
 *
 * Central service that wraps NewPipeExtractor for ALL supported services:
 * - YouTube
 * - SoundCloud
 * - PeerTube
 * - Bandcamp
 * - media.ccc.de
 * - Odysee (LBRY)
 *
 * Instead of hardcoding YouTube, every function accepts either:
 *   - A `serviceId` int (0=YouTube, 1=SoundCloud, etc.)
 *   - A full URL (service is auto-detected from the URL)
 *
 * NewPipeExtractor service IDs:
 *   0 = YouTube       https://youtube.com
 *   1 = SoundCloud    https://soundcloud.com
 *   2 = media.ccc.de  https://media.ccc.de
 *   3 = PeerTube      https://peertube.tv (and any instance)
 *   4 = Bandcamp      https://bandcamp.com
 *   5 = Odysee        https://odysee.com
 */

package com.newpipeweb.services

import com.newpipeweb.models.*
import org.schabi.newpipe.extractor.NewPipe
import org.schabi.newpipe.extractor.StreamingService
import org.schabi.newpipe.extractor.channel.ChannelInfo
import org.schabi.newpipe.extractor.comments.CommentsInfo
import org.schabi.newpipe.extractor.kiosk.KioskInfo
import org.schabi.newpipe.extractor.search.SearchInfo
import org.schabi.newpipe.extractor.stream.StreamInfo
import org.schabi.newpipe.extractor.stream.StreamInfoItem
import org.schabi.newpipe.extractor.stream.StreamType
import org.schabi.newpipe.extractor.channel.tabs.ChannelTabs
import org.schabi.newpipe.extractor.channel.tabs.ChannelTabInfo
import org.schabi.newpipe.extractor.ServiceList

object ExtractorService {

    // ─────────────────────────────────────────────────────────
    // Service registry — maps string names to NewPipe services
    // ─────────────────────────────────────────────────────────

    /**
     * All supported services by their string identifier.
     * Used to map the `service` query parameter to the actual service object.
     */
    val SUPPORTED_SERVICES: Map<String, ServiceInfo> = mapOf(
        "youtube"    to ServiceInfo(0, "YouTube",      "https://youtube.com",      supportsTrending = true,  supportsComments = true),
        "soundcloud" to ServiceInfo(1, "SoundCloud",   "https://soundcloud.com",   supportsTrending = true,  supportsComments = false),
        "mediaccc"   to ServiceInfo(2, "media.ccc.de", "https://media.ccc.de",     supportsTrending = true,  supportsComments = false),
        "peertube"   to ServiceInfo(3, "PeerTube",     "https://peertube.tv",      supportsTrending = true,  supportsComments = false),
        "bandcamp"   to ServiceInfo(4, "Bandcamp",     "https://bandcamp.com",     supportsTrending = false, supportsComments = false),
        "odysee"     to ServiceInfo(5, "Odysee",       "https://odysee.com",       supportsTrending = false, supportsComments = false),
    )

    /**
     * Metadata about a supported service — returned to the frontend
     * so it can show the correct service selector options.
     */
    data class ServiceInfo(
        val id: Int,
        val name: String,
        val baseUrl: String,
        val supportsTrending: Boolean,
        val supportsComments: Boolean
    )

    /**
     * Resolve a service name string to the NewPipeExtractor StreamingService.
     * Defaults to YouTube if the name is unrecognised.
     */
    private fun resolveService(serviceName: String): StreamingService {
        val info = SUPPORTED_SERVICES[serviceName.lowercase()]
            ?: SUPPORTED_SERVICES["youtube"]!!
        return NewPipe.getService(info.id)
    }

    /**
     * Auto-detect the service from a full URL.
     * NewPipeExtractor can identify which service owns any given URL.
     * Falls back to YouTube on failure.
     */
    private fun serviceFromUrl(url: String): StreamingService {
        return try {
            NewPipe.getServiceByUrl(url)
        } catch (e: Exception) {
            NewPipe.getService(0) // YouTube fallback
        }
    }

    /**
     * Extract a clean ID from any URL for use as a local key.
     * For YouTube this is the video ID; for other services it's the full URL.
     */
    fun extractId(url: String?): String {
        if (url == null) return ""
        // YouTube: extract ?v=ID
        val ytRegex = Regex("[?&]v=([^&]+)")
        val ytMatch = ytRegex.find(url)
        if (ytMatch != null) return ytMatch.groupValues[1]
        // For all other services, use the full URL as the ID
        return url
    }

    // ─────────────────────────────────────────────────────────
    // SEARCH
    // ─────────────────────────────────────────────────────────

    /**
     * Search for content on the specified service.
     *
     * @param query      Search terms
     * @param serviceName Service to search (e.g. "youtube", "soundcloud")
     */
    fun search(query: String, serviceName: String = "youtube"): SearchModel {
        val service = resolveService(serviceName)

        val searchInfo = SearchInfo.getInfo(
            service,
            service.searchQHFactory.fromQuery(query)
        )

        val items = searchInfo.relatedItems
            .filterNotNull()
            .mapNotNull { item ->
                if (item !is StreamInfoItem) return@mapNotNull null
                try {
                    VideoModel(
                        id           = extractId(item.url),
                        title        = item.name ?: "Unknown",
                        uploader     = item.uploaderName ?: "Unknown",
                        uploaderUrl  = item.uploaderUrl ?: "",
                        duration     = item.duration,
                        viewCount    = item.viewCount,
                        uploadDate   = item.textualUploadDate ?: "",
                        thumbnailUrl = item.thumbnails.firstOrNull()?.url ?: "",
                        isLive       = item.streamType == StreamType.LIVE_STREAM || item.streamType == StreamType.AUDIO_LIVE_STREAM,
                        url          = item.url ?: "",
                        service      = serviceName
                    )
                } catch (e: Exception) {
                    null
                }
            }

        return SearchModel(
            query    = query,
            service  = serviceName,
            items    = items,
            nextPage = searchInfo.nextPage?.url
        )
    }

    // ─────────────────────────────────────────────────────────
    // STREAM (by full URL — works for any service)
    // ─────────────────────────────────────────────────────────

    /**
     * Fetch stream URLs and metadata for any content URL.
     * The service is auto-detected from the URL.
     *
     * @param url Full content URL (e.g. YouTube watch URL, SoundCloud track URL)
     */
    fun getStreams(url: String): StreamModel {
        val service   = serviceFromUrl(url)
        val streamInfo = StreamInfo.getInfo(service, url)

        // Combine regular + video-only streams
        val videoStreams = streamInfo.videoStreams.map { s ->
            StreamUrl(url = s.content, quality = s.resolution, format = s.format?.name ?: "UNKNOWN", isVideoOnly = false)
        } + streamInfo.videoOnlyStreams.map { s ->
            StreamUrl(url = s.content, quality = s.resolution, format = s.format?.name ?: "UNKNOWN", isVideoOnly = true)
        }

        val audioStreams = streamInfo.audioStreams.map { s ->
            StreamUrl(url = s.content, quality = "${s.averageBitrate}kbps", format = s.format?.name ?: "UNKNOWN", isVideoOnly = false)
        }

        val subtitles = streamInfo.subtitles.map { sub ->
            SubtitleTrack(
                url              = sub.content,
                languageCode     = sub.languageTag ?: "unknown",
                languageName     = sub.displayLanguageName ?: sub.languageTag ?: "Unknown",
                isAutoGenerated  = sub.isAutoGenerated
            )
        }

        val related = streamInfo.relatedItems
            .filterNotNull()
            .take(20)
            .mapNotNull { item ->
                if (item !is StreamInfoItem) return@mapNotNull null
                try {
                    VideoModel(
                        id           = extractId(item.url),
                        title        = item.name ?: "Unknown",
                        uploader     = item.uploaderName ?: "Unknown",
                        uploaderUrl  = item.uploaderUrl ?: "",
                        duration     = item.duration,
                        viewCount    = item.viewCount,
                        uploadDate   = item.textualUploadDate ?: "",
                        thumbnailUrl = item.thumbnails.firstOrNull()?.url ?: "",
                        isLive       = item.streamType == StreamType.LIVE_STREAM || item.streamType == StreamType.AUDIO_LIVE_STREAM,
                        url          = item.url ?: "",
                        service      = service.serviceInfo.name.lowercase()
                    )
                } catch (e: Exception) {
                    null
                }
            }

        return StreamModel(
            id           = extractId(url),
            title        = streamInfo.name,
            uploader     = streamInfo.uploaderName,
            uploaderUrl  = streamInfo.uploaderUrl ?: "",
            duration     = streamInfo.duration,
            videoStreams  = videoStreams,
            audioStreams  = audioStreams,
            hlsUrl        = streamInfo.hlsUrl,
            subtitles     = subtitles,
            relatedVideos = related,
            service       = service.serviceInfo.name.lowercase()
        )
    }

    // ─────────────────────────────────────────────────────────
    // CHANNEL (by full URL)
    // ─────────────────────────────────────────────────────────

    /**
     * Fetch channel/artist info and their latest content.
     *
     * @param url Full channel URL (YouTube channel, SoundCloud artist, etc.)
     */
    fun getChannel(url: String): ChannelModel {
        val service     = serviceFromUrl(url)
        val channelInfo = ChannelInfo.getInfo(service, url)

        val videosTab = channelInfo.tabs.firstOrNull { 
            it.id == ChannelTabs.VIDEOS || it.id == ChannelTabs.TRACKS 
        } ?: channelInfo.tabs.firstOrNull()

        val rawVideos = if (videosTab != null) {
            try {
                ChannelTabInfo.getInfo(service, videosTab).relatedItems
            } catch (e: Exception) {
                emptyList()
            }
        } else {
            emptyList()
        }

        val videos = rawVideos
            .filterNotNull()
            .take(30)
            .mapNotNull { item ->
                if (item !is StreamInfoItem) return@mapNotNull null
                try {
                    VideoModel(
                        id           = extractId(item.url),
                        title        = item.name ?: "Unknown",
                        uploader     = channelInfo.name,
                        uploaderUrl  = channelInfo.url,
                        duration     = item.duration,
                        viewCount    = item.viewCount,
                        uploadDate   = item.textualUploadDate ?: "",
                        thumbnailUrl = item.thumbnails.firstOrNull()?.url ?: "",
                        isLive       = item.streamType == StreamType.LIVE_STREAM || item.streamType == StreamType.AUDIO_LIVE_STREAM,
                        url          = item.url ?: "",
                        service      = service.serviceInfo.name.lowercase()
                    )
                } catch (e: Exception) {
                    null
                }
            }

        return ChannelModel(
            id              = extractId(url),
            name            = channelInfo.name,
            url             = channelInfo.url,
            description     = channelInfo.description ?: "",
            subscriberCount = channelInfo.subscriberCount,
            avatarUrl       = channelInfo.avatars.firstOrNull()?.url ?: "",
            bannerUrl       = channelInfo.banners.firstOrNull()?.url ?: "",
            videos          = videos,
            service         = service.serviceInfo.name.lowercase()
        )
    }

    // ─────────────────────────────────────────────────────────
    // TRENDING (per service)
    // ─────────────────────────────────────────────────────────

    /**
     * Trending/featured content for a service.
     * Not all services support trending — check SUPPORTED_SERVICES.supportsTrending.
     *
     * @param serviceName Service to fetch trending from
     */
    fun getTrending(serviceName: String = "youtube"): List<VideoModel> {
        val serviceInfo = SUPPORTED_SERVICES[serviceName.lowercase()]
            ?: SUPPORTED_SERVICES["youtube"]!!

        if (!serviceInfo.supportsTrending) return emptyList()

        val service = NewPipe.getService(serviceInfo.id)

        // Each service has a different kiosk URL for trending/featured content
        val kioskUrl = when (serviceName.lowercase()) {
            "youtube"    -> "https://www.youtube.com/feed/trending"
            "soundcloud" -> "https://soundcloud.com/charts/top"
            "mediaccc"   -> "https://media.ccc.de"
            "peertube"   -> "https://peertube.tv/videos/trending"
            else         -> serviceInfo.baseUrl
        }

        return try {
            val kioskInfo = KioskInfo.getInfo(service, kioskUrl)
            println("DEBUG: getTrending($serviceName) - kioskInfo.relatedItems length: ${kioskInfo.relatedItems.size}")
            
            kioskInfo.relatedItems
                .toList()
                .filterNotNull()
                .take(30)
                .mapNotNull { item ->
                    if (item !is StreamInfoItem) return@mapNotNull null
                    try {
                        VideoModel(
                            id           = extractId(item.url),
                            title        = item.name ?: "Unknown",
                            uploader     = item.uploaderName ?: "Unknown",
                            uploaderUrl  = item.uploaderUrl ?: "",
                            duration     = item.duration,
                            viewCount    = item.viewCount,
                            uploadDate   = item.textualUploadDate ?: "",
                            thumbnailUrl = item.thumbnails.firstOrNull()?.url ?: "",
                            isLive       = item.streamType == StreamType.LIVE_STREAM || item.streamType == StreamType.AUDIO_LIVE_STREAM,
                            url          = item.url ?: "",
                            service      = serviceName
                        )
                    } catch (e: Exception) {
                        null
                    }
                }
        } catch (e: Exception) {
            println("ERROR: getTrending($serviceName) failed - ${e.message}")
            e.printStackTrace()
            emptyList()
        }
    }

    // ─────────────────────────────────────────────────────────
    // COMMENTS (YouTube only — other services don't support it)
    // ─────────────────────────────────────────────────────────

    /**
     * Fetch comments for a YouTube video.
     * Returns empty list for non-YouTube URLs.
     *
     * @param url Full YouTube video URL
     */
    fun getComments(url: String): CommentsModel {
        val service = serviceFromUrl(url)

        // Only YouTube supports comments in NewPipeExtractor
        if (service.serviceId != 0) {
            return CommentsModel(videoId = extractId(url), comments = emptyList())
        }

        val commentsInfo = CommentsInfo.getInfo(service, url)

        val comments = commentsInfo.relatedItems
            .filterNotNull()
            .mapNotNull { comment ->
                try {
                    CommentModel(
                        id                  = comment.commentId,
                        author              = comment.uploaderName ?: "Anonymous",
                        authorAvatarUrl     = comment.uploaderAvatars.firstOrNull()?.url ?: "",
                        text                = comment.commentText?.content ?: "",
                        likeCount           = comment.likeCount,
                        isHeartedByUploader = comment.isHeartedByUploader,
                        isPinned            = comment.isPinned,
                        publishedDate       = comment.textualUploadDate ?: ""
                    )
                } catch (e: Exception) {
                    null
                }
            }

        return CommentsModel(
            videoId  = extractId(url),
            comments = comments,
            nextPage = commentsInfo.nextPage?.url
        )
    }
}
