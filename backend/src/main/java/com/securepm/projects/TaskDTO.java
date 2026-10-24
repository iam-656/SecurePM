package com.securepm.projects;

import java.time.LocalDate;
import java.time.LocalDateTime;

public class TaskDTO {

    public Long id;
    public Long projectId;
    public String title;
    public String description;
    public String status;
    public String priority;
    public Long assigneeId;
    public String assigneeName;
    public LocalDate dueDate;
    public Long createdBy;
    public String createdByName;
    public Long version;
    public LocalDateTime createdAt;
    public LocalDateTime updatedAt;

    public TaskDTO() {
    }

    public TaskDTO(Task task) {
        this.id = task.id;
        this.projectId = task.projectId;
        this.title = task.title;
        this.description = task.description;
        this.status = task.status != null ? task.status.name() : null;
        this.priority = task.priority != null ? task.priority.name() : null;
        this.assigneeId = task.assigneeId;
        this.dueDate = task.dueDate;
        this.createdBy = task.createdBy;
        this.version = task.version;
        this.createdAt = task.createdAt;
        this.updatedAt = task.updatedAt;
    }
}