package com.classroom.client;

import org.springframework.cloud.openfeign.FeignClient;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestParam;

import java.util.List;
import java.util.Map;

@FeignClient(name = "assessment-service")
public interface AssessmentServiceClient {

    /**
     * Fetches real assignment submission stats for a set of classrooms.
     * Returns a map of Classroom ID -> {totalAssignments, totalSubmissions}
     */
    @GetMapping("/internal/assignments/stats")
    Map<Long, Map<String, Long>> getAssignmentStats(@RequestParam("classroomIds") List<Long> classroomIds);
}
