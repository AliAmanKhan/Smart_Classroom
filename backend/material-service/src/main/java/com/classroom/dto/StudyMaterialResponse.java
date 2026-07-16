package com.classroom.dto;

import com.classroom.model.StudyMaterial;
import lombok.AllArgsConstructor;
import lombok.Data;

import java.time.LocalDateTime;

import lombok.NoArgsConstructor;

@Data @NoArgsConstructor @AllArgsConstructor
public class StudyMaterialResponse {
    private Long id;
    private String title;
    private String description;
    private StudyMaterial.MaterialType type;
    private String fileName;
    private String youtubeUrl;
    private String aiGeneratedNotes;
    private Long classroomId;
    private LocalDateTime createdAt;
}
