package com.classroom.dto;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;
import java.util.Set;
import java.util.List;

@Data @NoArgsConstructor @AllArgsConstructor
public class ClassroomResponse {
    private Long id;
    private String name;
    private String description;
    private String classCode;
    private UserDto teacher;
    private int studentCount;
    private String inviteLink;
    private Set<UserDto> students;
    private List<UserDto> coTeachers;

    public ClassroomResponse(Long id, String name, String description, String classCode, UserDto teacher, int studentCount, String inviteLink, List<UserDto> coTeachers) {
        this.id = id;
        this.name = name;
        this.description = description;
        this.classCode = classCode;
        this.teacher = teacher;
        this.studentCount = studentCount;
        this.inviteLink = inviteLink;
        this.coTeachers = coTeachers;
        this.students = null;
    }
}
