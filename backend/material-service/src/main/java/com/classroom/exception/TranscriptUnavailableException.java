package com.classroom.exception;

/**
 * Thrown when a transcript cannot be retrieved from YouTube —
 * either because the video has no captions or the URL is invalid.
 * Maps to HTTP 422 Unprocessable Entity in the global exception handler.
 */
public class TranscriptUnavailableException extends RuntimeException {
    public TranscriptUnavailableException(String message) {
        super(message);
    }

    public TranscriptUnavailableException(String message, Throwable cause) {
        super(message, cause);
    }
}
