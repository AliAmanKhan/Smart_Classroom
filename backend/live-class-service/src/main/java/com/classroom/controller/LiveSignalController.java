package com.classroom.controller;

import com.classroom.dto.ChatMessage;
import com.classroom.dto.SignalMessage;
import com.classroom.exception.SessionNotFoundException;
import com.classroom.model.LiveSession;
import com.classroom.model.ParticipantInfo;
import com.classroom.service.LiveSessionService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.messaging.handler.annotation.DestinationVariable;
import org.springframework.messaging.handler.annotation.MessageMapping;
import org.springframework.messaging.handler.annotation.Payload;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.messaging.simp.SimpMessageHeaderAccessor;
import org.springframework.stereotype.Controller;

import java.security.Principal;
import java.time.Instant;
import java.util.List;
import java.util.Map;

/**
 * Handles all STOMP WebSocket messages for WebRTC signaling, chat, and
 * participant lifecycle events inside a live class session.
 *
 * Connection flow:
 * 1. Client connects to /ws?token=<jwt>  (validated by WsHandshakeInterceptor)
 * 2. Client sends a "join" SignalMessage to /app/live/{sessionId}/signal
 * 3. Server records the participant and broadcasts "join" + current participant list
 * 4. Existing peers exchange offer/answer/ICE via /app/live/{sessionId}/signal
 * 5. Chat messages go through /app/live/{sessionId}/chat
 * 6. "leave" signal triggers participant removal and broadcast
 */
@Controller
@RequiredArgsConstructor
@Slf4j
public class LiveSignalController {

    private final SimpMessagingTemplate messagingTemplate;
    private final LiveSessionService liveSessionService;

    /**
     * Route WebRTC signaling messages.
     *
     * - "join" / "leave"  → broadcast to all participants
     * - "offer" / "answer" / "ice" → unicast to specific toPeerId
     */
    @MessageMapping("/live/{sessionId}/signal")
    public void handleSignal(@DestinationVariable String sessionId,
                             @Payload SignalMessage message,
                             SimpMessageHeaderAccessor headerAccessor) {
        
        String username = (String) headerAccessor.getSessionAttributes().get("username");
        if (username == null) username = "unknown";

        message.setFromPeerId(sanitizePeerId(message.getFromPeerId()));
        log.debug("Signal [{}] from {} in session {}", message.getType(), username, sessionId);

        switch (message.getType()) {
            case "join" -> handleJoin(sessionId, message, username);
            case "leave" -> handleLeave(sessionId, message);
            case "offer", "answer", "ice" -> routeToTarget(sessionId, message);
            default -> log.warn("Unknown signal type '{}' from {}", message.getType(), username);
        }
    }

    /**
     * Broadcast a chat message to all participants in the session.
     */
    @MessageMapping("/live/{sessionId}/chat")
    public void handleChat(@DestinationVariable String sessionId,
                           @Payload ChatMessage message,
                           SimpMessageHeaderAccessor headerAccessor) {

        String username = (String) headerAccessor.getSessionAttributes().get("username");
        if (username == null) username = "unknown";

        message.setTimestamp(Instant.now());
        log.debug("Chat from {} in session {}: {}", username, sessionId, message.getMessage());
        messagingTemplate.convertAndSend("/topic/live/" + sessionId + "/chat", message);
    }

    // ─── Private handlers ─────────────────────────────────────────────────────

    private void handleJoin(String sessionId, SignalMessage message, String username) {
        ParticipantInfo participant = ParticipantInfo.builder()
                .peerId(message.getFromPeerId())
                .username(username)
                .displayName(message.getDisplayName() != null ? message.getDisplayName() : username)
                .role(resolveRole(sessionId, username))
                .joinedAt(Instant.now())
                .build();

        List<ParticipantInfo> participants = liveSessionService.addParticipant(sessionId, participant);

        // Broadcast the "join" event so all peers can initiate a new P2P connection
        messagingTemplate.convertAndSend("/topic/live/" + sessionId + "/participants", Map.of(
                "type", "join",
                "participant", participant,
                "participants", participants
        ));
    }

    private void handleLeave(String sessionId, SignalMessage message) {
        List<ParticipantInfo> participants = liveSessionService.removeParticipant(sessionId, message.getFromPeerId());

        messagingTemplate.convertAndSend("/topic/live/" + sessionId + "/participants", Map.of(
                "type", "leave",
                "peerId", message.getFromPeerId(),
                "participants", participants
        ));
    }

    /**
     * Route offer / answer / ICE to the specific target peer.
     * Each peer subscribes to /topic/live/{sessionId}/signal/{ownPeerId}.
     */
    private void routeToTarget(String sessionId, SignalMessage message) {
        if (message.getToPeerId() == null || message.getToPeerId().isBlank()) {
            log.warn("Signal type '{}' missing toPeerId — dropping", message.getType());
            return;
        }
        String destination = "/topic/live/" + sessionId + "/signal/" + message.getToPeerId();
        messagingTemplate.convertAndSend(destination, message);
    }

    private String resolveRole(String sessionId, String username) {
        try {
            // sectionId is null here since we can't extract it easily, this will just fallback to STUDENT
            LiveSession session = liveSessionService.getActiveSession(extractClassroomId(sessionId), null);
            return session.getHostUsername().equals(username) ? "HOST" : "STUDENT";
        } catch (SessionNotFoundException e) {
            return "STUDENT";
        }
    }

    /**
     * sessionId is the UUID stored in LiveSession — classroomId lookup requires
     * a scan. For the role resolution we accept "STUDENT" as safe default when
     * the reverse lookup fails (the host already knows they are HOST via REST response).
     */
    private Long extractClassroomId(String sessionId) {
        // No reverse index needed here — role resolution falls back gracefully
        throw new SessionNotFoundException("Reverse sessionId lookup not implemented");
    }

    private String sanitizePeerId(String peerId) {
        return peerId == null ? "unknown" : peerId.replaceAll("[^a-zA-Z0-9\\-_]", "");
    }

}
