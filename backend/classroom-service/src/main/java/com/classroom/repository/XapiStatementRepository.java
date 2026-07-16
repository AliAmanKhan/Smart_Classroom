package com.classroom.repository;

import com.classroom.model.XapiStatement;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.time.LocalDateTime;
import java.util.List;

@Repository
public interface XapiStatementRepository extends JpaRepository<XapiStatement, Long> {
    List<XapiStatement> findByClassroomId(Long classroomId);
    List<XapiStatement> findByActorId(Long actorId);
    List<XapiStatement> findByClassroomIdAndTimestampAfter(Long classroomId, LocalDateTime date);
    List<XapiStatement> findByTimestampAfter(LocalDateTime date);
    List<XapiStatement> findByClassroomIdInAndTimestampAfter(List<Long> classroomIds, LocalDateTime date);
}
