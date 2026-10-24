package com.securepm.projects;

import com.securepm.auth.User;
import java.util.Collections;
import java.util.List;
import java.util.stream.Collectors;

public class ProjectMapper {

    public static ProjectDTO toDTO(
            Project project,
            User createdBy,
            User lead,
            User pendingLead,
            User completedBy,
            Project parentProject,
            int subprojectCount,
            List<User> members,
            List<User> inheritedMembers) {
        ProjectDTO dto = new ProjectDTO(project);
        if (createdBy != null) {
            dto.createdByName = createdBy.fullName != null ? createdBy.fullName : createdBy.username;
        }
        if (completedBy != null) {
            dto.completedByName = completedBy.fullName != null ? completedBy.fullName : completedBy.username;
        }
        if (lead != null) {
            dto.leadName = lead.fullName != null ? lead.fullName : lead.username;
        } else if (createdBy != null) {
            dto.leadName = createdBy.fullName != null ? createdBy.fullName : createdBy.username;
        }
        if (project.pendingLeadId != null) {
            dto.pendingLeadId = project.pendingLeadId;
            if (pendingLead != null) {
                dto.pendingLeadName = pendingLead.fullName != null ? pendingLead.fullName : pendingLead.username;
            }
        }
        if (parentProject != null) {
            dto.parentProjectId = parentProject.id;
            dto.parentProjectName = parentProject.name;
            dto.parentProjectKey = parentProject.projectKey;
            dto.parentProjectCreatedBy = parentProject.createdBy;
            dto.isSubproject = true;
        } else {
            dto.isSubproject = false;
        }
        dto.subprojectCount = subprojectCount;
        if (members != null) {
            dto.memberSummaries = members.stream()
                    .map(UserSummaryDTO::new)
                    .collect(Collectors.toList());
        } else {
            dto.memberSummaries = Collections.emptyList();
        }
        if (inheritedMembers != null) {
            dto.inheritedMemberSummaries = inheritedMembers.stream()
                    .map(UserSummaryDTO::new)
                    .collect(Collectors.toList());
        } else {
            dto.inheritedMemberSummaries = Collections.emptyList();
        }
        return dto;
    }
}
