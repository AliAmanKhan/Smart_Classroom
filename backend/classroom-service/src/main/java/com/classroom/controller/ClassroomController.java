package com.classroom.controller;

import com.classroom.dto.ClassroomRequest;
import com.classroom.dto.ClassroomResponse;
import com.classroom.dto.BulkInviteRequest;
import com.classroom.model.Classroom;
import com.classroom.service.ClassroomService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/classrooms")
@RequiredArgsConstructor
public class ClassroomController {

    private final ClassroomService classroomService;

    @PostMapping
    public ResponseEntity<Classroom> createClassroom(
            @Valid @RequestBody ClassroomRequest request,
            Authentication authentication) {
        String email = authentication.getName();
        return ResponseEntity.ok(classroomService.createClassroom(request, email));
    }

    @GetMapping("/teaching")
    public ResponseEntity<List<ClassroomResponse>> getTeacherClassrooms(Authentication authentication) {
        String email = authentication.getName();
        return ResponseEntity.ok(classroomService.getTeacherClassrooms(email));
    }

    @GetMapping("/enrolled")
    public ResponseEntity<List<ClassroomResponse>> getStudentClassrooms(Authentication authentication) {
        String email = authentication.getName();
        return ResponseEntity.ok(classroomService.getStudentClassrooms(email));
    }

    @PostMapping("/join/code/{classCode}")
    public ResponseEntity<Classroom> joinByCode(
            @PathVariable String classCode,
            Authentication authentication) {
        String email = authentication.getName();
        return ResponseEntity.ok(classroomService.joinClassroomByCode(classCode, email));
    }

    @PostMapping("/join/link/{inviteLink}")
    public ResponseEntity<Classroom> joinByLink(
            @PathVariable String inviteLink,
            Authentication authentication) {
        String email = authentication.getName();
        return ResponseEntity.ok(classroomService.joinClassroomByLink(inviteLink, email));
    }

    @GetMapping("/{id}")
    public ResponseEntity<ClassroomResponse> getClassroom(@PathVariable Long id) {
        return ResponseEntity.ok(classroomService.getClassroom(id));
    }

    @PostMapping("/{id}/invite-bulk")
    public ResponseEntity<Void> inviteUsersBulk(
            @PathVariable Long id,
            @RequestBody BulkInviteRequest request,
            Authentication authentication) {
        String teacherEmail = authentication.getName();
        classroomService.inviteUsersBulk(id, request, teacherEmail);
        return ResponseEntity.ok().build();
    }

    // --- Section Management Endpoints ---

    @PostMapping("/{id}/sections")
    public ResponseEntity<com.classroom.dto.SectionDTO> createSection(
            @PathVariable Long id,
            @RequestBody java.util.Map<String, String> payload,
            Authentication authentication) {
        String name = payload.get("name");
        if (name == null || name.isBlank()) {
            throw new IllegalArgumentException("Section name is required");
        }
        return ResponseEntity.ok(classroomService.createSection(id, name, authentication.getName()));
    }

    @GetMapping("/{id}/sections")
    public ResponseEntity<List<com.classroom.dto.SectionDTO>> getSections(@PathVariable Long id) {
        return ResponseEntity.ok(classroomService.getSections(id));
    }

    @PutMapping("/{id}/sections/{sectionId}/students")
    public ResponseEntity<com.classroom.dto.SectionDTO> assignStudentsToSection(
            @PathVariable Long id,
            @PathVariable Long sectionId,
            @RequestBody java.util.Set<Long> studentIds,
            Authentication authentication) {
        return ResponseEntity.ok(classroomService.assignStudentsToSection(id, sectionId, studentIds, authentication.getName()));
    }
}
