package com.securepm.invitations;

import com.securepm.auth.User;
import com.securepm.invitations.dto.ProjectInvitationDTO;
import com.securepm.projects.Project;

public class ProjectInvitationMapper {

    public static ProjectInvitationDTO toDTO(ProjectInvitation invitation) {
        if (invitation == null) {
            return null;
        }
        ProjectInvitationDTO dto = new ProjectInvitationDTO();
        dto.id = invitation.id;
        dto.projectId = invitation.projectId;
        dto.invitedUserId = invitation.invitedUserId;
        dto.invitedBy = invitation.invitedBy;
        dto.status = invitation.status;
        dto.expiresAt = invitation.expiresAt;
        dto.expired = invitation.isExpired();
        dto.createdAt = invitation.createdAt;

        Project project = Project.findById(invitation.projectId);
        if (project != null) {
            dto.projectName = project.name;
            dto.projectKey = project.projectKey;
        }

        User invitedUser = User.findById(invitation.invitedUserId);
        if (invitedUser != null) {
            dto.invitedUsername = invitedUser.username;
            dto.invitedUserFullName = invitedUser.fullName;
        }

        User inviter = User.findById(invitation.invitedBy);
        if (inviter != null) {
            dto.invitedByUsername = inviter.username;
        }

        return dto;
    }
}
