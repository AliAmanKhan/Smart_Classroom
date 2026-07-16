package com.classroom.exception;

/**
 * Thrown when a user attempts an operation they are not authorised to perform
 * (e.g. a teacher modifying another teacher's classroom).
 * Maps to HTTP 403 Forbidden in the global exception handler.
 */
public class AccessDeniedException extends RuntimeException {
    public AccessDeniedException(String message) {
        super(message);
    }
}
