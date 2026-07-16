package com.classroom.dto;

import lombok.Data;
import java.util.Set;
import java.time.LocalDateTime;

@Data
public class SectionDTO {
    private Long id;
    private String name;
    private Long classroomId;
    private Set<Long> studentIds;
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;
}
