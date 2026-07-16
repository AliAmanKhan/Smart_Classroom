package com.classroom.dto;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class AssignmentResponse {

    private Long id;
    private String title;
    private String description;
    private LocalDateTime deadline;
    private Integer maxPoints;

    private Long classroomId;
    private String classroomName;

    private boolean published;

    private String attachmentName;

    private Long sectionId;
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;
}