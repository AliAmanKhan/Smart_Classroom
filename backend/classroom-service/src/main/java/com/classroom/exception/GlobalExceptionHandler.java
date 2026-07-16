package com.classroom.exception;

import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;

import java.time.LocalDateTime;
import java.util.Map;

@RestControllerAdvice
@Slf4j
public class GlobalExceptionHandler {

    @ExceptionHandler(IllegalArgumentException.class)
    public ResponseEntity<Map<String, Object>> handleIllegalArgument(IllegalArgumentException ex) {
        log.warn("Bad request: {}", ex.getMessage());
        return buildResponse(HttpStatus.BAD_REQUEST, ex.getMessage());
    }

    @ExceptionHandler(RuntimeException.class)
    public ResponseEntity<Map<String, Object>> handleRuntimeException(RuntimeException ex) {
        String msg = ex.getMessage();

        // Map specific messages to proper HTTP status codes
        if (msg != null && msg.toLowerCase().contains("not found")) {
            log.warn("Resource not found: {}", msg);
            return buildResponse(HttpStatus.NOT_FOUND, msg);
        }
        if (msg != null && (msg.toLowerCase().contains("only") || msg.toLowerCase().contains("cannot") || msg.toLowerCase().contains("denied"))) {
            log.warn("Access denied: {}", msg);
            return buildResponse(HttpStatus.FORBIDDEN, msg);
        }

        log.error("Unexpected runtime error: {}", msg, ex);
        return buildResponse(HttpStatus.BAD_REQUEST, msg != null ? msg : "An unexpected error occurred");
    }

    @ExceptionHandler(Exception.class)
    public ResponseEntity<Map<String, Object>> handleGenericException(Exception ex) {
        log.error("Unexpected error occurred", ex);
        return buildResponse(HttpStatus.INTERNAL_SERVER_ERROR, "An unexpected error occurred. Please try again.");
    }

    private ResponseEntity<Map<String, Object>> buildResponse(HttpStatus status, String message) {
        return ResponseEntity.status(status).body(Map.of(
                "timestamp", LocalDateTime.now().toString(),
                "status", status.value(),
                "error", status.getReasonPhrase(),
                "message", message
        ));
    }
}
