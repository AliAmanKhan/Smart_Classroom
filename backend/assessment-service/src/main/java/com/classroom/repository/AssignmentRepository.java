package com.classroom.repository;

import com.classroom.model.Assignment;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface AssignmentRepository extends JpaRepository<Assignment, Long> {
    List<Assignment> findByClassroomId(Long classroomId);
    List<Assignment> findByClassroomIdOrderByDeadlineAsc(Long classroomId);
    List<Assignment> findByClassroomIdIn(List<Long> classroomIds);
}
