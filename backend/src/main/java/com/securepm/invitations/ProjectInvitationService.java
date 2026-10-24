package com.securepm.invitations;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.securepm.auth.Role;
import com.securepm.auth.User;
import com.securepm.common.ConflictException;
import com.securepm.invitations.dto.ProjectInvitationDTO;
import com.securepm.notifications.Notification;
import com.securepm.notifications.NotificationService;
import com.securepm.notifications.NotificationType;
import com.securepm.projects.Project;
import com.securepm.projects.ProjectService;
import jakarta.enterprise.context.ApplicationScoped;
import jakarta.inject.Inject;
import jakarta.persistence.EntityManager;
import jakarta.transaction.Transactional;

import java.time.LocalDateTime;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

@ApplicationScoped
public class ProjectInvitationService {

    @Inject
    EntityManager em;

    @Inject
    ProjectService projectService;

    @Inject
    NotificationService notificationService;

    @Inject
    ObjectMapper objectMapper;

    @Transactional
    public ProjectInvitationDTO createInvitation(Long projectId, Long targetUserId, User currentUser) {
        Project project = Project.findById(projectId);
        if (project == null || project.archived) {
            throw new IllegalStateException("Project not found or archived");
        }
        if (project.completed) {
            throw new IllegalStateException("Cannot invite members to a completed project");
        }
        if (!projectService.isLeadOrAdmin(projectId, currentUser)) {
            throw new SecurityException("Access denied: Project lead or ADMIN role required");
        }
        User targetUser = User.findById(targetUserId);
        if (targetUser == null || !targetUser.active) {
            throw new IllegalStateException("User not found or inactive");
        }
        if (projectService.isEnrolledMember(projectId, targetUserId)) {
            throw new IllegalStateException("User is already a project member");
        }

        ProjectInvitation existingPending = ProjectInvitation.find(
                "projectId = ?1 and invitedUserId = ?2 and status = ?3",
                projectId, targetUserId, InvitationStatus.PENDING).firstResult();

        if (existingPending != null) {
            if (existingPending.isExpired()) {
                existingPending.status = InvitationStatus.EXPIRED;
                existingPending.persist();
            } else {
                throw new ConflictException("A pending invitation already exists for this user");
            }
        }

        ProjectInvitation invitation = new ProjectInvitation();
        invitation.projectId = projectId;
        invitation.invitedUserId = targetUserId;
        invitation.invitedBy = currentUser.id;
        invitation.status = InvitationStatus.PENDING;
        invitation.expiresAt = LocalDateTime.now().plusDays(7);
        invitation.persist();

        Map<String, Object> data = new HashMap<>();
        data.put("invitationId", invitation.id);
        data.put("projectId", project.id);
        data.put("projectName", project.name);
        data.put("projectKey", project.projectKey);
        data.put("invitedBy", currentUser.id);
        data.put("invitedByUsername", currentUser.username);

        String dataJson;
        try {
            dataJson = objectMapper.writeValueAsString(data);
        } catch (JsonProcessingException e) {
            dataJson = "{}";
        }

        boolean isLeadInvite = project.pendingLeadId != null && project.pendingLeadId.equals(targetUserId);
        String title = isLeadInvite
                ? "Sub-project Lead Invitation: " + project.name
                : "Project Invitation: " + project.name;
        String message = isLeadInvite
                ? "@" + currentUser.username + " invited you to be the Project Lead for sub-project " + project.name + " (" + project.projectKey + ")"
                : "@" + currentUser.username + " invited you to join " + project.name + " (" + project.projectKey + ")";
        notificationService.createNotification(targetUserId, NotificationType.PROJECT_INVITE, title, message, dataJson);

        return ProjectInvitationMapper.toDTO(invitation);
    }

    @Transactional
    public List<ProjectInvitationDTO> listProjectInvitations(Long projectId, User currentUser) {
        Project project = Project.findById(projectId);
        if (project == null || project.archived) {
            throw new IllegalStateException("Project not found or archived");
        }
        if (!projectService.isMember(projectId, currentUser)) {
            throw new SecurityException("Access denied: Project membership or ADMIN role required");
        }

        List<ProjectInvitation> list = ProjectInvitation.find("projectId = ?1 ORDER BY createdAt DESC", projectId).list();
        for (ProjectInvitation inv : list) {
            if (inv.isExpired() && inv.status == InvitationStatus.PENDING) {
                inv.status = InvitationStatus.EXPIRED;
                inv.persist();
            }
        }

        return list.stream().map(ProjectInvitationMapper::toDTO).collect(Collectors.toList());
    }

