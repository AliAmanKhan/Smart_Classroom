package com.classroom.dto;

import jakarta.validation.constraints.NotBlank;
import lombok.Data;

@Data
public class ClassroomRequest {
    @NotBlank(message = "Classroom name is required")
    private String name;

    private String description;
}
