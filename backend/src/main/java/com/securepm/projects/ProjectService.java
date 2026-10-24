package com.securepm.projects;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.securepm.auth.Role;
import com.securepm.auth.User;
import com.securepm.invitations.ProjectInvitationService;
import com.securepm.notifications.NotificationService;
import com.securepm.notifications.NotificationType;
import jakarta.enterprise.context.ApplicationScoped;
import jakarta.inject.Inject;
import jakarta.persistence.EntityManager;
import jakarta.transaction.Transactional;
import java.time.LocalDateTime;
import java.util.Collections;
import java.util.HashMap;
import java.util.HashSet;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.stream.Collectors;

@ApplicationScoped
public class ProjectService {

    @Inject
    EntityManager em;

    @Inject
    ProjectInvitationService invitationService;

    @Inject
    NotificationService notificationService;

    @Inject
    ObjectMapper objectMapper;

    @Transactional
    public ProjectDTO createProject(CreateProjectRequest dto, User currentUser) {
        if (Project.find("projectKey", dto.projectKey).firstResult() != null) {
            throw new IllegalStateException("Project key already exists");
        }
        Project project = new Project();
        project.name = dto.name;
        project.description = dto.description;
        project.projectKey = dto.projectKey;
        project.createdBy = currentUser.id;
        project.archived = false;

        boolean isDesignateNonMember = false;
        User designatedLeadUser = null;

        if (dto.parentProjectId != null) {
            Project parent = Project.findById(dto.parentProjectId);
            if (parent == null || parent.archived) {
                throw new IllegalStateException("Parent project not found or archived");
            }
            if (parent.completed) {
                throw new IllegalStateException("Cannot create a sub-project under a completed project");
            }
            if (parent.parentProjectId != null) {
                throw new IllegalStateException("Cannot create a sub-project under another sub-project. Single-level nesting only.");
            }
            if (!isLeadOrAdmin(parent.id, currentUser)) {
                throw new SecurityException("Access denied: Project lead or ADMIN role required to create sub-projects");
            }
            project.parentProjectId = parent.id;

            // Check if first sub-project exception applies
            Number existingSubprojectCount = (Number) em.createNativeQuery(
                    "SELECT COUNT(*) FROM projects WHERE parent_project_id = ?1 AND archived = false")
                    .setParameter(1, parent.id)
                    .getSingleResult();

            if (existingSubprojectCount.longValue() == 0) {
                // First subproject under parent: strictly NO_DEPENDENCY
                project.dependencyType = "NO_DEPENDENCY";
            } else if ("START_AFTER".equalsIgnoreCase(dto.dependencyType)) {
                if (dto.prerequisiteIds == null || dto.prerequisiteIds.isEmpty()) {
                    throw new IllegalStateException("At least one prerequisite sub-project must be selected for START_AFTER dependency");
                }
                project.dependencyType = "START_AFTER";
                for (Long prereqId : dto.prerequisiteIds) {
                    Project prereq = Project.findById(prereqId);
                    if (prereq == null || prereq.archived || !parent.id.equals(prereq.parentProjectId)) {
                        throw new IllegalStateException("Invalid prerequisite sub-project: " + prereqId);
                    }
                }
            } else {
                project.dependencyType = "NO_DEPENDENCY";
            }

            if (dto.leadId != null && !dto.leadId.equals(currentUser.id)) {
                User designatedLead = User.findById(dto.leadId);
                if (designatedLead == null || !designatedLead.active) {
                    throw new IllegalStateException("Designated lead user not found or inactive");
                }
                // Check if designated lead is already an active member of parent project
                if (isMember(parent.id, designatedLead)) {
                    project.leadId = designatedLead.id;
                } else {
                    // Non-member: creator acts as active lead; user is invited and set as pending lead
                    project.leadId = currentUser.id;
                    project.pendingLeadId = designatedLead.id;
                    isDesignateNonMember = true;
                    designatedLeadUser = designatedLead;
                }
            } else {
                project.leadId = currentUser.id;
            }
        } else {
            project.parentProjectId = null;
            project.leadId = currentUser.id;
            project.dependencyType = "NO_DEPENDENCY";
        }

        project.persist();

        // Persist dependencies if START_AFTER
        if ("START_AFTER".equalsIgnoreCase(project.dependencyType) && dto.prerequisiteIds != null) {
            Set<Long> uniquePrereqs = new HashSet<>(dto.prerequisiteIds);
            for (Long prereqId : uniquePrereqs) {
                SubprojectDependency dep = new SubprojectDependency();
                dep.subprojectId = project.id;
                dep.prerequisiteId = prereqId;
                dep.persist();
            }
        }

        // Automatically enroll the active lead and creator as project members
        em.createNativeQuery(
                "INSERT INTO project_members (project_id, user_id) VALUES (?, ?)")
                .setParameter(1, project.id)
                .setParameter(2, project.leadId)
                .executeUpdate();

        // If creator is different from designated lead, also enroll creator
        if (!currentUser.id.equals(project.leadId)) {
            em.createNativeQuery(
                    "INSERT INTO project_members (project_id, user_id) VALUES (?, ?) ON CONFLICT DO NOTHING")
                    .setParameter(1, project.id)
                    .setParameter(2, currentUser.id)
                    .executeUpdate();
        }

        if (isDesignateNonMember && designatedLeadUser != null) {
            invitationService.createInvitation(project.id, designatedLeadUser.id, currentUser);
        }

        return toDTOWithDetails(project);
    }

