package com.classroom.exception;

/**
 * Thrown when a requested resource (e.g. StudyMaterial, Classroom, User)
 * does not exist in the database.
 * Maps to HTTP 404 Not Found in the global exception handler.
 */
public class ResourceNotFoundException extends RuntimeException {
    public ResourceNotFoundException(String message) {
        super(message);
    }
}
