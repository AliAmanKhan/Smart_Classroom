package com.classroom.service;

import com.classroom.exception.TranscriptUnavailableException;
import io.github.thoroldvix.api.*;
import lombok.extern.slf4j.Slf4j;
import org.springframework.cache.annotation.Cacheable;
import org.springframework.stereotype.Service;

@Service
@Slf4j
public class YouTubeTranscriptService {

    private final TranscriptFormatter textFormatter;

    public YouTubeTranscriptService() {
        this.textFormatter = TranscriptFormatters.textFormatter();
    }

    /**
     * Fetches and returns the transcript for the given YouTube URL.
     *
     * The result is cached in Redis for 60 minutes (see RedisConfig) keyed on the
     * extracted video ID. This avoids repeated HTTP calls to YouTube's subtitle API
     * for the same video — especially important during AI notes regeneration retries.
     */
    @Cacheable(value = "youtube-transcripts", key = "#root.target.extractVideoId(#youtubeUrl)")
    public String getTranscript(String youtubeUrl) {
        try {
            String videoId = extractVideoId(youtubeUrl);
            if (videoId == null || videoId.isEmpty()) {
                throw new IllegalArgumentException("Invalid YouTube URL: " + youtubeUrl);
            }

            log.info("Fetching transcript for video ID: {}", videoId);
            YoutubeTranscriptApi youtubeTranscriptApi = TranscriptApiFactory.createDefault();
            // Get list of available transcripts
            TranscriptList transcriptList = youtubeTranscriptApi.listTranscripts(videoId);

            // Try to get English transcript first, fallback to any available
            TranscriptContent transcriptContent;
            try {
                transcriptContent = transcriptList.findTranscript("en").fetch();
                log.info("Found English transcript for video: {}", videoId);
            } catch (TranscriptRetrievalException e) {
                log.warn("English transcript not found, trying first available transcript");
                // Iterate over available transcripts and fetch the first one
                Transcript firstTranscript = null;
                for (Transcript t : transcriptList) {
                    firstTranscript = t;
                    break;
                }
                if (firstTranscript == null) {
                    throw new TranscriptRetrievalException(videoId, "No transcripts available for this video.");
                }
                transcriptContent = firstTranscript.fetch();
                log.info("Using first available transcript for video: {}", videoId);
            }

            // Format transcript content as plain text
            String fullTranscript = textFormatter.format(transcriptContent);

            if (fullTranscript == null || fullTranscript.isBlank()) {
                log.warn("Transcript is empty for video: {}", videoId);
                return "No transcript available for this video.";
            }

            log.info("Successfully fetched transcript for video: {} (length: {} chars)",
                    videoId, fullTranscript.length());
            return fullTranscript;

        } catch (IllegalArgumentException e) {
            log.error("Invalid YouTube URL provided: {}", youtubeUrl);
            throw new TranscriptUnavailableException("Invalid YouTube URL: " + youtubeUrl, e);
        } catch (TranscriptRetrievalException e) {
            log.error("Failed to retrieve transcript for video '{}': {}", youtubeUrl, e.getMessage());
            throw new TranscriptUnavailableException(
                    "Transcript not available for this video. The video may not have captions enabled.", e);
        } catch (Exception e) {
            log.error("Unexpected error fetching YouTube transcript for URL: {}", youtubeUrl, e);
            throw new TranscriptUnavailableException("Failed to fetch YouTube transcript: " + e.getMessage(), e);
        }
    }

    /**
     * Extracts the YouTube video ID from various URL formats.
     * Made package-visible so the @Cacheable SpEL expression can call it as a key generator.
     */
    public String extractVideoId(String youtubeUrl) {
        if (youtubeUrl == null || youtubeUrl.isEmpty()) {
            return null;
        }

        // Handle various YouTube URL formats
        // https://www.youtube.com/watch?v=VIDEO_ID
        // https://youtu.be/VIDEO_ID
        // https://www.youtube.com/embed/VIDEO_ID
        // https://m.youtube.com/watch?v=VIDEO_ID

        String videoId = null;

        if (youtubeUrl.contains("youtube.com/watch?v=")) {
            int startIndex = youtubeUrl.indexOf("v=") + 2;
            int endIndex = youtubeUrl.indexOf("&", startIndex);
            videoId = endIndex != -1
                ? youtubeUrl.substring(startIndex, endIndex)
                : youtubeUrl.substring(startIndex);
        } else if (youtubeUrl.contains("youtu.be/")) {
            int startIndex = youtubeUrl.indexOf("youtu.be/") + 9;
            int endIndex = youtubeUrl.indexOf("?", startIndex);
            videoId = endIndex != -1
                ? youtubeUrl.substring(startIndex, endIndex)
                : youtubeUrl.substring(startIndex);
        } else if (youtubeUrl.contains("youtube.com/embed/")) {
            int startIndex = youtubeUrl.indexOf("embed/") + 6;
            int endIndex = youtubeUrl.indexOf("?", startIndex);
            videoId = endIndex != -1
                ? youtubeUrl.substring(startIndex, endIndex)
                : youtubeUrl.substring(startIndex);
        }

        // Clean up video ID (remove any remaining query params or fragments)
        if (videoId != null) {
            videoId = videoId.split("[?&#]")[0];
        }

        return videoId;
    }
}