    public List<ProjectDTO> listProjects(User currentUser) {
        return listProjects(currentUser, false);
    }

    public List<ProjectDTO> listProjects(User currentUser, boolean includeSubprojects) {
        List<Project> projects;
        if (currentUser.role == Role.ADMIN) {
            String sql = "SELECT p.* FROM projects p WHERE p.archived = false " +
                    (includeSubprojects ? "" : "AND p.parent_project_id IS NULL ") +
                    "ORDER BY p.created_at DESC";
            projects = em.createNativeQuery(sql, Project.class).getResultList();
        } else {
            String sql;
            if (includeSubprojects) {
                sql = "SELECT DISTINCT p.* FROM projects p " +
                        "LEFT JOIN project_members pm ON pm.project_id = p.id AND pm.user_id = ?1 " +
                        "LEFT JOIN projects parent ON p.parent_project_id = parent.id " +
                        "WHERE p.archived = false AND (" +
                        "  p.created_by = ?1 OR p.lead_id = ?1 OR pm.user_id = ?1 " +
                        "  OR (p.parent_project_id IS NOT NULL AND parent.archived = false AND (" +
                        "    parent.created_by = ?1 OR parent.lead_id = ?1 OR EXISTS (" +
                        "      SELECT 1 FROM project_members parent_pm WHERE parent_pm.project_id = parent.id AND parent_pm.user_id = ?1" +
                        "    )" +
                        "  ))" +
                        ") ORDER BY p.created_at DESC";
            } else {
                sql = "SELECT DISTINCT p.* FROM projects p " +
                        "LEFT JOIN project_members pm ON pm.project_id = p.id AND pm.user_id = ?1 " +
                        "LEFT JOIN projects parent ON p.parent_project_id = parent.id " +
                        "WHERE p.archived = false AND (" +
                        "  (p.parent_project_id IS NULL AND (p.created_by = ?1 OR p.lead_id = ?1 OR pm.user_id = ?1)) " +
                        "  OR (" +
                        "    p.parent_project_id IS NOT NULL AND (p.created_by = ?1 OR p.lead_id = ?1 OR pm.user_id = ?1) " +
                        "    AND (parent.id IS NULL OR (" +
                        "      (parent.created_by IS DISTINCT FROM ?1) " +
                        "      AND (parent.lead_id IS DISTINCT FROM ?1) " +
                        "      AND NOT EXISTS (" +
                        "        SELECT 1 FROM project_members parent_pm WHERE parent_pm.project_id = parent.id AND parent_pm.user_id = ?1" +
                        "      )" +
                        "    ))" +
                        "  )" +
                        ") ORDER BY p.created_at DESC";
            }
            projects = em.createNativeQuery(sql, Project.class)
                    .setParameter(1, currentUser.id)
                    .getResultList();
        }
        return projects.stream()
                .map(this::toDTOWithDetails)
                .collect(Collectors.toList());
    }

