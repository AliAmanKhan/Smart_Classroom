package com.classroom.controller;

import com.classroom.dto.AssignmentRequest;
import com.classroom.dto.AssignmentResponse;
import com.classroom.model.Assignment;
import com.classroom.model.Submission;
import com.classroom.service.AssignmentService;
import com.classroom.service.FileStorageService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.time.LocalDateTime;
import java.util.List;

@RestController
@RequestMapping("/api/assignments")
@RequiredArgsConstructor
public class AssignmentController {

    private final AssignmentService assignmentService;
    private final FileStorageService fileStorageService;

    @PostMapping(value = "/classroom/{classroomId}", consumes = {"multipart/form-data", "application/x-www-form-urlencoded", "application/json"})
    public ResponseEntity<AssignmentResponse> createAssignment(
            @PathVariable Long classroomId,
            @Valid @ModelAttribute AssignmentRequest request,
            @RequestParam(required = false) MultipartFile file,
            Authentication authentication) {
        String email = authentication.getName();
        return ResponseEntity.ok(assignmentService.createAssignment(classroomId, request, file, email));
    }

    @GetMapping("/classroom/{classroomId}")
    public ResponseEntity<List<AssignmentResponse>> getClassroomAssignments(@PathVariable Long classroomId) {
        return ResponseEntity.ok(assignmentService.getClassroomAssignments(classroomId));
    }

    @GetMapping("/{id}")
    public ResponseEntity<Assignment> getAssignment(@PathVariable Long id) {
        return ResponseEntity.ok(assignmentService.getAssignment(id));
    }

    @PutMapping("/{id}/extend")
    public ResponseEntity<Assignment> extendDeadline(
            @PathVariable Long id,
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME) LocalDateTime newDeadline,
            Authentication authentication) {
        String email = authentication.getName();
        return ResponseEntity.ok(assignmentService.extendDeadline(id, newDeadline, email));
    }

    @PostMapping("/{id}/submit")
    public ResponseEntity<Submission> submitAssignment(
            @PathVariable Long id,
            @RequestParam(required = false) MultipartFile file,
            @RequestParam(required = false) String comment,
            Authentication authentication) {
        String email = authentication.getName();
        return ResponseEntity.ok(assignmentService.submitAssignment(id, file, comment, email));
    }

    @GetMapping("/{id}/submissions")
    public ResponseEntity<List<Submission>> getSubmissions(@PathVariable Long id) {
        return ResponseEntity.ok(assignmentService.getAssignmentSubmissions(id));
    }

    @GetMapping("/{id}/my-submission")
    public ResponseEntity<Submission> getMySubmission(
            @PathVariable Long id,
            Authentication authentication) {
        String email = authentication.getName();
        Submission submission = assignmentService.getMySubmission(id, email);
        if (submission != null) {
            return ResponseEntity.ok(submission);
        } else {
            return ResponseEntity.noContent().build();
        }
    }

    @DeleteMapping("/{id}/unsubmit")
    public ResponseEntity<Void> unsubmitAssignment(
            @PathVariable Long id,
            Authentication authentication) {
        String email = authentication.getName();
        assignmentService.unsubmitAssignment(id, email);
        return ResponseEntity.noContent().build();
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> deleteAssignment(
            @PathVariable Long id,
            Authentication authentication) {
        String email = authentication.getName();
        assignmentService.deleteAssignment(id, email);
        return ResponseEntity.noContent().build();
    }

    @PutMapping(value = "/{id}", consumes = {"multipart/form-data", "application/x-www-form-urlencoded", "application/json"})
    public ResponseEntity<AssignmentResponse> updateAssignment(
            @PathVariable Long id,
            @Valid @ModelAttribute AssignmentRequest request,
            @RequestParam(required = false) MultipartFile file,
            Authentication authentication) {
        String email = authentication.getName();
        return ResponseEntity.ok(assignmentService.updateAssignment(id, request, file, email));
    }

    /**
     * Returns a 302 redirect to a short-lived S3 pre-signed URL for the assignment attachment.
     */
    @GetMapping("/download/{assignmentId}")
    public ResponseEntity<Void> downloadAttachment(@PathVariable Long assignmentId) {
        Assignment assignment = assignmentService.getAssignment(assignmentId);

        if (assignment.getAttachmentPath() == null) {
            return ResponseEntity.notFound().build();
        }

        String presignedUrl = fileStorageService.generatePresignedUrl(assignment.getAttachmentPath());
        return ResponseEntity.status(HttpStatus.FOUND)
                .header(HttpHeaders.LOCATION, presignedUrl)
                .build();
    }

    /**
     * Grade a student's submission with points and optional feedback.
     */
    @PutMapping("/submission/{submissionId}/grade")
    public ResponseEntity<Submission> gradeSubmission(
            @PathVariable Long submissionId,
            @RequestParam Integer points,
            @RequestParam(required = false) String feedback,
            Authentication authentication) {
        String email = authentication.getName();
        return ResponseEntity.ok(assignmentService.gradeSubmission(submissionId, points, feedback, email));
    }

    /**
     * Return a submission for revision, clearing the grade and allowing the student to resubmit.
     */
    @PutMapping("/submission/{submissionId}/return")
    public ResponseEntity<Submission> returnSubmission(
            @PathVariable Long submissionId,
            Authentication authentication) {
        String email = authentication.getName();
        return ResponseEntity.ok(assignmentService.returnSubmission(submissionId, email));
    }

    /**
     * Returns a 302 redirect to a short-lived S3 pre-signed URL for a student's submission file.
     */
    @GetMapping("/submission/{submissionId}/download")
    public ResponseEntity<Void> downloadSubmission(@PathVariable Long submissionId) {
        Submission submission = assignmentService.getSubmissionById(submissionId);

        if (submission == null || submission.getFilePath() == null) {
            return ResponseEntity.notFound().build();
        }

        String presignedUrl = fileStorageService.generatePresignedUrl(submission.getFilePath());
        return ResponseEntity.status(HttpStatus.FOUND)
                .header(HttpHeaders.LOCATION, presignedUrl)
                .build();
    }
}
