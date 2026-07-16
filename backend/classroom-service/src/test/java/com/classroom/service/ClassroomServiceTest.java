package com.classroom.service;

import com.classroom.client.IamServiceClient;
import com.classroom.dto.ClassroomRequest;
import com.classroom.dto.ClassroomResponse;
import com.classroom.dto.UserDto;
import com.classroom.model.Classroom;
import com.classroom.repository.ClassroomRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.util.HashSet;
import java.util.List;
import java.util.Optional;

import static org.assertj.core.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class ClassroomServiceTest {

    @Mock private ClassroomRepository classroomRepository;
    @Mock private com.classroom.repository.ClassSectionRepository classSectionRepository;
    @Mock private IamServiceClient iamServiceClient;

    @InjectMocks
    private ClassroomService classroomService;

    private UserDto teacherDto;
    private UserDto studentDto;
    private Classroom testClassroom;

    @BeforeEach
    void setUp() {
        teacherDto = new UserDto(1L, "teacher@example.com", "Teacher", "TEACHER");
        studentDto = new UserDto(2L, "student@example.com", "Student", "STUDENT");

        testClassroom = new Classroom();
        testClassroom.setId(10L);
        testClassroom.setName("Math 101");
        testClassroom.setDescription("Intro to Math");
        testClassroom.setTeacherId(1L);
        testClassroom.setClassCode("ABC12345");
        testClassroom.setInviteLink("invite-uuid");
        testClassroom.setStudentIds(new HashSet<>());
        testClassroom.setCoTeacherIds(new HashSet<>());
    }

    // ---- Create Classroom Tests ----

    @Test
    @DisplayName("createClassroom - teacher creates classroom successfully")
    void createClassroom_success() {
        ClassroomRequest request = new ClassroomRequest();
        request.setName("Math 101");
        request.setDescription("Intro to Math");

        when(iamServiceClient.getUserByEmail("teacher@example.com")).thenReturn(teacherDto);
        when(classroomRepository.save(any(Classroom.class))).thenAnswer(invocation -> {
            Classroom c = invocation.getArgument(0);
            c.setId(10L);
            return c;
        });

        Classroom result = classroomService.createClassroom(request, "teacher@example.com");

        assertThat(result.getName()).isEqualTo("Math 101");
        assertThat(result.getTeacherId()).isEqualTo(1L);
        verify(classroomRepository).save(any(Classroom.class));
    }

    @Test
    @DisplayName("createClassroom - should reject non-teacher users")
    void createClassroom_nonTeacher_throws() {
        ClassroomRequest request = new ClassroomRequest();
        request.setName("Test");

        when(iamServiceClient.getUserByEmail("student@example.com")).thenReturn(studentDto);

        assertThatThrownBy(() -> classroomService.createClassroom(request, "student@example.com"))
                .isInstanceOf(RuntimeException.class)
                .hasMessage("Only teachers can create classrooms");
    }

    // ---- Join Classroom Tests ----

    @Test
    @DisplayName("joinClassroomByCode - student joins successfully")
    void joinByCode_success() {
        when(iamServiceClient.getUserByEmail("student@example.com")).thenReturn(studentDto);
        when(classroomRepository.findByClassCode("ABC12345")).thenReturn(Optional.of(testClassroom));
        when(classroomRepository.save(any(Classroom.class))).thenReturn(testClassroom);

        Classroom result = classroomService.joinClassroomByCode("ABC12345", "student@example.com");

        assertThat(result.getStudentIds()).contains(2L);
        verify(classroomRepository).save(testClassroom);
    }

    @Test
    @DisplayName("joinClassroomByCode - should throw for invalid class code")
    void joinByCode_invalidCode_throws() {
        when(iamServiceClient.getUserByEmail("student@example.com")).thenReturn(studentDto);
        when(classroomRepository.findByClassCode("INVALID")).thenReturn(Optional.empty());

        assertThatThrownBy(() -> classroomService.joinClassroomByCode("INVALID", "student@example.com"))
                .isInstanceOf(RuntimeException.class)
                .hasMessageContaining("No classroom exists with code");
    }

    // ---- Get Teacher Classrooms Test ----

    @Test
    @DisplayName("getTeacherClassrooms - returns classrooms for teacher")
    void getTeacherClassrooms_success() {
        when(iamServiceClient.getUserByEmail("teacher@example.com")).thenReturn(teacherDto);
        when(classroomRepository.findByTeacherId(1L)).thenReturn(List.of(testClassroom));

        List<ClassroomResponse> results = classroomService.getTeacherClassrooms("teacher@example.com");

        assertThat(results).hasSize(1);
        assertThat(results.get(0).getName()).isEqualTo("Math 101");
    }
}
