package com.securepm.projects;

import io.quarkus.hibernate.orm.panache.PanacheEntity;
import jakarta.persistence.*;
import java.time.LocalDateTime;

@Entity
@Table(name = "projects")
@SequenceGenerator(name = "projects_id_seq", sequenceName = "projects_id_seq", allocationSize = 1)
public class Project extends PanacheEntity {

    @Column(nullable = false, length = 100)
    public String name;

    @Column(columnDefinition = "TEXT")
    public String description;

    @Column(name = "project_key", nullable = false, unique = true, length = 10)
    public String projectKey;

    @Column(name = "created_by", nullable = false)
    public Long createdBy;

    @Column(name = "lead_id")
    public Long leadId;

    @Column(name = "pending_lead_id")
    public Long pendingLeadId;

    @Column(name = "parent_project_id")
    public Long parentProjectId;

    @Column(nullable = false)
    public boolean archived = false;

    @Column(nullable = false)
    public boolean completed = false;

    @Column(name = "completed_at")
    public LocalDateTime completedAt;

    @Column(name = "completed_by")
    public Long completedBy;

    @Column(name = "dependency_type", nullable = false, length = 32)
    public String dependencyType = "NO_DEPENDENCY";

    @Column(name = "created_at")
    public LocalDateTime createdAt;

    @Column(name = "updated_at")
    public LocalDateTime updatedAt;

    @PrePersist
    void onCreate() {
        createdAt = LocalDateTime.now();
        updatedAt = LocalDateTime.now();
    }

    @PreUpdate
    void onUpdate() {
        updatedAt = LocalDateTime.now();
    }
}