    public List<ProjectDTO> listSubprojects(Long parentId, User currentUser) {
        Project parent = Project.findById(parentId);
        if (parent == null || parent.archived) {
            throw new IllegalStateException("Parent project not found");
        }
        if (!isMember(parentId, currentUser)) {
            throw new SecurityException("Access denied: not a member of parent project");
        }
        List<Project> subprojects = em.createNativeQuery(
                "SELECT p.* FROM projects p WHERE p.parent_project_id = ?1 AND p.archived = false ORDER BY p.created_at DESC",
                Project.class)
                .setParameter(1, parentId)
                .getResultList();
        return subprojects.stream()
                .map(this::toDTOWithDetails)
                .collect(Collectors.toList());
    }

    public ProjectDTO getProject(Long id, User currentUser) {
        Project project = Project.findById(id);
        if (project == null || project.archived) {
            throw new IllegalStateException("Project not found");
        }
        if (!isMember(id, currentUser)) {
            throw new SecurityException("Access denied: not a member");
        }
        return toDTOWithDetails(project);
    }

    @Transactional
    public ProjectDTO updateProject(Long id, UpdateProjectRequest dto, User currentUser) {
        Project project = Project.findById(id);
        if (project == null || project.archived) {
            throw new IllegalStateException("Project not found");
        }
        if (project.completed) {
            throw new IllegalStateException("Cannot modify a completed project. Please reopen the project first.");
        }
        if (!isLeadOrAdmin(id, currentUser)) {
            throw new SecurityException("Access denied: Project lead or ADMIN role required");
        }
        if (dto.name != null) {
            project.name = dto.name;
        }
        if (dto.description != null) {
            project.description = dto.description;
        }
        if (dto.archived != null) {
            project.archived = dto.archived;
        }
        if (dto.leadId != null && project.parentProjectId != null) {
            boolean isCreatorOrParentLeadOrAdmin = currentUser.role == Role.ADMIN ||
                    (project.createdBy != null && project.createdBy.equals(currentUser.id)) ||
                    isParentLeadOrAdmin(project.parentProjectId, currentUser);
            if (!isCreatorOrParentLeadOrAdmin) {
                throw new SecurityException("Access denied: Only project creator, parent lead, or ADMIN can change sub-project lead");
            }
            User newLead = User.findById(dto.leadId);
            if (newLead == null || !newLead.active) {
                throw new IllegalStateException("Selected lead user not found or inactive");
            }

            if (!newLead.id.equals(project.leadId)) {
                if (newLead.id.equals(currentUser.id) || isMember(project.parentProjectId, newLead)) {
                    project.leadId = newLead.id;
                    project.pendingLeadId = null;
                    em.createNativeQuery(
                            "INSERT INTO project_members (project_id, user_id) VALUES (?, ?) ON CONFLICT DO NOTHING")
                            .setParameter(1, project.id)
                            .setParameter(2, newLead.id)
                            .executeUpdate();
                } else {
                    // Non-member: set pending lead and send invitation
                    project.pendingLeadId = newLead.id;
                    invitationService.createInvitation(project.id, newLead.id, currentUser);
                }
            }
        }

        if (project.parentProjectId != null && (dto.dependencyType != null || dto.prerequisiteIds != null)) {
            Project parent = Project.findById(project.parentProjectId);
            boolean isParentCreator = parent != null && parent.createdBy != null && parent.createdBy.equals(currentUser.id);
            boolean isAdmin = currentUser.role == Role.ADMIN;
            if (!isParentCreator && !isAdmin) {
                throw new SecurityException("Access denied: Only main project creator or ADMIN can modify sub-project dependencies");
            }

            String newDependencyType = dto.dependencyType != null ? dto.dependencyType : project.dependencyType;
            if ("START_AFTER".equalsIgnoreCase(newDependencyType)) {
                List<Long> targetPrereqIds = dto.prerequisiteIds;
                if (targetPrereqIds == null || targetPrereqIds.isEmpty()) {
                    throw new IllegalStateException("At least one prerequisite sub-project must be selected for START_AFTER dependency");
                }
                Set<Long> uniquePrereqs = new HashSet<>(targetPrereqIds);
                for (Long prereqId : uniquePrereqs) {
                    if (prereqId.equals(project.id)) {
                        throw new IllegalStateException("A sub-project cannot depend on itself");
                    }
                    Project prereq = Project.findById(prereqId);
                    if (prereq == null || prereq.archived || !project.parentProjectId.equals(prereq.parentProjectId)) {
                        throw new IllegalStateException("Invalid prerequisite sub-project: " + prereqId);
                    }
                }
                if (wouldCreateCycle(project.id, uniquePrereqs)) {
                    throw new IllegalStateException("Circular dependency detected between sub-projects");
                }
                project.dependencyType = "START_AFTER";
                em.createNativeQuery("DELETE FROM subproject_dependencies WHERE subproject_id = ?1")
                        .setParameter(1, project.id)
                        .executeUpdate();
                for (Long prereqId : uniquePrereqs) {
                    SubprojectDependency dep = new SubprojectDependency();
                    dep.subprojectId = project.id;
                    dep.prerequisiteId = prereqId;
                    dep.persist();
                }
            } else if ("NO_DEPENDENCY".equalsIgnoreCase(newDependencyType)) {
                project.dependencyType = "NO_DEPENDENCY";
                em.createNativeQuery("DELETE FROM subproject_dependencies WHERE subproject_id = ?1")
                        .setParameter(1, project.id)
                        .executeUpdate();
            }
        }
        return toDTOWithDetails(project);
    }

