package com.classroom.model;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.io.Serializable;
import java.time.Instant;

/**
 * Represents an active live class session stored in Redis.
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class LiveSession implements Serializable {

    /** Unique session identifier (UUID). */
    private String sessionId;

    /** The classroom this session belongs to. */
    private Long classroomId;

    /** Optional section ID if this live class is specific to a section. */
    private Long sectionId;

    /** Email / username of the teacher who started the session. */
    private String hostUsername;

    /** Friendly display name of the classroom / session. */
    private String title;

    /** When the session was created. */
    private Instant startedAt;

    /** Whether the session is currently active. */
    private boolean active;
}
