package com.classroom.service;

import com.classroom.client.IamServiceClient;
import com.classroom.dto.ClassroomRequest;
import com.classroom.dto.ClassroomResponse;
import com.classroom.dto.UserDto;
import com.classroom.model.Classroom;
import com.classroom.repository.ClassroomRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.cache.annotation.CacheEvict;
import org.springframework.cache.annotation.Cacheable;
import org.springframework.cache.annotation.Caching;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.ArrayList;
import java.util.HashSet;
import java.util.List;
import java.util.Set;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class ClassroomService {

    private final ClassroomRepository classroomRepository;
    private final com.classroom.repository.ClassSectionRepository classSectionRepository;
    private final IamServiceClient iamServiceClient;

    @Transactional
    @Caching(evict = {
        @CacheEvict(value = "teacher-classrooms", allEntries = true),
        @CacheEvict(value = "student-classrooms", allEntries = true)
    })
    public Classroom createClassroom(ClassroomRequest request, String teacherEmail) {
        UserDto teacher = iamServiceClient.getUserByEmail(teacherEmail);
        if (teacher == null) {
            throw new RuntimeException("Teacher not found");
        }

        if (!"TEACHER".equalsIgnoreCase(teacher.getRole())) {
            throw new RuntimeException("Only teachers can create classrooms");
        }

        Classroom classroom = new Classroom();
        classroom.setName(request.getName());
        classroom.setDescription(request.getDescription());
        classroom.setTeacherId(teacher.getId());

        return classroomRepository.save(classroom);
    }

    @Cacheable(value = "teacher-classrooms", key = "#teacherEmail")
    public List<ClassroomResponse> getTeacherClassrooms(String teacherEmail) {
        UserDto teacher = iamServiceClient.getUserByEmail(teacherEmail);
        if (teacher == null) {
            throw new RuntimeException("Teacher not found");
        }
        
        return classroomRepository.findByTeacherId(teacher.getId()).stream()
                .map(c -> toResponse(c, teacher))
                .collect(Collectors.toList());
    }

    @Cacheable(value = "student-classrooms", key = "#studentEmail")
    public List<ClassroomResponse> getStudentClassrooms(String studentEmail) {
        UserDto student = iamServiceClient.getUserByEmail(studentEmail);
        if (student == null) {
            throw new RuntimeException("Student not found");
        }
        
        return classroomRepository.findByStudentIdsContaining(student.getId()).stream()
                .map(this::toResponseWithFetchedTeacher)
                .collect(Collectors.toList());
    }

    @Transactional
    @CacheEvict(value = "student-classrooms", key = "#studentEmail")
    public Classroom joinClassroomByCode(String classCode, String studentEmail) {
        UserDto student = iamServiceClient.getUserByEmail(studentEmail);
        if (student == null || !"STUDENT".equalsIgnoreCase(student.getRole())) {
            throw new RuntimeException("Only students can join classrooms");
        }

        Classroom classroom = classroomRepository.findByClassCode(classCode)
                .orElseThrow(() -> new RuntimeException("No classroom exists with code '" + classCode + "'. Please double-check the class code."));

        classroom.getStudentIds().add(student.getId());
        Classroom saved = classroomRepository.save(classroom);
        evictClassroomById(saved.getId());
        return saved;
    }

    @Transactional
    @CacheEvict(value = "student-classrooms", key = "#studentEmail")
    public Classroom joinClassroomByLink(String inviteLink, String studentEmail) {
        UserDto student = iamServiceClient.getUserByEmail(studentEmail);
        if (student == null || !"STUDENT".equalsIgnoreCase(student.getRole())) {
            throw new RuntimeException("Only students can join classrooms");
        }

        Classroom classroom = classroomRepository.findByInviteLink(inviteLink)
                .orElseThrow(() -> new RuntimeException("This invite link is invalid or has expired. No classroom found."));

        classroom.getStudentIds().add(student.getId());
        Classroom saved = classroomRepository.save(classroom);
        evictClassroomById(saved.getId());
        return saved;
    }

    @Transactional(readOnly = true)
    @Cacheable(value = "classrooms", key = "#id")
    public ClassroomResponse getClassroom(Long id) {
        return classroomRepository.findById(id)
                .map(this::toFullResponse)
                .orElseThrow(() -> new RuntimeException("Classroom not found. It may have been deleted."));
    }

    @Transactional
    @Caching(evict = {
        @CacheEvict(value = "classrooms",          key = "#classroomId"),
        @CacheEvict(value = "teacher-classrooms",  allEntries = true),
        @CacheEvict(value = "student-classrooms",  allEntries = true)
    })
    public void inviteUsersBulk(Long classroomId, com.classroom.dto.BulkInviteRequest request, String teacherEmail) {
        Classroom classroom = classroomRepository.findById(classroomId)
                .orElseThrow(() -> new RuntimeException("Classroom not found. It may have been deleted."));

        UserDto inviter = iamServiceClient.getUserByEmail(teacherEmail);
        
        if (!classroom.getTeacherId().equals(inviter.getId()) &&
            !classroom.getCoTeacherIds().contains(inviter.getId())) {
            throw new RuntimeException("Only the classroom teachers can invite users");
        }

        for (String email : request.getEmails()) {
            try {
                UserDto user = iamServiceClient.getUserByEmail(email.trim());
                if (user == null) continue;

                if ("TEACHER".equalsIgnoreCase(request.getRole()) && "TEACHER".equalsIgnoreCase(user.getRole())) {
                    classroom.getCoTeacherIds().add(user.getId());
                } else if ("STUDENT".equalsIgnoreCase(request.getRole()) && "STUDENT".equalsIgnoreCase(user.getRole())) {
                    classroom.getStudentIds().add(user.getId());
                }
            } catch (Exception e) {
                // Ignore missing users
            }
        }
        classroomRepository.save(classroom);
    }

    @CacheEvict(value = "classrooms", key = "#id")
    public void evictClassroomById(Long id) {}

    // --- Section Management ---

    @Transactional
    public com.classroom.dto.SectionDTO createSection(Long classroomId, String name, String teacherEmail) {
        Classroom classroom = classroomRepository.findById(classroomId)
                .orElseThrow(() -> new RuntimeException("Classroom not found. It may have been deleted."));
        
        UserDto teacher = iamServiceClient.getUserByEmail(teacherEmail);
        if (!classroom.getTeacherId().equals(teacher.getId()) && !classroom.getCoTeacherIds().contains(teacher.getId())) {
            throw new RuntimeException("Only classroom teachers can create sections");
        }

        com.classroom.model.ClassSection section = new com.classroom.model.ClassSection();
        section.setName(name);
        section.setClassroom(classroom);
        com.classroom.model.ClassSection saved = classSectionRepository.save(section);
        
        return toSectionDTO(saved);
    }

    public List<com.classroom.dto.SectionDTO> getSections(Long classroomId) {
        return classSectionRepository.findByClassroomId(classroomId).stream()
                .map(this::toSectionDTO)
                .collect(Collectors.toList());
    }

    @Transactional
    public com.classroom.dto.SectionDTO assignStudentsToSection(Long classroomId, Long sectionId, Set<Long> studentIds, String teacherEmail) {
        Classroom classroom = classroomRepository.findById(classroomId)
                .orElseThrow(() -> new RuntimeException("Classroom not found. It may have been deleted."));
        
        UserDto teacher = iamServiceClient.getUserByEmail(teacherEmail);
        if (!classroom.getTeacherId().equals(teacher.getId()) && !classroom.getCoTeacherIds().contains(teacher.getId())) {
            throw new RuntimeException("Only classroom teachers can assign students to sections");
        }

        com.classroom.model.ClassSection section = classSectionRepository.findById(sectionId)
                .orElseThrow(() -> new RuntimeException("Section not found. It may have been deleted."));

        if (!section.getClassroom().getId().equals(classroomId)) {
            throw new RuntimeException("Section does not belong to this classroom");
        }

        // Only allow assigning students who are actually in the classroom
        Set<Long> validStudents = new HashSet<>();
        for (Long sId : studentIds) {
            if (classroom.getStudentIds().contains(sId)) {
                validStudents.add(sId);
            }
        }

        section.setStudentIds(validStudents);
        return toSectionDTO(classSectionRepository.save(section));
    }

    private com.classroom.dto.SectionDTO toSectionDTO(com.classroom.model.ClassSection s) {
        com.classroom.dto.SectionDTO dto = new com.classroom.dto.SectionDTO();
        dto.setId(s.getId());
        dto.setName(s.getName());
        dto.setClassroomId(s.getClassroom().getId());
        dto.setStudentIds(new HashSet<>(s.getStudentIds()));
        dto.setCreatedAt(s.getCreatedAt());
        dto.setUpdatedAt(s.getUpdatedAt());
        return dto;
    }

    // --- Helper Methods for Distributed Joins ---
    
    private ClassroomResponse toResponse(Classroom c, UserDto teacher) {
        return new ClassroomResponse(
                c.getId(), c.getName(), c.getDescription(), c.getClassCode(),
                teacher, c.getStudentIds().size(), c.getInviteLink(),
                new ArrayList<>() // Omitting coteachers in list view for brevity
        );
    }
    
    private ClassroomResponse toResponseWithFetchedTeacher(Classroom c) {
        UserDto teacher = iamServiceClient.getUserById(c.getTeacherId());
        return toResponse(c, teacher);
    }
    
    private ClassroomResponse toFullResponse(Classroom c) {
        UserDto teacher = iamServiceClient.getUserById(c.getTeacherId());
        
        List<UserDto> coTeachers = c.getCoTeacherIds().isEmpty() ? 
            new ArrayList<>() : iamServiceClient.getUsersByIds(new ArrayList<>(c.getCoTeacherIds()));
            
        Set<UserDto> students = c.getStudentIds().isEmpty() ? 
            new HashSet<>() : new HashSet<>(iamServiceClient.getUsersByIds(new ArrayList<>(c.getStudentIds())));
            
        ClassroomResponse resp = new ClassroomResponse(
                c.getId(), c.getName(), c.getDescription(), c.getClassCode(),
                teacher, c.getStudentIds().size(), c.getInviteLink(),
                coTeachers
        );
        resp.setStudents(students);
        return resp;
    }
}