    @Transactional
    public void archiveProject(Long id, User currentUser) {
        Project project = Project.findById(id);
        if (project == null || project.archived) {
            throw new IllegalStateException("Project not found");
        }
        if (project.completed) {
            throw new IllegalStateException("Cannot archive a completed project. Please reopen the project first.");
        }
        if (!isLeadOrAdmin(id, currentUser)) {
            throw new SecurityException("Access denied: Project lead or ADMIN role required");
        }
        project.archived = true;
    }

    public boolean isEnrolledMember(Long projectId, Long userId) {
        Number count = (Number) em.createNativeQuery(
                "SELECT COUNT(*) FROM project_members WHERE project_id = ? AND user_id = ?")
                .setParameter(1, projectId)
                .setParameter(2, userId)
                .getSingleResult();
        return count.longValue() > 0;
    }

    @Transactional
    public ProjectDTO addMember(Long projectId, Long userId, User currentUser) {
        Project project = Project.findById(projectId);
        if (project == null || project.archived) {
            throw new IllegalStateException("Project not found");
        }
        if (project.completed) {
            throw new IllegalStateException("Cannot modify members of a completed project. Please reopen the project first.");
        }
        if (!isLeadOrAdmin(projectId, currentUser)) {
            throw new SecurityException("Access denied: Project lead or ADMIN role required");
        }
        User member = User.findById(userId);
        if (member == null || !member.active) {
            throw new IllegalStateException("User not found or inactive");
        }
        if (isEnrolledMember(projectId, userId)) {
            throw new IllegalStateException("User is already a member");
        }
        em.createNativeQuery(
                "INSERT INTO project_members (project_id, user_id) VALUES (?, ?)")
                .setParameter(1, projectId)
                .setParameter(2, userId)
                .executeUpdate();
        return toDTOWithDetails(project);
    }

