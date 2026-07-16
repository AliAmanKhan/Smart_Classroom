package com.classroom.model;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.io.Serializable;
import java.time.Instant;

/**
 * Represents a participant currently in a live session, stored in Redis.
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class ParticipantInfo implements Serializable {

    /** Unique peer ID generated on the client side (e.g. UUID). */
    private String peerId;

    /** Authenticated username from JWT. */
    private String username;

    /** Display name shown in the UI. */
    private String displayName;

    /** "HOST" or "STUDENT". */
    private String role;

    /** When the participant joined. */
    private Instant joinedAt;
}
