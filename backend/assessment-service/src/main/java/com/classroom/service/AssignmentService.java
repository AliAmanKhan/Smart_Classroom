package com.classroom.service;

import com.classroom.client.IamServiceClient;
import com.classroom.dto.AssignmentRequest;
import com.classroom.dto.AssignmentResponse;
import com.classroom.dto.UserDto;
import com.classroom.model.Assignment;
import com.classroom.model.Submission;
import com.classroom.repository.AssignmentRepository;
import com.classroom.repository.SubmissionRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.cache.annotation.CacheEvict;
import org.springframework.cache.annotation.Cacheable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;

import java.time.LocalDateTime;
import java.util.List;

@Service
@RequiredArgsConstructor
public class AssignmentService {

    private final AssignmentRepository assignmentRepository;
    private final SubmissionRepository submissionRepository;
    private final IamServiceClient iamServiceClient;
    private final FileStorageService fileStorageService;

    private AssignmentResponse toResponse(Assignment assignment) {
        return new AssignmentResponse(
                assignment.getId(),
                assignment.getTitle(),
                assignment.getDescription(),
                assignment.getDeadline(),
                assignment.getMaxPoints(),
                assignment.getClassroomId(),
                null, // classroomName: not fetched in list view; fetch via classroom-service if needed
                assignment.isPublished(),
                assignment.getAttachmentName(),
                assignment.getSectionId(),
                assignment.getCreatedAt(),
                assignment.getUpdatedAt()
        );
    }

    @Transactional
    @CacheEvict(value = "classroom-assignments", key = "#classroomId")
    public AssignmentResponse createAssignment(Long classroomId, AssignmentRequest request, MultipartFile file, String teacherEmail) {
        // Authorization: verify teacher exists via IAM; classroom-service owns classroom auth checks.
        UserDto teacher = iamServiceClient.getUserByEmail(teacherEmail);
        if (teacher == null || !"TEACHER".equalsIgnoreCase(teacher.getRole())) {
            throw new RuntimeException("Only a teacher can create assignments");
        }

        Assignment assignment = new Assignment();
        assignment.setTitle(request.getTitle());
        assignment.setDescription(request.getDescription());
        assignment.setDeadline(request.getDeadline());
        assignment.setMaxPoints(request.getMaxPoints());
        assignment.setClassroomId(classroomId);
        assignment.setSectionId(request.getSectionId());

        if (file != null && !file.isEmpty()) {
            String filePath = fileStorageService.storeFile(file, "assignments");
            assignment.setAttachmentPath(filePath);
            assignment.setAttachmentName(file.getOriginalFilename());
        }

        Assignment saved = assignmentRepository.save(assignment);
        return toResponse(saved);
    }

    @Cacheable(value = "classroom-assignments", key = "#classroomId")
    public List<AssignmentResponse> getClassroomAssignments(Long classroomId) {
        return assignmentRepository.findByClassroomIdOrderByDeadlineAsc(classroomId).stream().map(this::toResponse).collect(java.util.stream.Collectors.toList());
    }
    
    @Transactional
    @CacheEvict(value = "classroom-assignments", key = "#result.classroomId", condition = "#result != null")
    public Assignment extendDeadline(Long assignmentId, LocalDateTime newDeadline, String teacherEmail) {
        Assignment assignment = assignmentRepository.findById(assignmentId)
                .orElseThrow(() -> new RuntimeException("Assignment not found. It may have been deleted."));
        assignment.setDeadline(newDeadline);
        return assignmentRepository.save(assignment);
    }

    @Transactional
    @CacheEvict(value = "assignment-submissions", key = "#assignmentId")
    public Submission submitAssignment(Long assignmentId, MultipartFile file, String comment, String studentEmail) {
        Assignment assignment = assignmentRepository.findById(assignmentId)
                .orElseThrow(() -> new RuntimeException("Assignment not found. It may have been deleted."));

        UserDto student = iamServiceClient.getUserByEmail(studentEmail);
        if (student == null) {
            throw new RuntimeException("Student not found");
        }

        Submission submission = submissionRepository.findByAssignmentIdAndStudentId(assignmentId, student.getId())
                .orElse(new Submission());

        submission.setAssignmentId(assignmentId);
        submission.setStudentId(student.getId());
        submission.setComment(comment);

        if (file != null && !file.isEmpty()) {
            String filePath = fileStorageService.storeFile(file, "submissions");
            submission.setFilePath(filePath);
            submission.setFileName(file.getOriginalFilename());
        }

        submission.setStatus(LocalDateTime.now().isAfter(assignment.getDeadline())
                ? Submission.SubmissionStatus.LATE
                : Submission.SubmissionStatus.SUBMITTED);

        return submissionRepository.save(submission);
    }

    @Cacheable(value = "assignment-submissions", key = "#assignmentId")
    public List<Submission> getAssignmentSubmissions(Long assignmentId) {
        return submissionRepository.findByAssignmentId(assignmentId);
    }

    public Submission getMySubmission(Long assignmentId, String studentEmail) {
        UserDto student = iamServiceClient.getUserByEmail(studentEmail);
        if (student == null) return null;
        return submissionRepository.findByAssignmentIdAndStudentId(assignmentId, student.getId()).orElse(null);
    }

