package com.securepm.invitations.dto;

import com.securepm.invitations.InvitationStatus;
import java.time.LocalDateTime;

public class ProjectInvitationDTO {
    public Long id;
    public Long projectId;
    public String projectName;
    public String projectKey;
    public Long invitedUserId;
    public String invitedUsername;
    public String invitedUserFullName;
    public Long invitedBy;
    public String invitedByUsername;
    public InvitationStatus status;
    public LocalDateTime expiresAt;
    public boolean expired;
    public LocalDateTime createdAt;
}
