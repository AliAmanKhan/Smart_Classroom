package com.classroom.controller;

import com.classroom.dto.StudyMaterialRequest;
import com.classroom.dto.StudyMaterialResponse;
import com.classroom.model.StudyMaterial;
import com.classroom.service.FileStorageService;
import com.classroom.service.StudyMaterialService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.util.List;

@RestController
@RequestMapping("/api/materials")
@RequiredArgsConstructor
public class StudyMaterialController {

    private final StudyMaterialService studyMaterialService;
    private final FileStorageService fileStorageService;

    @PostMapping("/classroom/{classroomId}")
    public ResponseEntity<StudyMaterialResponse> uploadMaterial(
            @PathVariable Long classroomId,
            @Valid @ModelAttribute StudyMaterialRequest request,
            @RequestParam(required = false) MultipartFile file,
            Authentication authentication) {
        String email = authentication.getName();
        return ResponseEntity.ok(studyMaterialService.uploadMaterial(classroomId, request, file, email));
    }

    @GetMapping("/classroom/{classroomId}")
    public ResponseEntity<List<StudyMaterialResponse>> getClassroomMaterials(@PathVariable Long classroomId) {
        return ResponseEntity.ok(studyMaterialService.getClassroomMaterials(classroomId));
    }

    @GetMapping("/{id}")
    public ResponseEntity<StudyMaterialResponse> getMaterialResponse(@PathVariable Long id) {
        return ResponseEntity.ok(studyMaterialService.getMaterialResponse(id));
    }

    @PostMapping("/{id}/regenerate-notes")
    public ResponseEntity<StudyMaterialResponse> regenerateAINotes(
            @PathVariable Long id,
            Authentication authentication) {
        String email = authentication.getName();
        return ResponseEntity.ok(studyMaterialService.regenerateAINotes(id, email));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> deleteMaterial(
            @PathVariable Long id,
            Authentication authentication) {
        String email = authentication.getName();
        studyMaterialService.deleteMaterial(id, email);
        return ResponseEntity.noContent().build();
    }

    @PutMapping("/{id}")
    public ResponseEntity<StudyMaterialResponse> updateMaterial(
            @PathVariable Long id,
            @Valid @RequestBody StudyMaterialRequest request,
            Authentication authentication) {
        String email = authentication.getName();
        return ResponseEntity.ok(studyMaterialService.updateMaterial(id, request, email));
    }

    /**
     * Returns a 302 redirect to a short-lived S3 pre-signed URL.
     * The browser / client follows the redirect and downloads directly from S3,
     * so the service never proxies the file bytes.
     */
    @GetMapping("/download/{materialId}")
    public ResponseEntity<Void> downloadFile(@PathVariable Long materialId) {
        StudyMaterial material = studyMaterialService.getMaterial(materialId);

        if (material.getFilePath() == null) {
            return ResponseEntity.notFound().build();
        }

        String presignedUrl = fileStorageService.generatePresignedUrl(material.getFilePath());
        return ResponseEntity.status(HttpStatus.FOUND)
                .header(HttpHeaders.LOCATION, presignedUrl)
                .build();
    }
}