    @Transactional
    @CacheEvict(value = "assignment-submissions", key = "#assignmentId")
    public void unsubmitAssignment(Long assignmentId, String studentEmail) {
        UserDto student = iamServiceClient.getUserByEmail(studentEmail);
        if (student == null) throw new RuntimeException("Student not found");

        Submission submission = submissionRepository.findByAssignmentIdAndStudentId(assignmentId, student.getId())
                .orElseThrow(() -> new RuntimeException("No submission found to withdraw. You haven't submitted this assignment yet."));

        if (submission.getStatus() == Submission.SubmissionStatus.GRADED) {
            throw new RuntimeException("Cannot unsubmit a graded assignment. Please contact your teacher if you need to resubmit.");
        }

        if (submission.getFilePath() != null) {
            try { fileStorageService.deleteFile(submission.getFilePath()); } catch (Exception ignored) {}
        }
        submissionRepository.delete(submission);
    }

    @Transactional
    @CacheEvict(value = "assignment-submissions", key = "#result.assignmentId")
    public Submission gradeSubmission(Long submissionId, Integer points, String teacherFeedback, String teacherEmail) {
        UserDto teacher = iamServiceClient.getUserByEmail(teacherEmail);
        if (teacher == null || !"TEACHER".equalsIgnoreCase(teacher.getRole())) {
            throw new RuntimeException("Only a teacher can grade submissions");
        }

        Submission submission = submissionRepository.findById(submissionId)
                .orElseThrow(() -> new RuntimeException("Submission not found"));

        Assignment assignment = assignmentRepository.findById(submission.getAssignmentId())
                .orElseThrow(() -> new RuntimeException("Assignment not found"));

        if (points != null && assignment.getMaxPoints() != null && points > assignment.getMaxPoints()) {
            throw new RuntimeException("Points (" + points + ") cannot exceed the maximum (" + assignment.getMaxPoints() + ")");
        }

        submission.setPoints(points);
        submission.setTeacherFeedback(teacherFeedback);
        submission.setStatus(Submission.SubmissionStatus.GRADED);
        submission.setGradedAt(LocalDateTime.now());
        return submissionRepository.save(submission);
    }

    @Transactional
    @CacheEvict(value = "assignment-submissions", key = "#result.assignmentId")
    public Submission returnSubmission(Long submissionId, String teacherEmail) {
        UserDto teacher = iamServiceClient.getUserByEmail(teacherEmail);
        if (teacher == null || !"TEACHER".equalsIgnoreCase(teacher.getRole())) {
            throw new RuntimeException("Only a teacher can return submissions");
        }

        Submission submission = submissionRepository.findById(submissionId)
                .orElseThrow(() -> new RuntimeException("Submission not found"));

        submission.setStatus(Submission.SubmissionStatus.RETURNED);
        submission.setPoints(null);
        submission.setTeacherFeedback(null);
        submission.setGradedAt(null);
        return submissionRepository.save(submission);
    }

    public Assignment getAssignment(Long id) {
        return assignmentRepository.findById(id).orElseThrow(() -> new RuntimeException("Assignment not found"));
    }

    public Submission getSubmissionById(Long submissionId) {
        return submissionRepository.findById(submissionId).orElse(null);
    }

    @Transactional
    @org.springframework.cache.annotation.Caching(evict = {
            @CacheEvict(value = "classroom-assignments", key = "#result.classroomId", condition = "#result != null"),
            @CacheEvict(value = "assignment-submissions", key = "#result.id", condition = "#result != null")
    })
    public Assignment deleteAssignment(Long assignmentId, String teacherEmail) {
        Assignment assignment = assignmentRepository.findById(assignmentId)
                .orElseThrow(() -> new RuntimeException("Assignment not found"));

        Long classroomId = assignment.getClassroomId();

        List<Submission> submissions = submissionRepository.findByAssignmentId(assignmentId);
        for (Submission submission : submissions) {
            if (submission.getFilePath() != null) {
                try { fileStorageService.deleteFile(submission.getFilePath()); } catch (Exception ignored) {}
            }
        }

        assignmentRepository.delete(assignment);
        return assignment;
    }

    @Transactional
    @CacheEvict(value = "classroom-assignments", key = "#result.classroomId", condition = "#result != null")
    public AssignmentResponse updateAssignment(Long assignmentId, AssignmentRequest request, MultipartFile file, String teacherEmail) {
        Assignment assignment = assignmentRepository.findById(assignmentId)
                .orElseThrow(() -> new RuntimeException("Assignment not found"));

        assignment.setTitle(request.getTitle());
        assignment.setDescription(request.getDescription());
        assignment.setDeadline(request.getDeadline());
        assignment.setMaxPoints(request.getMaxPoints());
        assignment.setSectionId(request.getSectionId());

        if (file != null && !file.isEmpty()) {
            if (assignment.getAttachmentPath() != null) {
                fileStorageService.deleteFile(assignment.getAttachmentPath());
            }
            assignment.setAttachmentPath(fileStorageService.storeFile(file, "assignments"));
            assignment.setAttachmentName(file.getOriginalFilename());
        }

        Assignment updated = assignmentRepository.save(assignment);
        return toResponse(updated);
    }

    @CacheEvict(value = "classroom-assignments", key = "#classroomId")
    public void evictClassroomAssignmentsCache(Long classroomId) {}

    @CacheEvict(value = "assignment-submissions", key = "#assignmentId")
    public void evictAssignmentSubmissionsCache(Long assignmentId) {}
}