    @Transactional
    public ProjectDTO removeMember(Long projectId, Long userId, User currentUser) {
        Project project = Project.findById(projectId);
        if (project == null || project.archived) {
            throw new IllegalStateException("Project not found");
        }
        if (project.completed) {
            throw new IllegalStateException("Cannot modify members of a completed project. Please reopen the project first.");
        }
        if (!isLeadOrAdmin(projectId, currentUser)) {
            throw new SecurityException("Access denied: Project lead or ADMIN role required");
        }
        em.createNativeQuery(
                "DELETE FROM project_members WHERE project_id = ? AND user_id = ?")
                .setParameter(1, projectId)
                .setParameter(2, userId)
                .executeUpdate();
        return toDTOWithDetails(project);
    }

    public boolean isLeadOrAdmin(Long projectId, User user) {
        if (user == null) {
            return false;
        }
        if (user.role == Role.ADMIN) {
            return true;
        }
        Project project = Project.findById(projectId);
        if (project == null || project.archived) {
            return false;
        }
        if ((project.leadId != null && project.leadId.equals(user.id)) ||
            (project.createdBy != null && project.createdBy.equals(user.id))) {
            return true;
        }
        if (project.parentProjectId != null) {
            Project parent = Project.findById(project.parentProjectId);
            if (parent != null && !parent.archived) {
                if ((parent.leadId != null && parent.leadId.equals(user.id)) ||
                    (parent.createdBy != null && parent.createdBy.equals(user.id))) {
                    return true;
                }
            }
        }
        return false;
    }

    public boolean isMember(Long projectId, User user) {
        if (user == null) {
            return false;
        }
        if (user.role == Role.ADMIN) {
            return true;
        }
        Project project = Project.findById(projectId);
        if (project == null || project.archived) {
            return false;
        }
        if ((project.leadId != null && project.leadId.equals(user.id)) ||
            (project.createdBy != null && project.createdBy.equals(user.id))) {
            return true;
        }
        if (isEnrolledMember(projectId, user.id)) {
            return true;
        }
        // If this is a sub-project, check if user is a member/lead/creator of the parent project
        if (project.parentProjectId != null) {
            return isMember(project.parentProjectId, user);
        }
        return false;
    }

    public boolean isParentLeadOrAdmin(Long parentProjectId, User user) {
        if (user == null) {
            return false;
        }
        if (user.role == Role.ADMIN) {
            return true;
        }
        Project parent = Project.findById(parentProjectId);
        if (parent == null || parent.archived) {
            return false;
        }
        return (parent.leadId != null && parent.leadId.equals(user.id)) ||
               (parent.createdBy != null && parent.createdBy.equals(user.id));
    }

