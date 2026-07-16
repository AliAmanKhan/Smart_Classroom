package com.classroom.dto;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.Instant;

/** Chat message sent inside a live session. */
@Data
@NoArgsConstructor
@AllArgsConstructor
public class ChatMessage {

    private String fromPeerId;
    private String displayName;
    private String message;
    private Instant timestamp;
}
