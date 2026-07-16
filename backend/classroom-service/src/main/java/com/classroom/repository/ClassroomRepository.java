package com.classroom.repository;

import com.classroom.model.Classroom;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface ClassroomRepository extends JpaRepository<Classroom, Long> {
    List<Classroom> findByTeacherId(Long teacherId);
    Optional<Classroom> findByClassCode(String classCode);
    Optional<Classroom> findByInviteLink(String inviteLink);
    List<Classroom> findByStudentIdsContaining(Long studentId);
}
