package com.classroom.dto;

import lombok.Data;
import java.util.List;
import java.util.Map;

@Data
public class TelemetryDashboardResponse {
    private long totalInteractions;
    private long totalSubmissions;
    private long activeStudents;
    private List<Map<String, Object>> activityData;
    private List<Map<String, Object>> materialDistribution;
    private List<Map<String, Object>> assignmentCompletion;
}
