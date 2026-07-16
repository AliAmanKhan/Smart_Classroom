package com.classroom.service;

import com.classroom.exception.AiNotesGenerationException;
import com.classroom.model.StudyMaterial;
import com.classroom.repository.StudyMaterialRepository;
import com.classroom.exception.ResourceNotFoundException;
import com.classroom.exception.TranscriptUnavailableException;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.cache.CacheManager;
import org.springframework.cache.Cache;
import org.springframework.scheduling.annotation.Async;
import org.springframework.stereotype.Service;

@Service
@RequiredArgsConstructor
@Slf4j
public class AINotesGenerationService {

    private final StudyMaterialRepository studyMaterialRepository;
    private final YouTubeTranscriptService youTubeTranscriptService;
    private final NvidiaAIService nvidiaAIService;
    private final com.classroom.messaging.RabbitProducer rabbitProducer;
    private final CacheManager cacheManager;

    private void evictCache(Long classroomId) {
        if (classroomId != null) {
            Cache cache = cacheManager.getCache("classroom-materials");
            if (cache != null) {
                // Clear the whole cache to prevent any serialization mismatch issues with the key
                cache.clear();
            }
        }
    }

    @Async
    public void generateAINotesAsync(Long materialId) {
        try {
            StudyMaterial material = studyMaterialRepository.findById(materialId)
                    .orElseThrow(() -> new ResourceNotFoundException("Material not found with id: " + materialId));

            log.info("Starting async AI notes generation for material: {}", material.getTitle());

            String transcript = youTubeTranscriptService.getTranscript(material.getYoutubeUrl());
            log.info("Transcript fetched for: {}", material.getTitle());

            String notes = nvidiaAIService.generateNotesFromTranscript(transcript, material.getTitle(), progressMsg -> {
                material.setAiGeneratedNotes(progressMsg);
                studyMaterialRepository.save(material);
                evictCache(material.getClassroomId());
            });
            material.setAiGeneratedNotes(notes);
            studyMaterialRepository.save(material);
            evictCache(material.getClassroomId());

            log.info("Async AI notes generation completed for material: {}", material.getTitle());

        } catch (ResourceNotFoundException e) {
            log.error("Material not found during AI notes generation. materialId={}", materialId, e);
        } catch (TranscriptUnavailableException e) {
            log.error("Transcript unavailable for materialId={}. Reason: {}", materialId, e.getMessage());
            persistFailureMessage(materialId, "Could not generate notes: transcript unavailable for this video. Ensure the video has captions enabled.");
        } catch (io.github.resilience4j.circuitbreaker.CallNotPermittedException e) {
            log.warn("Circuit Breaker is OPEN. Deferring AI notes generation for materialId={}", materialId);
            persistFailureMessage(materialId, "Generating AI notes... (AI service is temporarily unavailable. Your request has been queued.)");
            rabbitProducer.sendAiNotesRetryMessage(new com.classroom.messaging.AiNotesRetryMessage(materialId, 1));
        } catch (AiNotesGenerationException e) {
            log.error("AI generation failed for materialId={}. Reason: {}", materialId, e.getMessage());
            persistFailureMessage(materialId, "Generating AI notes... (AI service is temporarily unavailable. Your request has been queued.)");
            rabbitProducer.sendAiNotesRetryMessage(new com.classroom.messaging.AiNotesRetryMessage(materialId, 1));
        } catch (Exception e) {
            log.error("Unexpected error during async AI notes generation for materialId={}", materialId, e);
            persistFailureMessage(materialId, "An unexpected error occurred. Please try regenerating.");
        }
    }

    public void generateAINotesSync(Long materialId) {
        StudyMaterial material = studyMaterialRepository.findById(materialId)
                .orElseThrow(() -> new ResourceNotFoundException("Material not found with id: " + materialId));

        log.info("Starting sync AI notes generation for material: {}", material.getTitle());

        try {
            String transcript = youTubeTranscriptService.getTranscript(material.getYoutubeUrl());
            String notes = nvidiaAIService.generateNotesFromTranscript(transcript, material.getTitle(), progressMsg -> {
                material.setAiGeneratedNotes(progressMsg);
                studyMaterialRepository.save(material);
                evictCache(material.getClassroomId());
            });
            material.setAiGeneratedNotes(notes);
            studyMaterialRepository.save(material);
            evictCache(material.getClassroomId());
            log.info("Sync AI notes generation completed for material: {}", material.getTitle());
        } catch (TranscriptUnavailableException e) {
            log.error("Transcript unavailable for materialId={}. Stopping retries.", materialId);
            persistFailureMessage(materialId, "Could not generate notes: transcript unavailable for this video. Ensure the video has captions enabled.");
            // Do not rethrow; we don't want to retry if transcript is permanently unavailable
        } catch (Exception e) {
            log.error("Error during sync AI notes generation. Throwing to trigger AMQP retry. materialId={}", materialId);
            throw e; // Rethrow to trigger Spring AMQP retry
        }
    }

    private void persistFailureMessage(Long materialId, String message) {
        studyMaterialRepository.findById(materialId).ifPresent(m -> {
            m.setAiGeneratedNotes(message);
            studyMaterialRepository.save(m);
            evictCache(m.getClassroomId());
        });
    }
}
