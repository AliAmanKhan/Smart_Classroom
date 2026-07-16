package com.classroom.controller;

import com.classroom.exception.AccessDeniedException;
import com.classroom.model.LiveSession;
import com.classroom.model.ParticipantInfo;
import com.classroom.service.LiveSessionService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.web.bind.annotation.*;

import java.security.Principal;
import java.util.List;
import java.util.Map;
import java.util.Optional;

@RestController
@RequestMapping("/api/live")
@RequiredArgsConstructor
@Slf4j
public class LiveSessionController {

    private final LiveSessionService liveSessionService;

    /**
     * Teacher starts a live class.
     * The teacher's identity comes from the JWT via the Security context.
     */
    @PostMapping("/{classroomId}/start")
    public ResponseEntity<LiveSession> startSession(
            @PathVariable Long classroomId,
            @RequestParam(required = false) Long sectionId,
            @RequestParam(defaultValue = "Live Class") String title,
            Principal principal) {

        LiveSession session = liveSessionService.startSession(classroomId, sectionId, principal.getName(), title);
        return ResponseEntity.ok(session);
    }

    /**
     * Teacher ends a live class.
     */
    @DeleteMapping("/{classroomId}/end")
    public ResponseEntity<Map<String, String>> endSession(
            @PathVariable Long classroomId,
            @RequestParam(required = false) Long sectionId,
            Principal principal) {

        liveSessionService.endSession(classroomId, sectionId, principal.getName());
        return ResponseEntity.ok(Map.of("message", "Session ended successfully"));
    }

    /**
     * Check whether there is an active session for a classroom.
     */
    @GetMapping("/{classroomId}/status")
    public ResponseEntity<Map<String, Object>> getStatus(
            @PathVariable Long classroomId,
            @RequestParam(required = false) Long sectionId) {
        
        Optional<LiveSession> session = liveSessionService.findActiveSession(classroomId, sectionId);
        return session
                .map(s -> ResponseEntity.ok(Map.<String, Object>of(
                        "active", true,
                        "sessionId", s.getSessionId(),
                        "title", s.getTitle(),
                        "startedAt", s.getStartedAt().toString()
                )))
                .orElseGet(() -> ResponseEntity.ok(Map.of("active", false)));
    }

    /**
     * List participants currently in the session.
     */
    @GetMapping("/{classroomId}/participants")
    public ResponseEntity<List<ParticipantInfo>> getParticipants(
            @PathVariable Long classroomId,
            @RequestParam(required = false) Long sectionId) {
        LiveSession session = liveSessionService.getActiveSession(classroomId, sectionId);
        List<ParticipantInfo> participants = liveSessionService.getParticipants(session.getSessionId());
        return ResponseEntity.ok(participants);
    }

    /**
     * Get all active sessions for a classroom (both main and section-specific).
     */
    @GetMapping("/{classroomId}/sessions")
    public ResponseEntity<List<LiveSession>> getAllSessions(@PathVariable Long classroomId) {
        return ResponseEntity.ok(liveSessionService.findActiveSessions(classroomId));
    }
}
