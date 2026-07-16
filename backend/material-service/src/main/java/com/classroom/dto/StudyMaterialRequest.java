package com.classroom.dto;

import com.classroom.model.StudyMaterial;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.Data;

@Data
public class StudyMaterialRequest {
    @NotBlank(message = "Title is required")
    private String title;

    private String description;

    @NotNull(message = "Material type is required")
    private StudyMaterial.MaterialType type;

    private String youtubeUrl;
}