    @Transactional
    public ProjectDTO completeProject(Long projectId, User currentUser) {
        Project project = Project.findById(projectId);
        if (project == null || project.archived) {
            throw new IllegalStateException("Project not found or archived");
        }
        if (project.completed) {
            throw new IllegalStateException("Project is already completed");
        }

        Project parent = project.parentProjectId != null ? Project.findById(project.parentProjectId) : null;

        // Authority Check
        if (project.parentProjectId != null) {
            // Sub-project: callable by sub-project lead, main project creator, or ADMIN
            boolean isSubLead = project.leadId != null && project.leadId.equals(currentUser.id);
            boolean isParentCreator = parent != null && parent.createdBy != null && parent.createdBy.equals(currentUser.id);
            boolean isAdmin = currentUser.role == Role.ADMIN;
            if (!isSubLead && !isParentCreator && !isAdmin) {
                throw new SecurityException("Access denied: Only sub-project lead, parent project creator, or ADMIN can mark sub-project as completed");
            }

            // Quality Gate 0: Sub-project cannot be completed if it is blocked by incomplete prerequisites!
            if (isSubprojectBlocked(project.id)) {
                throw new IllegalStateException("Cannot mark sub-project as completed: Prerequisite sub-projects have not been completed yet");
            }

            // Quality Gate: all tasks in sub-project must be DONE
            Number unfinishedTasks = (Number) em.createNativeQuery(
                    "SELECT COUNT(*) FROM tasks WHERE project_id = ? AND status != 'DONE'")
                    .setParameter(1, project.id)
                    .getSingleResult();
            if (unfinishedTasks.longValue() > 0) {
                throw new IllegalStateException("Cannot mark sub-project as completed: " + unfinishedTasks.longValue() + " task(s) are not finished yet");
            }
        } else {
            // Root project: callable by main project creator or ADMIN
            boolean isCreator = project.createdBy != null && project.createdBy.equals(currentUser.id);
            boolean isAdmin = currentUser.role == Role.ADMIN;
            if (!isCreator && !isAdmin) {
                throw new SecurityException("Access denied: Only project creator or ADMIN can mark project as completed");
            }

            // Quality Gate 1: all direct tasks in main project must be DONE
            Number unfinishedTasks = (Number) em.createNativeQuery(
                    "SELECT COUNT(*) FROM tasks WHERE project_id = ? AND status != 'DONE'")
                    .setParameter(1, project.id)
                    .getSingleResult();
            if (unfinishedTasks.longValue() > 0) {
                throw new IllegalStateException("Cannot mark project as completed: " + unfinishedTasks.longValue() + " direct task(s) are not finished yet");
            }

            // Quality Gate 2: all child sub-projects must be completed == true
            Number unfinishedSubprojects = (Number) em.createNativeQuery(
                    "SELECT COUNT(*) FROM projects WHERE parent_project_id = ? AND archived = false AND completed = false")
                    .setParameter(1, project.id)
                    .getSingleResult();
            if (unfinishedSubprojects.longValue() > 0) {
                throw new IllegalStateException("Cannot mark project as completed: " + unfinishedSubprojects.longValue() + " sub-project(s) are not completed yet");
            }
        }

        project.completed = true;
        project.completedAt = LocalDateTime.now();
        project.completedBy = currentUser.id;
        project.persist();

        // Dispatch notifications
        sendCompletionNotifications(project, parent, currentUser);

        return toDTOWithDetails(project);
    }

    @Transactional
    public ProjectDTO reopenProject(Long projectId, User currentUser) {
        Project project = Project.findById(projectId);
        if (project == null || project.archived) {
            throw new IllegalStateException("Project not found or archived");
        }
        if (!project.completed) {
            throw new IllegalStateException("Project is not completed");
        }

        Project parent = project.parentProjectId != null ? Project.findById(project.parentProjectId) : null;

        // Authority Check: Strictly main project creator or ADMIN
        if (project.parentProjectId != null) {
            boolean isParentCreator = parent != null && parent.createdBy != null && parent.createdBy.equals(currentUser.id);
            boolean isAdmin = currentUser.role == Role.ADMIN;
            if (!isParentCreator && !isAdmin) {
                throw new SecurityException("Access denied: Only parent project creator or ADMIN can reopen a completed sub-project");
            }
        } else {
            boolean isCreator = project.createdBy != null && project.createdBy.equals(currentUser.id);
            boolean isAdmin = currentUser.role == Role.ADMIN;
            if (!isCreator && !isAdmin) {
                throw new SecurityException("Access denied: Only project creator or ADMIN can reopen a completed project");
            }
        }

        project.completed = false;
        project.completedAt = null;
        project.completedBy = null;
        project.persist();

        return toDTOWithDetails(project);
    }

