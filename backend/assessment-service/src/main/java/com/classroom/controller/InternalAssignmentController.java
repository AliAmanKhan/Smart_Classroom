package com.classroom.controller;

import com.classroom.model.Assignment;
import com.classroom.repository.AssignmentRepository;
import com.classroom.repository.SubmissionRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

/**
 * Internal-only endpoints consumed by other microservices via Feign.
 * Not exposed through the API Gateway to external clients.
 */
@RestController
@RequestMapping("/internal/assignments")
@RequiredArgsConstructor
public class InternalAssignmentController {

    private final AssignmentRepository assignmentRepository;
    private final SubmissionRepository submissionRepository;

    /**
     * Returns submitted + total expected counts grouped by classroom ID.
     */
    @GetMapping("/stats")
    public Map<Long, Map<String, Long>> getAssignmentStats(@RequestParam List<Long> classroomIds) {
        if (classroomIds == null || classroomIds.isEmpty()) {
            return Map.of();
        }

        List<Assignment> assignments = assignmentRepository.findByClassroomIdIn(classroomIds);
        if (assignments.isEmpty()) {
            return Map.of();
        }

        List<Long> assignmentIds = assignments.stream().map(Assignment::getId).toList();
        List<com.classroom.model.Submission> submissions = submissionRepository.findByAssignmentIdIn(assignmentIds);

        Map<Long, Map<String, Long>> result = new java.util.HashMap<>();

        // Group assignments by classroom
        Map<Long, List<Assignment>> assignmentsByClassroom = assignments.stream()
                .collect(java.util.stream.Collectors.groupingBy(Assignment::getClassroomId));

        // Group submissions by assignment
        Map<Long, Long> submissionsCountByAssignment = submissions.stream()
                .collect(java.util.stream.Collectors.groupingBy(com.classroom.model.Submission::getAssignmentId, java.util.stream.Collectors.counting()));

        for (Long classroomId : classroomIds) {
            List<Assignment> classAssignments = assignmentsByClassroom.getOrDefault(classroomId, List.of());
            long totalAssignments = classAssignments.size();
            long totalSubmissions = 0;
            
            for (Assignment a : classAssignments) {
                totalSubmissions += submissionsCountByAssignment.getOrDefault(a.getId(), 0L);
            }
            
            result.put(classroomId, Map.of(
                    "totalAssignments", totalAssignments,
                    "totalSubmissions", totalSubmissions
            ));
        }

        return result;
    }
}
