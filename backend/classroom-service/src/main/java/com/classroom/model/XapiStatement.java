package com.classroom.model;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.Setter;
import lombok.NoArgsConstructor;
import lombok.AllArgsConstructor;
import org.springframework.data.annotation.CreatedDate;
import org.springframework.data.jpa.domain.support.AuditingEntityListener;

import java.time.LocalDateTime;

@Entity
@Table(name = "telemetry_xapi_statements")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@EntityListeners(AuditingEntityListener.class)
public class XapiStatement {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false)
    private Long actorId; // The user ID

    private String actorRole; // e.g. STUDENT, TEACHER

    @Column(nullable = false)
    private String verb; // e.g. VIEWED, SUBMITTED, COMPLETED, JOINED

    @Column(nullable = false)
    private String objectType; // e.g. MATERIAL, ASSIGNMENT, LIVE_CLASS, SYSTEM

    private String objectId; // The ID of the material, assignment, etc.

    @Column(nullable = false)
    private Long classroomId; // Contextual classroom

    @CreatedDate
    @Column(nullable = false, updatable = false)
    private LocalDateTime timestamp;
}
