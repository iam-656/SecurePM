package com.securepm.projects;

import io.quarkus.hibernate.orm.panache.PanacheEntity;
import jakarta.persistence.*;
import java.time.LocalDate;
import java.time.LocalDateTime;

@Entity
@Table(name = "tasks")
@SequenceGenerator(name = "tasks_id_seq", sequenceName = "tasks_id_seq", allocationSize = 1)
public class Task extends PanacheEntity {

    @Column(name = "project_id", nullable = false)
    public Long projectId;

    @Column(nullable = false, length = 255)
    public String title;

    @Column(columnDefinition = "TEXT")
    public String description;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    public TaskStatus status = TaskStatus.TODO;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    public TaskPriority priority = TaskPriority.MEDIUM;

    @Column(name = "assignee_id")
    public Long assigneeId;

    @Column(name = "due_date")
    public LocalDate dueDate;

    @Column(name = "created_by", nullable = false)
    public Long createdBy;

    @Column(name = "updated_by", nullable = false)
    public Long updatedBy;

    @Version
    public Long version = 1L;

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