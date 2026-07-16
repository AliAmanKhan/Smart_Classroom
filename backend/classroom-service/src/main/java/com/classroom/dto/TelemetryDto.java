package com.classroom.dto;

import lombok.Data;

@Data
public class TelemetryDto {
    private String verb; // VIEWED, SUBMITTED, JOINED
    private String objectType; // MATERIAL, ASSIGNMENT, LIVE_CLASS
    private String objectId;
    private Long classroomId;
}
