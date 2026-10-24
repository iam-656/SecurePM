package com.securepm.projects;

import java.time.LocalDateTime;
import java.util.List;

public class ProjectDTO {

    public Long id;
    public String name;
    public String description;
    public String projectKey;
    public Long createdBy;
    public String createdByName;
    public Long leadId;
    public String leadName;
    public Long pendingLeadId;
    public String pendingLeadName;
    public Long parentProjectId;
    public String parentProjectName;
    public String parentProjectKey;
    public Long parentProjectCreatedBy;
    public boolean isSubproject;
    public int subprojectCount;
    public List<UserSummaryDTO> memberSummaries;
    public List<UserSummaryDTO> inheritedMemberSummaries;
    public boolean archived;
    public boolean completed;
    public LocalDateTime completedAt;
    public Long completedBy;
    public String completedByName;
    public String dependencyType = "NO_DEPENDENCY";
    public List<Long> prerequisiteIds = new java.util.ArrayList<>();
    public List<String> prerequisiteNames = new java.util.ArrayList<>();
    public boolean isBlocked = false;
    public List<String> blockingPrerequisiteNames = new java.util.ArrayList<>();
    public LocalDateTime createdAt;
    public LocalDateTime updatedAt;

    public ProjectDTO() {
    }

    public ProjectDTO(Project project) {
        this.id = project.id;
        this.name = project.name;
        this.description = project.description;
        this.projectKey = project.projectKey;
        this.createdBy = project.createdBy;
        this.leadId = project.leadId != null ? project.leadId : project.createdBy;
        this.parentProjectId = project.parentProjectId;
        this.isSubproject = project.parentProjectId != null;
        this.archived = project.archived;
        this.completed = project.completed;
        this.completedAt = project.completedAt;
        this.completedBy = project.completedBy;
        this.dependencyType = project.dependencyType != null ? project.dependencyType : "NO_DEPENDENCY";
        this.createdAt = project.createdAt;
        this.updatedAt = project.updatedAt;
    }
}