    @Transactional
    public ProjectInvitationDTO cancelInvitation(Long projectId, Long invitationId, User currentUser) {
        Project project = Project.findById(projectId);
        if (project == null || project.archived) {
            throw new IllegalStateException("Project not found or archived");
        }
        if (!projectService.isLeadOrAdmin(projectId, currentUser)) {
            throw new SecurityException("Access denied: Project lead or ADMIN role required");
        }

        ProjectInvitation invitation = ProjectInvitation.findById(invitationId);
        if (invitation == null || !invitation.projectId.equals(projectId)) {
            throw new IllegalStateException("Invitation not found");
        }
        if (invitation.status != InvitationStatus.PENDING) {
            throw new IllegalStateException("Cannot cancel an invitation that is already " + invitation.status);
        }

        if (project.pendingLeadId != null && project.pendingLeadId.equals(invitation.invitedUserId)) {
            project.pendingLeadId = null;
            project.persist();
        }

        invitation.status = InvitationStatus.CANCELED;
        invitation.persist();

        return ProjectInvitationMapper.toDTO(invitation);
    }

    @Transactional
    public ProjectInvitationDTO acceptInvitation(Long invitationId, User currentUser) {
        ProjectInvitation invitation = ProjectInvitation.findById(invitationId);
        if (invitation == null) {
            throw new IllegalStateException("Invitation not found");
        }
        if (!invitation.invitedUserId.equals(currentUser.id)) {
            throw new SecurityException("Access denied: You are not the recipient of this invitation");
        }
        if (invitation.isExpired()) {
            invitation.status = InvitationStatus.EXPIRED;
            invitation.persist();
            throw new IllegalStateException("Invitation has expired");
        }
        if (invitation.status == InvitationStatus.ACCEPTED) {
            markInvitationNotificationStatus(currentUser.id, invitationId, InvitationStatus.ACCEPTED);
            return ProjectInvitationMapper.toDTO(invitation);
        }
        if (invitation.status != InvitationStatus.PENDING) {
            throw new IllegalStateException("Invitation is no longer pending (status: " + invitation.status + ")");
        }

        Project project = Project.findById(invitation.projectId);
        if (project == null || project.archived) {
            throw new IllegalStateException("Project not found or archived");
        }

        if (!projectService.isEnrolledMember(invitation.projectId, currentUser.id)) {
            em.createNativeQuery("INSERT INTO project_members (project_id, user_id) VALUES (?, ?)")
                    .setParameter(1, invitation.projectId)
                    .setParameter(2, currentUser.id)
                    .executeUpdate();
        }

        if (project.pendingLeadId != null && project.pendingLeadId.equals(currentUser.id)) {
            project.leadId = currentUser.id;
            project.pendingLeadId = null;
            project.persist();
        }

        invitation.status = InvitationStatus.ACCEPTED;
        invitation.persist();

        markInvitationNotificationStatus(currentUser.id, invitationId, InvitationStatus.ACCEPTED);

        return ProjectInvitationMapper.toDTO(invitation);
    }

    @Transactional
    public ProjectInvitationDTO declineInvitation(Long invitationId, User currentUser) {
        ProjectInvitation invitation = ProjectInvitation.findById(invitationId);
        if (invitation == null) {
            throw new IllegalStateException("Invitation not found");
        }
        if (!invitation.invitedUserId.equals(currentUser.id)) {
            throw new SecurityException("Access denied: You are not the recipient of this invitation");
        }
        if (invitation.isExpired()) {
            invitation.status = InvitationStatus.EXPIRED;
            invitation.persist();
            throw new IllegalStateException("Invitation has expired");
        }
        if (invitation.status == InvitationStatus.DECLINED) {
            markInvitationNotificationStatus(currentUser.id, invitationId, InvitationStatus.DECLINED);
            return ProjectInvitationMapper.toDTO(invitation);
        }
        if (invitation.status != InvitationStatus.PENDING) {
            throw new IllegalStateException("Invitation is no longer pending (status: " + invitation.status + ")");
        }

        Project project = Project.findById(invitation.projectId);
        if (project != null && project.pendingLeadId != null && project.pendingLeadId.equals(currentUser.id)) {
            project.pendingLeadId = null;
            project.persist();
        }

        invitation.status = InvitationStatus.DECLINED;
        invitation.persist();

        markInvitationNotificationStatus(currentUser.id, invitationId, InvitationStatus.DECLINED);

        return ProjectInvitationMapper.toDTO(invitation);
    }

    private void markInvitationNotificationStatus(Long userId, Long invitationId, InvitationStatus status) {
        List<Notification> notifications = Notification.find("recipientId = ?1", userId).list();
        for (Notification n : notifications) {
            if (n.dataJson != null && n.dataJson.contains("\"invitationId\":" + invitationId)) {
                n.isRead = true;
                try {
                    @SuppressWarnings("unchecked")
                    Map<String, Object> map = objectMapper.readValue(n.dataJson, Map.class);
                    map.put("status", status.name());
                    n.dataJson = objectMapper.writeValueAsString(map);
                } catch (Exception ignored) {
                }
                n.persist();
            }
        }
    }
}
