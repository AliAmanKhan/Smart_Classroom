package com.classroom.exception;

/**
 * Thrown when the AI model fails to generate notes — e.g. due to a timeout,
 * API rate-limit, or an unexpected model response.
 * Maps to HTTP 503 Service Unavailable in the global exception handler.
 */
public class AiNotesGenerationException extends RuntimeException {
    public AiNotesGenerationException(String message) {
        super(message);
    }

    public AiNotesGenerationException(String message, Throwable cause) {
        super(message, cause);
    }
}
