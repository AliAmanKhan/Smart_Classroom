package com.classroom.service;

import com.classroom.client.IamServiceClient;
import com.classroom.dto.StudyMaterialRequest;
import com.classroom.dto.StudyMaterialResponse;
import com.classroom.dto.UserDto;
import com.classroom.exception.AccessDeniedException;
import com.classroom.exception.ResourceNotFoundException;
import com.classroom.model.StudyMaterial;
import com.classroom.repository.StudyMaterialRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.cache.annotation.CacheEvict;
import org.springframework.cache.annotation.Cacheable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.transaction.support.TransactionSynchronization;
import org.springframework.transaction.support.TransactionSynchronizationManager;
import org.springframework.web.multipart.MultipartFile;

import java.util.List;

@Service
@RequiredArgsConstructor
@Slf4j
public class StudyMaterialService {

    private final StudyMaterialRepository studyMaterialRepository;
    private final IamServiceClient iamServiceClient;
    private final FileStorageService fileStorageService;
    private final AINotesGenerationService aiNotesGenerationService;

    private StudyMaterialResponse toResponse(StudyMaterial material) {
        return new StudyMaterialResponse(
                material.getId(),
                material.getTitle(),
                material.getDescription(),
                material.getType(),
                material.getFileName(),
                material.getYoutubeUrl(),
                material.getAiGeneratedNotes(),
                material.getClassroomId(),
                material.getCreatedAt()
        );
    }

    @Transactional
    @CacheEvict(value = "classroom-materials", key = "#classroomId")
    public StudyMaterialResponse uploadMaterial(Long classroomId, StudyMaterialRequest request,
                                       MultipartFile file, String teacherEmail) {
        UserDto teacher = iamServiceClient.getUserByEmail(teacherEmail);
        if (teacher == null) {
            throw new ResourceNotFoundException("Teacher not found with email: " + teacherEmail);
        }

        StudyMaterial material = new StudyMaterial();
        material.setTitle(request.getTitle());
        material.setDescription(request.getDescription());
        material.setType(request.getType());
        material.setClassroomId(classroomId);

        if (request.getType() == StudyMaterial.MaterialType.FILE && file != null) {
            String filePath = fileStorageService.storeFile(file, "materials");
            material.setFilePath(filePath);
            material.setFileName(file.getOriginalFilename());
        } else if (request.getType() == StudyMaterial.MaterialType.YOUTUBE_VIDEO) {
            material.setYoutubeUrl(request.getYoutubeUrl());
            material.setAiGeneratedNotes("Generating AI notes... Please wait.");
        }

        StudyMaterial savedMaterial = studyMaterialRepository.save(material);

        if (request.getType() == StudyMaterial.MaterialType.YOUTUBE_VIDEO) {
            triggerAsyncNotesGeneration(savedMaterial.getId());
        }

        return toResponse(savedMaterial);
    }

    @Transactional
    @CacheEvict(value = "classroom-materials", key = "#result.classroomId", condition = "#result != null")
    public StudyMaterialResponse regenerateAINotes(Long materialId, String teacherEmail) {
        StudyMaterial material = studyMaterialRepository.findById(materialId)
                .orElseThrow(() -> new ResourceNotFoundException("Study material not found with id: " + materialId));

        if (material.getType() != StudyMaterial.MaterialType.YOUTUBE_VIDEO) {
            throw new IllegalArgumentException("AI notes can only be generated for YouTube videos");
        }

        material.setAiGeneratedNotes("Generating AI notes... Please wait.");
        studyMaterialRepository.save(material);
        triggerAsyncNotesGeneration(materialId);

        return toResponse(material);
    }

    @Cacheable(value = "classroom-materials", key = "#classroomId")
    public List<StudyMaterialResponse> getClassroomMaterials(Long classroomId) {
        return studyMaterialRepository.findByClassroomId(classroomId).stream().map(this::toResponse).collect(java.util.stream.Collectors.toList());
    }

    public StudyMaterialResponse getMaterialResponse(Long id) {
        StudyMaterial material = studyMaterialRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Study material not found with id: " + id));
        return toResponse(material);
    }

    public StudyMaterial getMaterial(Long id) {
        return studyMaterialRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Study material not found with id: " + id));
    }

    @Transactional
    @CacheEvict(value = "classroom-materials", key = "#result.classroomId", condition = "#result != null")
    public StudyMaterial deleteMaterial(Long materialId, String teacherEmail) {
        StudyMaterial material = studyMaterialRepository.findById(materialId)
                .orElseThrow(() -> new ResourceNotFoundException("Study material not found with id: " + materialId));

        Long classroomId = material.getClassroomId();

        if (material.getType() == StudyMaterial.MaterialType.FILE && material.getFilePath() != null) {
            try {
                fileStorageService.deleteFile(material.getFilePath());
            } catch (Exception e) {
                log.warn("Failed to delete file or already deleted: {}", material.getFilePath(), e);
            }
        }

        studyMaterialRepository.delete(material);
        log.info("Study material deleted: {} by teacher: {}", material.getTitle(), teacherEmail);
        return material;
    }

    @Transactional
    @CacheEvict(value = "classroom-materials", key = "#result.classroomId", condition = "#result != null")
    public StudyMaterialResponse updateMaterial(Long materialId, StudyMaterialRequest request, String teacherEmail) {
        StudyMaterial material = studyMaterialRepository.findById(materialId)
                .orElseThrow(() -> new ResourceNotFoundException("Study material not found with id: " + materialId));

        boolean youtubeUrlChanged = false;
        if (material.getType() == StudyMaterial.MaterialType.YOUTUBE_VIDEO
                && request.getYoutubeUrl() != null
                && !request.getYoutubeUrl().equalsIgnoreCase(material.getYoutubeUrl())) {
            material.setYoutubeUrl(request.getYoutubeUrl());
            material.setAiGeneratedNotes("Generating AI notes... Please wait.");
            youtubeUrlChanged = true;
        }

        material.setTitle(request.getTitle());
        material.setDescription(request.getDescription());

        StudyMaterial updated = studyMaterialRepository.save(material);

        if (youtubeUrlChanged) {
            triggerAsyncNotesGeneration(updated.getId());
        }

        return toResponse(updated);
    }

    private void triggerAsyncNotesGeneration(Long materialId) {
        if (TransactionSynchronizationManager.isActualTransactionActive()) {
            TransactionSynchronizationManager.registerSynchronization(new TransactionSynchronization() {
                @Override
                public void afterCommit() {
                    aiNotesGenerationService.generateAINotesAsync(materialId);
                }
            });
        } else {
            aiNotesGenerationService.generateAINotesAsync(materialId);
        }
    }

    @CacheEvict(value = "classroom-materials", key = "#classroomId")
    public void evictClassroomMaterialsCache(Long classroomId) {}
}
