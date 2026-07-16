package com.classroom.dto;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

/**
 * WebRTC signaling message exchanged over STOMP.
 *
 * type: "offer" | "answer" | "ice" | "join" | "leave"
 */
@Data
@NoArgsConstructor
@AllArgsConstructor
public class SignalMessage {

    /** "offer", "answer", "ice", "join", or "leave" */
    private String type;

    /** Peer ID of the sender */
    private String fromPeerId;

    /** Peer ID of the intended recipient (null for broadcast events like join/leave) */
    private String toPeerId;

    /** SDP string (offer/answer only) */
    private String sdp;

    /** ICE candidate object serialized as JSON string (ice only) */
    private String candidate;

    /** Display name (join only) */
    private String displayName;
}