    private void sendCompletionNotifications(Project project, Project parent, User currentUser) {
        Set<Long> recipientIds = new HashSet<>();
        String title;
        String message;

        if (project.parentProjectId != null) {
            // Sub-project: notify all direct and inherited members
            List<Number> directMemberIds = em.createNativeQuery(
                    "SELECT user_id FROM project_members WHERE project_id = ?")
                    .setParameter(1, project.id)
                    .getResultList();
            for (Number n : directMemberIds) {
                recipientIds.add(n.longValue());
            }

            if (parent != null) {
                List<Number> parentMemberIds = em.createNativeQuery(
                        "SELECT user_id FROM project_members WHERE project_id = ?")
                        .setParameter(1, parent.id)
                        .getResultList();
                for (Number n : parentMemberIds) {
                    recipientIds.add(n.longValue());
                }
                recipientIds.add(parent.createdBy);
                if (parent.leadId != null) recipientIds.add(parent.leadId);
            }
            if (project.leadId != null) recipientIds.add(project.leadId);
            recipientIds.add(project.createdBy);

            title = "Sub-project Completed";
            message = "Sub-project \"" + project.name + "\" has been marked as completed by @" + currentUser.username;
        } else {
            // Main project: notify all direct members and all sub-project members
            List<Number> allMemberIds = em.createNativeQuery(
                    "SELECT DISTINCT pm.user_id FROM project_members pm " +
                    "JOIN projects p ON pm.project_id = p.id " +
                    "WHERE p.id = ?1 OR p.parent_project_id = ?1")
                    .setParameter(1, project.id)
                    .getResultList();
            for (Number n : allMemberIds) {
                recipientIds.add(n.longValue());
            }
            recipientIds.add(project.createdBy);
            if (project.leadId != null) recipientIds.add(project.leadId);

            title = "Project Completed";
            message = "Project \"" + project.name + "\" has been marked as completed by @" + currentUser.username;
        }

        // Exclude caller
        recipientIds.remove(currentUser.id);

        Map<String, Object> data = new HashMap<>();
        data.put("projectId", project.id);
        data.put("projectName", project.name);
        data.put("projectKey", project.projectKey);
        data.put("completedBy", currentUser.id);
        data.put("completedByName", currentUser.fullName != null ? currentUser.fullName : currentUser.username);

        String dataJson = null;
        try {
            dataJson = objectMapper.writeValueAsString(data);
        } catch (Exception ignored) {
        }

        for (Long recipientId : recipientIds) {
            notificationService.createNotification(
                    recipientId,
                    NotificationType.SYSTEM,
                    title,
                    message,
                    dataJson
            );
        }
    }

    private ProjectDTO toDTOWithDetails(Project project) {
        User createdBy = User.findById(project.createdBy);
        User lead = project.leadId != null ? User.findById(project.leadId) : createdBy;
        User pendingLead = project.pendingLeadId != null ? User.findById(project.pendingLeadId) : null;
        User completedBy = project.completedBy != null ? User.findById(project.completedBy) : null;
        Project parent = project.parentProjectId != null ? Project.findById(project.parentProjectId) : null;

        int subprojectCount = 0;
        if (project.parentProjectId == null) {
            Number count = (Number) em.createNativeQuery(
                    "SELECT COUNT(*) FROM projects WHERE parent_project_id = ? AND archived = false")
                    .setParameter(1, project.id)
                    .getSingleResult();
            subprojectCount = count.intValue();
        }

        List<User> directMembers = em.createNativeQuery(
                "SELECT u.* FROM users u " +
                "JOIN project_members pm ON u.id = pm.user_id " +
                "WHERE pm.project_id = ?", User.class)
                .setParameter(1, project.id)
                .getResultList();

        List<User> inheritedMembers = Collections.emptyList();
        if (project.parentProjectId != null) {
            List<User> parentMembers = em.createNativeQuery(
                "SELECT u.* FROM users u " +
                "JOIN project_members pm ON u.id = pm.user_id " +
                "WHERE pm.project_id = ?", User.class)
                .setParameter(1, project.parentProjectId)
                .getResultList();

            Set<Long> directIds = directMembers.stream()
                    .map(u -> u.id)
                    .collect(Collectors.toSet());
            inheritedMembers = parentMembers.stream()
                    .filter(u -> !directIds.contains(u.id))
                    .collect(Collectors.toList());
        }

        ProjectDTO dto = ProjectMapper.toDTO(project, createdBy, lead, pendingLead, completedBy, parent, subprojectCount, directMembers, inheritedMembers);
        enrichDependencies(project, dto);
        return dto;
    }

