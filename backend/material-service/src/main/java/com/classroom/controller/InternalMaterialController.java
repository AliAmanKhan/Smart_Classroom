package com.classroom.controller;

import com.classroom.model.StudyMaterial;
import com.classroom.repository.StudyMaterialRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

/**
 * Internal-only endpoints consumed by other microservices via Feign.
 * Not exposed through the API Gateway to external clients.
 */
@RestController
@RequestMapping("/internal/materials")
@RequiredArgsConstructor
public class InternalMaterialController {

    private final StudyMaterialRepository studyMaterialRepository;

    /**
     * Returns total counts of Files and YouTube Videos for a list of classroom IDs.
     * Used by classroom-service TelemetryService.
     */
    @GetMapping("/stats")
    public Map<String, Long> getMaterialStats(@RequestParam List<Long> classroomIds) {
        if (classroomIds == null || classroomIds.isEmpty()) {
            return Map.of("files", 0L, "videos", 0L);
        }

        List<StudyMaterial> materials = studyMaterialRepository.findByClassroomIdIn(classroomIds);
        
        long files = materials.stream().filter(m -> m.getType() == StudyMaterial.MaterialType.FILE).count();
        long videos = materials.stream().filter(m -> m.getType() == StudyMaterial.MaterialType.YOUTUBE_VIDEO).count();

        return Map.of(
                "files", files,
                "videos", videos
        );
    }
}
