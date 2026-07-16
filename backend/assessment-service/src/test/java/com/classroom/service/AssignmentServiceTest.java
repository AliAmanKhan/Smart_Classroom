package com.classroom.service;

import com.classroom.client.IamServiceClient;
import com.classroom.dto.AssignmentRequest;
import com.classroom.dto.AssignmentResponse;
import com.classroom.dto.UserDto;
import com.classroom.model.Assignment;
import com.classroom.model.Submission;
import com.classroom.repository.AssignmentRepository;
import com.classroom.repository.SubmissionRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.time.LocalDateTime;
import java.util.Optional;

import static org.assertj.core.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class AssignmentServiceTest {

    @Mock private AssignmentRepository assignmentRepository;
    @Mock private SubmissionRepository submissionRepository;
    @Mock private IamServiceClient iamServiceClient;
    @Mock private FileStorageService fileStorageService;

    @InjectMocks
    private AssignmentService assignmentService;

    private UserDto teacherDto;
    private UserDto studentDto;
    private Assignment testAssignment;

    @BeforeEach
    void setUp() {
        teacherDto = new UserDto(1L, "teacher@example.com", "Teacher", "TEACHER");
        studentDto = new UserDto(2L, "student@example.com", "Student", "STUDENT");

        testAssignment = new Assignment();
        testAssignment.setId(100L);
        testAssignment.setTitle("Homework 1");
        testAssignment.setDescription("Solve problems");
        testAssignment.setDeadline(LocalDateTime.now().plusDays(7));
        testAssignment.setMaxPoints(100);
        testAssignment.setClassroomId(10L);
    }

    // ---- Create Assignment Tests ----

    @Test
    @DisplayName("createAssignment - teacher creates assignment successfully")
    void createAssignment_success() {
        AssignmentRequest request = new AssignmentRequest();
        request.setTitle("Homework 1");
        request.setDescription("Solve problems");
        request.setDeadline(LocalDateTime.now().plusDays(7));
        request.setMaxPoints(100);

        when(iamServiceClient.getUserByEmail("teacher@example.com")).thenReturn(teacherDto);
        when(assignmentRepository.save(any(Assignment.class))).thenAnswer(invocation -> {
            Assignment a = invocation.getArgument(0);
            a.setId(100L);
            return a;
        });

        AssignmentResponse response = assignmentService.createAssignment(10L, request, null, "teacher@example.com");

        assertThat(response.getTitle()).isEqualTo("Homework 1");
        assertThat(response.getClassroomId()).isEqualTo(10L);
        verify(assignmentRepository).save(any(Assignment.class));
    }

    @Test
    @DisplayName("createAssignment - should reject non-teacher users")
    void createAssignment_nonTeacher_throws() {
        AssignmentRequest request = new AssignmentRequest();
        request.setTitle("Test");

        when(iamServiceClient.getUserByEmail("student@example.com")).thenReturn(studentDto);

        assertThatThrownBy(() -> assignmentService.createAssignment(10L, request, null, "student@example.com"))
                .isInstanceOf(RuntimeException.class)
                .hasMessage("Only a teacher can create assignments");
    }

    // ---- Submit Assignment Tests ----

    @Test
    @DisplayName("submitAssignment - on-time submission should have SUBMITTED status")
    void submitAssignment_onTime() {
        // Deadline is in the future
        testAssignment.setDeadline(LocalDateTime.now().plusDays(1));

        when(assignmentRepository.findById(100L)).thenReturn(Optional.of(testAssignment));
        when(iamServiceClient.getUserByEmail("student@example.com")).thenReturn(studentDto);
        when(submissionRepository.findByAssignmentIdAndStudentId(100L, 2L)).thenReturn(Optional.empty());
        when(submissionRepository.save(any(Submission.class))).thenAnswer(invocation -> invocation.getArgument(0));

        Submission result = assignmentService.submitAssignment(100L, null, "My work", "student@example.com");

        assertThat(result.getStatus()).isEqualTo(Submission.SubmissionStatus.SUBMITTED);
        assertThat(result.getComment()).isEqualTo("My work");
        assertThat(result.getStudentId()).isEqualTo(2L);
    }

    @Test
    @DisplayName("submitAssignment - late submission should have LATE status")
    void submitAssignment_late() {
        // Deadline is in the past
        testAssignment.setDeadline(LocalDateTime.now().minusDays(1));

        when(assignmentRepository.findById(100L)).thenReturn(Optional.of(testAssignment));
        when(iamServiceClient.getUserByEmail("student@example.com")).thenReturn(studentDto);
        when(submissionRepository.findByAssignmentIdAndStudentId(100L, 2L)).thenReturn(Optional.empty());
        when(submissionRepository.save(any(Submission.class))).thenAnswer(invocation -> invocation.getArgument(0));

        Submission result = assignmentService.submitAssignment(100L, null, "Late work", "student@example.com");

        assertThat(result.getStatus()).isEqualTo(Submission.SubmissionStatus.LATE);
    }

    // ---- Unsubmit Assignment Tests ----

    @Test
    @DisplayName("unsubmitAssignment - should delete existing submission")
    void unsubmitAssignment_success() {
        Submission existing = new Submission();
        existing.setId(50L);
        existing.setAssignmentId(100L);
        existing.setStudentId(2L);

        when(iamServiceClient.getUserByEmail("student@example.com")).thenReturn(studentDto);
        when(submissionRepository.findByAssignmentIdAndStudentId(100L, 2L)).thenReturn(Optional.of(existing));

        assignmentService.unsubmitAssignment(100L, "student@example.com");

        verify(submissionRepository).delete(existing);
    }

    @Test
    @DisplayName("unsubmitAssignment - should throw when no submission exists")
    void unsubmitAssignment_noSubmission_throws() {
        when(iamServiceClient.getUserByEmail("student@example.com")).thenReturn(studentDto);
        when(submissionRepository.findByAssignmentIdAndStudentId(100L, 2L)).thenReturn(Optional.empty());

        assertThatThrownBy(() -> assignmentService.unsubmitAssignment(100L, "student@example.com"))
                .isInstanceOf(RuntimeException.class)
                .hasMessageContaining("No submission found");
    }
}
