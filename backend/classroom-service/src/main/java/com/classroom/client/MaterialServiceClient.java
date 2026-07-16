package com.classroom.client;

import org.springframework.cloud.openfeign.FeignClient;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestParam;

import java.util.List;
import java.util.Map;

@FeignClient(name = "material-service")
public interface MaterialServiceClient {

    /**
     * Fetches real material stats (PDFs, Videos) for a set of classrooms.
     * Returns: files, videos
     */
    @GetMapping("/internal/materials/stats")
    Map<String, Long> getMaterialStats(@RequestParam("classroomIds") List<Long> classroomIds);
}
