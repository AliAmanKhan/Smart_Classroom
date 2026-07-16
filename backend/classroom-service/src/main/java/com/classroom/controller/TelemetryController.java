package com.classroom.controller;

import com.classroom.dto.TelemetryDashboardResponse;
import com.classroom.dto.TelemetryDto;
import com.classroom.service.TelemetryService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/telemetry")
@RequiredArgsConstructor
public class TelemetryController {

    private final TelemetryService telemetryService;

    @PostMapping
    public ResponseEntity<Void> recordStatement(
            @RequestBody TelemetryDto request,
            Authentication authentication) {
        telemetryService.recordStatement(request, authentication.getName());
        return ResponseEntity.ok().build();
    }

    @GetMapping("/dashboard")
    public ResponseEntity<TelemetryDashboardResponse> getDashboard(
            Authentication authentication) {
        return ResponseEntity.ok(telemetryService.getTeacherDashboard(authentication.getName()));
    }
}