    public boolean isSubprojectBlocked(Long projectId) {
        Project project = Project.findById(projectId);
        if (project == null || project.parentProjectId == null) {
            return false;
        }
        if (!"START_AFTER".equalsIgnoreCase(project.dependencyType)) {
            return false;
        }
        Number totalCount = (Number) em.createNativeQuery(
                "SELECT COUNT(*) FROM subproject_dependencies WHERE subproject_id = ?1")
                .setParameter(1, projectId)
                .getSingleResult();
        if (totalCount.longValue() == 0) {
            return false;
        }
        Number incompleteCount = (Number) em.createNativeQuery(
                "SELECT COUNT(*) FROM subproject_dependencies sd " +
                "JOIN projects p ON sd.prerequisite_id = p.id " +
                "WHERE sd.subproject_id = ?1 AND (p.completed = false OR p.archived = true)")
                .setParameter(1, projectId)
                .getSingleResult();
        return incompleteCount.longValue() > 0;
    }

    private void enrichDependencies(Project project, ProjectDTO dto) {
        dto.dependencyType = project.dependencyType != null ? project.dependencyType : "NO_DEPENDENCY";
        if (project.parentProjectId == null) {
            dto.prerequisiteIds = Collections.emptyList();
            dto.prerequisiteNames = Collections.emptyList();
            dto.isBlocked = false;
            dto.blockingPrerequisiteNames = Collections.emptyList();
            return;
        }

        @SuppressWarnings("unchecked")
        List<Object[]> rows = em.createNativeQuery(
                "SELECT sd.prerequisite_id, p.name, p.completed, p.archived " +
                "FROM subproject_dependencies sd " +
                "JOIN projects p ON sd.prerequisite_id = p.id " +
                "WHERE sd.subproject_id = ?1 ORDER BY p.id ASC")
                .setParameter(1, project.id)
                .getResultList();

        List<Long> prereqIds = new java.util.ArrayList<>();
        List<String> prereqNames = new java.util.ArrayList<>();
        List<String> blockingNames = new java.util.ArrayList<>();

        for (Object[] row : rows) {
            Long prereqId = ((Number) row[0]).longValue();
            String prereqName = (String) row[1];
            Boolean completed = (Boolean) row[2];
            Boolean archived = (Boolean) row[3];

            prereqIds.add(prereqId);
            prereqNames.add(prereqName);

            if (Boolean.FALSE.equals(completed) || Boolean.TRUE.equals(archived)) {
                blockingNames.add(prereqName);
            }
        }

        dto.prerequisiteIds = prereqIds;
        dto.prerequisiteNames = prereqNames;
        if ("START_AFTER".equalsIgnoreCase(dto.dependencyType) && !prereqIds.isEmpty() && !blockingNames.isEmpty()) {
            dto.isBlocked = true;
        } else {
            dto.isBlocked = false;
        }
        dto.blockingPrerequisiteNames = blockingNames;
    }

    private boolean wouldCreateCycle(Long subprojectId, Set<Long> candidatePrereqIds) {
        Set<Long> visited = new HashSet<>();
        List<Long> queue = new java.util.ArrayList<>(candidatePrereqIds);
        while (!queue.isEmpty()) {
            Long current = queue.remove(0);
            if (current.equals(subprojectId)) {
                return true;
            }
            if (visited.add(current)) {
                @SuppressWarnings("unchecked")
                List<Number> upstream = em.createNativeQuery(
                        "SELECT prerequisite_id FROM subproject_dependencies WHERE subproject_id = ?1")
                        .setParameter(1, current)
                        .getResultList();
                for (Number up : upstream) {
                    queue.add(up.longValue());
                }
            }
        }
        return false;
    }
}
