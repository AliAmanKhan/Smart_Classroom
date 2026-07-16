package com.classroom.repository;

import com.classroom.model.StudyMaterial;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface StudyMaterialRepository extends JpaRepository<StudyMaterial, Long> {
    List<StudyMaterial> findByClassroomId(Long classroomId);
    List<StudyMaterial> findByClassroomIdIn(List<Long> classroomIds);
}
