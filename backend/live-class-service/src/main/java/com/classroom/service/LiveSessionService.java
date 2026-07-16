package com.classroom.service;

import com.classroom.exception.AccessDeniedException;
import com.classroom.exception.SessionNotFoundException;
import com.classroom.model.LiveSession;
import com.classroom.model.ParticipantInfo;
import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.stereotype.Service;

import java.time.Instant;
import java.util.*;
import java.util.concurrent.TimeUnit;

@Service
@RequiredArgsConstructor
@Slf4j
public class LiveSessionService {

    private static final String SESSION_KEY_PREFIX = "live:session:";
    private static final String PARTICIPANTS_KEY_PREFIX = "live:participants:";

    private final StringRedisTemplate redisTemplate;
    private final ObjectMapper objectMapper;

    @Value("${live.session.ttl-hours:4}")
    private long ttlHours;

    // ─── Session Lifecycle ─────────────────────────────────────────────────────

    private String getSessionKey(Long classroomId, Long sectionId) {
        return sectionId == null 
            ? SESSION_KEY_PREFIX + classroomId + ":main"
            : SESSION_KEY_PREFIX + classroomId + ":section:" + sectionId;
    }

    public LiveSession startSession(Long classroomId, Long sectionId, String hostUsername, String title) {
        String sessionKey = getSessionKey(classroomId, sectionId);

        // Prevent duplicate active sessions for the same classroom/section
        if (redisTemplate.hasKey(sessionKey)) {
            log.warn("Session already active for classroomId={} sectionId={}", classroomId, sectionId);
            return readSession(sessionKey);
        }

        LiveSession session = LiveSession.builder()
                .sessionId(UUID.randomUUID().toString())
                .classroomId(classroomId)
                .sectionId(sectionId)
                .hostUsername(hostUsername)
                .title(title)
                .startedAt(Instant.now())
                .active(true)
                .build();

        writeSession(sessionKey, session);
        log.info("Live session started: sessionId={} for classroomId={} sectionId={} by {}", session.getSessionId(), classroomId, sectionId, hostUsername);
        return session;
    }

    public void endSession(Long classroomId, Long sectionId, String requestingUsername) {
        String sessionKey = getSessionKey(classroomId, sectionId);
        LiveSession session = getActiveSession(classroomId, sectionId);

        if (!session.getHostUsername().equals(requestingUsername)) {
            throw new AccessDeniedException("Only the session host can end the session");
        }

        // Clean up participants list
        redisTemplate.delete(PARTICIPANTS_KEY_PREFIX + session.getSessionId());
        redisTemplate.delete(sessionKey);
        log.info("Live session ended: sessionId={} by {}", session.getSessionId(), requestingUsername);
    }

    public LiveSession getActiveSession(Long classroomId, Long sectionId) {
        String sessionKey = getSessionKey(classroomId, sectionId);
        String json = redisTemplate.opsForValue().get(sessionKey);
        if (json == null) {
            throw new SessionNotFoundException("No active session for classroomId: " + classroomId + " sectionId: " + sectionId);
        }
        return readSession(sessionKey);
    }

    public List<LiveSession> findActiveSessions(Long classroomId) {
        String pattern = SESSION_KEY_PREFIX + classroomId + ":*";
        Set<String> keys = redisTemplate.keys(pattern);
        if (keys == null || keys.isEmpty()) {
            return Collections.emptyList();
        }
        return keys.stream()
                .map(this::readSession)
                .filter(Objects::nonNull)
                .toList();
    }

    public Optional<LiveSession> findActiveSession(Long classroomId, Long sectionId) {
        try {
            return Optional.of(getActiveSession(classroomId, sectionId));
        } catch (SessionNotFoundException e) {
            return Optional.empty();
        }
    }

    // ─── Participant Management ────────────────────────────────────────────────

    public List<ParticipantInfo> addParticipant(String sessionId, ParticipantInfo participant) {
        String key = PARTICIPANTS_KEY_PREFIX + sessionId;
        String participantJson = toJson(participant);
        redisTemplate.opsForSet().add(key, participantJson);
        redisTemplate.expire(key, ttlHours, TimeUnit.HOURS);
        log.info("Participant joined: peerId={} user={} session={}", participant.getPeerId(), participant.getUsername(), sessionId);
        return getParticipants(sessionId);
    }

    public List<ParticipantInfo> removeParticipant(String sessionId, String peerId) {
        String key = PARTICIPANTS_KEY_PREFIX + sessionId;
        Set<String> members = redisTemplate.opsForSet().members(key);
        if (members != null) {
            for (String json : members) {
                ParticipantInfo p = fromJson(json, ParticipantInfo.class);
                if (p != null && peerId.equals(p.getPeerId())) {
                    redisTemplate.opsForSet().remove(key, json);
                    log.info("Participant left: peerId={} session={}", peerId, sessionId);
                    break;
                }
            }
        }
        return getParticipants(sessionId);
    }

    public List<ParticipantInfo> getParticipants(String sessionId) {
        String key = PARTICIPANTS_KEY_PREFIX + sessionId;
        Set<String> members = redisTemplate.opsForSet().members(key);
        if (members == null || members.isEmpty()) {
            return Collections.emptyList();
        }
        return members.stream()
                .map(json -> fromJson(json, ParticipantInfo.class))
                .filter(Objects::nonNull)
                .toList();
    }

    // ─── Private helpers ───────────────────────────────────────────────────────

    private void writeSession(String key, LiveSession session) {
        redisTemplate.opsForValue().set(key, toJson(session), ttlHours, TimeUnit.HOURS);
    }

    private LiveSession readSession(String key) {
        String json = redisTemplate.opsForValue().get(key);
        return fromJson(json, LiveSession.class);
    }

    private String toJson(Object obj) {
        try {
            return objectMapper.writeValueAsString(obj);
        } catch (JsonProcessingException e) {
            throw new IllegalStateException("Failed to serialize to JSON", e);
        }
    }

    private <T> T fromJson(String json, Class<T> clazz) {
        if (json == null) return null;
        try {
            return objectMapper.readValue(json, clazz);
        } catch (JsonProcessingException e) {
            log.error("Failed to deserialize JSON: {}", e.getMessage());
            return null;
        }
    }
}
