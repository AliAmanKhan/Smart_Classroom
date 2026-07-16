package com.classroom.service;

import com.classroom.client.AssessmentServiceClient;
import com.classroom.client.IamServiceClient;
import com.classroom.client.MaterialServiceClient;
import com.classroom.dto.TelemetryDashboardResponse;
import com.classroom.dto.TelemetryDto;
import com.classroom.dto.UserDto;
import com.classroom.model.Classroom;
import com.classroom.model.XapiStatement;
import com.classroom.repository.ClassroomRepository;
import com.classroom.repository.XapiStatementRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.DayOfWeek;
import java.time.LocalDateTime;
import java.time.format.TextStyle;
import java.time.temporal.TemporalAdjusters;
import java.util.*;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Slf4j
public class TelemetryService {

    private final XapiStatementRepository xapiStatementRepository;
    private final ClassroomRepository classroomRepository;
    private final IamServiceClient iamServiceClient;
    private final AssessmentServiceClient assessmentServiceClient;
    private final MaterialServiceClient materialServiceClient;

    @Transactional
    public void recordStatement(TelemetryDto request, String userEmail) {
        UserDto user = iamServiceClient.getUserByEmail(userEmail);
        if (user == null) return;

        XapiStatement stmt = new XapiStatement();
        stmt.setActorId(user.getId());
        stmt.setActorRole(user.getRole());
        stmt.setVerb(request.getVerb());
        stmt.setObjectType(request.getObjectType());
        stmt.setObjectId(request.getObjectId());
        stmt.setClassroomId(request.getClassroomId());
        xapiStatementRepository.save(stmt);
    }

    public TelemetryDashboardResponse getTeacherDashboard(String teacherEmail) {
        UserDto teacher = iamServiceClient.getUserByEmail(teacherEmail);
        if (teacher == null || !"TEACHER".equalsIgnoreCase(teacher.getRole())) {
            throw new RuntimeException("Only teachers can view the telemetry dashboard");
        }

        // Get all classrooms for this teacher
        List<Classroom> classrooms = classroomRepository.findByTeacherId(teacher.getId());
        List<Long> classroomIds = classrooms.stream().map(Classroom::getId).collect(Collectors.toList());

        if (classroomIds.isEmpty()) {
            return emptyDashboard();
        }

        LocalDateTime oneWeekAgo = LocalDateTime.now().minusDays(7);
        List<XapiStatement> statements = xapiStatementRepository.findByClassroomIdInAndTimestampAfter(classroomIds, oneWeekAgo);

        TelemetryDashboardResponse response = new TelemetryDashboardResponse();
        
        long totalInteractions = statements.size();
        long totalSubmissions = statements.stream().filter(s -> "SUBMITTED".equals(s.getVerb())).count();
        long activeStudents = statements.stream()
                .filter(s -> "STUDENT".equals(s.getActorRole()))
                .map(XapiStatement::getActorId)
                .distinct()
                .count();

        response.setTotalInteractions(totalInteractions);
        response.setTotalSubmissions(totalSubmissions);
        response.setActiveStudents(activeStudents);

        // Activity Data for AreaChart (last 7 days)
        List<Map<String, Object>> activityData = new ArrayList<>();
        Map<DayOfWeek, List<XapiStatement>> byDay = statements.stream()
                .collect(Collectors.groupingBy(s -> s.getTimestamp().getDayOfWeek()));

        for (int i = 6; i >= 0; i--) {
            LocalDateTime day = LocalDateTime.now().minusDays(i);
            DayOfWeek dow = day.getDayOfWeek();
            List<XapiStatement> dayStatements = byDay.getOrDefault(dow, new ArrayList<>());
            
            long submissions = dayStatements.stream().filter(s -> "SUBMITTED".equals(s.getVerb())).count();
            long liveAttendees = dayStatements.stream().filter(s -> "JOINED".equals(s.getVerb()) && "LIVE_CLASS".equals(s.getObjectType())).count();
            
            Map<String, Object> map = new HashMap<>();
            map.put("date", dow.getDisplayName(TextStyle.SHORT, Locale.ENGLISH));
            map.put("Submissions", submissions);
            map.put("Live Attendees", liveAttendees);
            activityData.add(map);
        }
        response.setActivityData(activityData);

        // Material Distribution - real counts from material-service & assessment-service
        List<Map<String, Object>> materialDist = new ArrayList<>();
        long totalAssigned = 0;
        try {
            Map<String, Long> mStats = materialServiceClient.getMaterialStats(classroomIds);
            long files = mStats.getOrDefault("files", 0L);
            long videos = mStats.getOrDefault("videos", 0L);
            materialDist.add(Map.of("name", "File Notes", "value", files > 0 ? files : 0));
            materialDist.add(Map.of("name", "Video Lectures", "value", videos > 0 ? videos : 0));
        } catch (Exception e) {
            log.warn("Could not fetch material stats from material-service: {}", e.getMessage());
            materialDist.add(Map.of("name", "File Notes", "value", 0));
            materialDist.add(Map.of("name", "Video Lectures", "value", 0));
        }

        // Assignment Status — real counts from assessment-service
        List<Map<String, Object>> assignmentComp = new ArrayList<>();
        try {
            Map<Long, Map<String, Long>> stats = assessmentServiceClient.getAssignmentStats(classroomIds);
            long totalExpectedSubmissions = 0;
            long totalSubmitted = 0;
            
            for (Classroom classroom : classrooms) {
                Map<String, Long> cStats = stats.getOrDefault(classroom.getId(), Map.of());
                long cAssignments = cStats.getOrDefault("totalAssignments", 0L);
                long cSubmissions = cStats.getOrDefault("totalSubmissions", 0L);
                
                int studentsInClass = classroom.getStudentIds() != null ? classroom.getStudentIds().size() : 0;
                totalExpectedSubmissions += (cAssignments * studentsInClass);
                totalSubmitted += cSubmissions;
                totalAssigned += cAssignments;
            }
            
            long pending = Math.max(0, totalExpectedSubmissions - totalSubmitted);
            
            assignmentComp.add(Map.of("name", "Submitted", "value", totalSubmitted > 0 ? totalSubmitted : 0));
            assignmentComp.add(Map.of("name", "Pending",   "value", pending > 0   ? pending   : 0));
        } catch (Exception e) {
            log.warn("Could not fetch assignment stats from assessment-service: {}", e.getMessage());
            assignmentComp.add(Map.of("name", "Submitted", "value", totalSubmissions));
            assignmentComp.add(Map.of("name", "Pending", "value", 0L));
        }
        materialDist.add(Map.of("name", "Assignments", "value", totalAssigned > 0 ? totalAssigned : 0));
        response.setMaterialDistribution(materialDist);
        response.setAssignmentCompletion(assignmentComp);

        return response;
    }

    private TelemetryDashboardResponse emptyDashboard() {
        TelemetryDashboardResponse response = new TelemetryDashboardResponse();
        response.setTotalInteractions(0);
        response.setTotalSubmissions(0);
        response.setActiveStudents(0);
        response.setActivityData(new ArrayList<>());
        response.setMaterialDistribution(new ArrayList<>());
        response.setAssignmentCompletion(new ArrayList<>());
        return response;
    }
}
