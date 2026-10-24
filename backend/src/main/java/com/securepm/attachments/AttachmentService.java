package com.securepm.attachments;

import com.securepm.auth.Role;
import com.securepm.auth.User;
import com.securepm.projects.Project;
import com.securepm.projects.ProjectService;
import com.securepm.projects.Task;
import com.securepm.realtime.ProjectEvent;
import com.securepm.realtime.ProjectEventType;
import com.securepm.realtime.SessionManager;
import jakarta.enterprise.context.ApplicationScoped;
import jakarta.inject.Inject;
import jakarta.persistence.EntityManager;
import jakarta.transaction.Transactional;
import java.io.File;
import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import java.util.stream.Collectors;

@ApplicationScoped
public class AttachmentService {

    @Inject
    EntityManager em;

    @Inject
    SessionManager sessionManager;

    @Inject
    ProjectService projectService;

    private static String getStorageBase() {
        String env = System.getenv("ATTACHMENT_STORAGE_PATH");
        if (env != null && !env.isBlank()) {
            return env;
        }
        String prop = System.getProperty("attachment.storage.path");
        if (prop != null && !prop.isBlank()) {
            return prop;
        }
        File dataDir = new File("/data/attachments");
        if (dataDir.exists() && dataDir.canWrite()) {
            return "/data/attachments";
        }
        return System.getProperty("java.io.tmpdir") + "/securepm/attachments";
    }

    private boolean isTaskInProject(Long taskId, Long projectId) {
        Number count = (Number) em.createNativeQuery(
                "SELECT COUNT(*) FROM tasks WHERE id = ? AND project_id = ?")
                .setParameter(1, taskId)
                .setParameter(2, projectId)
                .getSingleResult();
        return count.longValue() > 0;
    }

    public AttachmentDTO toDTO(Attachment attachment) {
        if (attachment == null) {
            return null;
        }
        AttachmentDTO dto = new AttachmentDTO(attachment);
        if (attachment.uploadedBy != null) {
            User u = User.findById(attachment.uploadedBy);
            if (u != null) {
                dto.uploadedByName = (u.fullName != null && !u.fullName.isBlank()) ? u.fullName : u.username;
            }
        }
        if (attachment.forwardedBy != null) {
            User f = User.findById(attachment.forwardedBy);
            if (f != null) {
                dto.forwardedByName = (f.fullName != null && !f.fullName.isBlank()) ? f.fullName : f.username;
            }
        }
        if (attachment.sourceProjectId != null) {
            Project sp = Project.findById(attachment.sourceProjectId);
            if (sp != null) {
                dto.sourceProjectName = sp.name;
            }
        }
        if (attachment.taskId != null) {
            Task t = Task.findById(attachment.taskId);
            if (t != null) {
                dto.taskTitle = t.title;
            }
        }
        return dto;
    }

    @Transactional
    public AttachmentDTO upload(Long taskId, Long projectId, String originalName,
                                java.io.File file, User currentUser) {
        if (!projectService.isMember(projectId, currentUser)) {
            throw new SecurityException("Access denied: not a project member");
        }
        Project project = Project.findById(projectId);
        if (project != null && project.completed) {
            throw new IllegalStateException("Project is marked as completed and is in view-only mode");
        }
        if (!isTaskInProject(taskId, projectId)) {
            throw new IllegalStateException("Task not found in project");
        }

        // Create storage directory: {storageBase}/{projectId}/{taskId}/
        Path dir = Paths.get(getStorageBase(), String.valueOf(projectId), String.valueOf(taskId));
        try {
            Files.createDirectories(dir);
        } catch (IOException e) {
            throw new RuntimeException("Failed to create attachment directory", e);
        }

        // Generate unique filename to avoid collisions
        String extension = "";
        int dot = originalName.lastIndexOf('.');
        if (dot > 0) {
            extension = originalName.substring(dot);
        }
        String storedName = UUID.randomUUID().toString() + extension;
        Path filePath = dir.resolve(storedName);

        try {
            Files.copy(file.toPath(), filePath);
        } catch (IOException e) {
            throw new RuntimeException("Failed to store file", e);
        }

        Attachment attachment = new Attachment();
        attachment.projectId = projectId;
        attachment.taskId = taskId;
        attachment.filePath = filePath.toString();
        attachment.originalName = originalName;
        attachment.fileSize = file.length();
        attachment.uploadedBy = currentUser.id;
        attachment.persist();

        AttachmentDTO dto = toDTO(attachment);
        ProjectEvent event = new ProjectEvent(ProjectEventType.ATTACHMENT_CREATED, projectId, taskId);
        event.payload.put("attachment", dto);
        sessionManager.broadcast(projectId, event);
        return dto;
    }

    public List<AttachmentDTO> listAttachments(Long taskId, Long projectId, User currentUser) {
        if (!projectService.isMember(projectId, currentUser)) {
            throw new SecurityException("Access denied: not a project member");
        }
        if (!isTaskInProject(taskId, projectId)) {
            throw new IllegalStateException("Task not found in project");
        }

        List<Attachment> attachments = em.createNativeQuery(
                "SELECT * FROM attachments WHERE task_id = ?1 ORDER BY uploaded_at DESC", Attachment.class)
                .setParameter(1, taskId)
                .getResultList();
        return attachments.stream()
                .map(this::toDTO)
                .collect(Collectors.toList());
    }

    public AttachmentDTO download(Long taskId, Long attachmentId, Long projectId, User currentUser) {
        if (!projectService.isMember(projectId, currentUser)) {
            throw new SecurityException("Access denied: not a project member");
        }
        Attachment attachment = Attachment.findById(attachmentId);
        if (attachment == null || !attachment.taskId.equals(taskId)) {
            throw new IllegalStateException("Attachment not found");
        }
        return toDTO(attachment);
    }

    @Transactional
    public void deleteAttachment(Long taskId, Long attachmentId, Long projectId, User currentUser) {
        if (!projectService.isMember(projectId, currentUser)) {
            throw new SecurityException("Access denied: not a project member");
        }
        Project project = Project.findById(projectId);
        if (project != null && project.completed) {
            throw new IllegalStateException("Project is marked as completed and is in view-only mode");
        }
        Attachment attachment = Attachment.findById(attachmentId);
        if (attachment == null || !attachment.taskId.equals(taskId)) {
            throw new IllegalStateException("Attachment not found");
        }

        safeDeleteFile(attachment.filePath);

        attachment.delete();
        ProjectEvent event = new ProjectEvent(ProjectEventType.ATTACHMENT_DELETED, projectId, taskId);
        event.payload.put("attachmentId", attachmentId);
        sessionManager.broadcast(projectId, event);
    }

    // ==========================================
    // Project Library & Forwarding APIs
    // ==========================================

    @Transactional
    public AttachmentDTO uploadLibraryAttachment(Long projectId, String originalName,
                                                java.io.File file, User currentUser) {
        if (!projectService.isMember(projectId, currentUser)) {
            throw new SecurityException("Access denied: not a project member");
        }
        Project project = Project.findById(projectId);
        if (project == null || project.archived) {
            throw new IllegalStateException("Project not found");
        }
        if (project.completed) {
            throw new IllegalStateException("Project is marked as completed and is in view-only mode");
        }

        Path dir = Paths.get(getStorageBase(), String.valueOf(projectId), "library");
        try {
            Files.createDirectories(dir);
        } catch (IOException e) {
            throw new RuntimeException("Failed to create attachment directory", e);
        }

        String extension = "";
        int dot = originalName.lastIndexOf('.');
        if (dot > 0) {
            extension = originalName.substring(dot);
        }
        String storedName = UUID.randomUUID().toString() + extension;
        Path filePath = dir.resolve(storedName);

        try {
            Files.copy(file.toPath(), filePath);
        } catch (IOException e) {
            throw new RuntimeException("Failed to store file", e);
        }

        Attachment attachment = new Attachment();
        attachment.projectId = projectId;
        attachment.taskId = null;
        attachment.filePath = filePath.toString();
        attachment.originalName = originalName;
        attachment.fileSize = file.length();
        attachment.uploadedBy = currentUser.id;
        attachment.persist();

        AttachmentDTO dto = toDTO(attachment);
        ProjectEvent event = new ProjectEvent(ProjectEventType.ATTACHMENT_CREATED, projectId, null);
        event.payload.put("attachment", dto);
        sessionManager.broadcast(projectId, event);
        return dto;
    }

    public List<AttachmentDTO> listProjectLibrary(Long projectId, String search, String fileType,
                                                  String source, String sortBy, User currentUser) {
        if (!projectService.isMember(projectId, currentUser)) {
            throw new SecurityException("Access denied: not a project member");
        }
        Project project = Project.findById(projectId);
        if (project == null || project.archived) {
            throw new IllegalStateException("Project not found");
        }

        StringBuilder hql = new StringBuilder("SELECT a FROM Attachment a WHERE a.projectId = :projectId");
        Map<String, Object> params = new HashMap<>();
        params.put("projectId", projectId);

        if (search != null && !search.trim().isEmpty()) {
            hql.append(" AND LOWER(a.originalName) LIKE :search");
            params.put("search", "%" + search.trim().toLowerCase() + "%");
        }

        if (fileType != null && !fileType.trim().isEmpty() && !fileType.equalsIgnoreCase("all")) {
            String ft = fileType.trim().toLowerCase();
            if ("image".equals(ft)) {
                hql.append(" AND (LOWER(a.originalName) LIKE '%.png' OR LOWER(a.originalName) LIKE '%.jpg' OR LOWER(a.originalName) LIKE '%.jpeg' OR LOWER(a.originalName) LIKE '%.gif' OR LOWER(a.originalName) LIKE '%.webp' OR LOWER(a.originalName) LIKE '%.svg' OR LOWER(a.originalName) LIKE '%.bmp')");
            } else if ("document".equals(ft)) {
                hql.append(" AND (LOWER(a.originalName) LIKE '%.pdf' OR LOWER(a.originalName) LIKE '%.doc' OR LOWER(a.originalName) LIKE '%.docx' OR LOWER(a.originalName) LIKE '%.txt' OR LOWER(a.originalName) LIKE '%.rtf' OR LOWER(a.originalName) LIKE '%.odt' OR LOWER(a.originalName) LIKE '%.xls' OR LOWER(a.originalName) LIKE '%.xlsx' OR LOWER(a.originalName) LIKE '%.ppt' OR LOWER(a.originalName) LIKE '%.pptx' OR LOWER(a.originalName) LIKE '%.csv')");
            } else if ("archive".equals(ft)) {
                hql.append(" AND (LOWER(a.originalName) LIKE '%.zip' OR LOWER(a.originalName) LIKE '%.tar' OR LOWER(a.originalName) LIKE '%.gz' OR LOWER(a.originalName) LIKE '%.rar' OR LOWER(a.originalName) LIKE '%.7z')");
            } else if ("other".equals(ft)) {
                hql.append(" AND (LOWER(a.originalName) NOT LIKE '%.png' AND LOWER(a.originalName) NOT LIKE '%.jpg' AND LOWER(a.originalName) NOT LIKE '%.jpeg' AND LOWER(a.originalName) NOT LIKE '%.gif' AND LOWER(a.originalName) NOT LIKE '%.webp' AND LOWER(a.originalName) NOT LIKE '%.svg' AND LOWER(a.originalName) NOT LIKE '%.bmp' AND LOWER(a.originalName) NOT LIKE '%.pdf' AND LOWER(a.originalName) NOT LIKE '%.doc' AND LOWER(a.originalName) NOT LIKE '%.docx' AND LOWER(a.originalName) NOT LIKE '%.txt' AND LOWER(a.originalName) NOT LIKE '%.rtf' AND LOWER(a.originalName) NOT LIKE '%.odt' AND LOWER(a.originalName) NOT LIKE '%.xls' AND LOWER(a.originalName) NOT LIKE '%.xlsx' AND LOWER(a.originalName) NOT LIKE '%.ppt' AND LOWER(a.originalName) NOT LIKE '%.pptx' AND LOWER(a.originalName) NOT LIKE '%.csv' AND LOWER(a.originalName) NOT LIKE '%.zip' AND LOWER(a.originalName) NOT LIKE '%.tar' AND LOWER(a.originalName) NOT LIKE '%.gz' AND LOWER(a.originalName) NOT LIKE '%.rar' AND LOWER(a.originalName) NOT LIKE '%.7z')");
            }
        }

        if (source != null && !source.trim().isEmpty() && !source.equalsIgnoreCase("all")) {
            String s = source.trim().toLowerCase();
            if ("direct".equals(s)) {
                hql.append(" AND a.taskId IS NULL AND a.forwardedBy IS NULL");
            } else if ("task".equals(s)) {
                hql.append(" AND a.taskId IS NOT NULL");
            } else if ("forwarded".equals(s)) {
                hql.append(" AND a.forwardedBy IS NOT NULL");
            }
        }

        if ("oldest".equalsIgnoreCase(sortBy)) {
            hql.append(" ORDER BY a.uploadedAt ASC");
        } else if ("name_asc".equalsIgnoreCase(sortBy)) {
            hql.append(" ORDER BY LOWER(a.originalName) ASC");
        } else if ("name_desc".equalsIgnoreCase(sortBy)) {
            hql.append(" ORDER BY LOWER(a.originalName) DESC");
        } else if ("size_asc".equalsIgnoreCase(sortBy)) {
            hql.append(" ORDER BY a.fileSize ASC");
        } else if ("size_desc".equalsIgnoreCase(sortBy)) {
            hql.append(" ORDER BY a.fileSize DESC");
        } else {
            // default newest
            hql.append(" ORDER BY a.uploadedAt DESC");
        }

        var query = em.createQuery(hql.toString(), Attachment.class);
        for (var entry : params.entrySet()) {
            query.setParameter(entry.getKey(), entry.getValue());
        }

        List<Attachment> list = query.getResultList();
        return list.stream().map(this::toDTO).collect(Collectors.toList());
    }

    public AttachmentDTO downloadLibraryAttachment(Long projectId, Long attachmentId, User currentUser) {
        if (!projectService.isMember(projectId, currentUser)) {
            throw new SecurityException("Access denied: not a project member");
        }
        Attachment attachment = Attachment.findById(attachmentId);
        if (attachment == null || !attachment.projectId.equals(projectId)) {
            throw new IllegalStateException("Attachment not found in project");
        }
        return toDTO(attachment);
    }

    public List<ForwardTargetDTO> getForwardTargets(Long projectId, Long attachmentId, User currentUser) {
        if (!projectService.isLeadOrAdmin(projectId, currentUser)) {
            throw new SecurityException("Only project leads or admins can forward attachments");
        }
        Project project = Project.findById(projectId);
        if (project == null || project.archived) {
            throw new IllegalStateException("Project not found");
        }
        Attachment attachment = Attachment.findById(attachmentId);
        if (attachment == null || !attachment.projectId.equals(projectId)) {
            throw new IllegalStateException("Attachment not found in this project");
        }

        List<Project> potentialTargets = new ArrayList<>();
        if (project.parentProjectId == null) {
            // Main Project: targets are all child sub-projects
            List<Project> subs = Project.list("parentProjectId = ?1 and archived = false", project.id);
            potentialTargets.addAll(subs);
        } else {
            // Sub-project: targets are parent main project + sibling sub-projects
            Project parent = Project.findById(project.parentProjectId);
            if (parent != null && !parent.archived) {
                potentialTargets.add(parent);
            }
            List<Project> siblings = Project.list("parentProjectId = ?1 and archived = false and id != ?2",
                    project.parentProjectId, project.id);
            potentialTargets.addAll(siblings);
        }

        List<ForwardTargetDTO> targets = new ArrayList<>();
        for (Project p : potentialTargets) {
            long count = Attachment.count("projectId = ?1 AND (sourceAttachmentId = ?2 OR id = ?2 OR filePath = ?3)",
                    p.id, attachmentId, attachment.filePath);
            targets.add(new ForwardTargetDTO(
                    p.id,
                    p.name,
                    p.parentProjectId != null,
                    p.completed,
                    count > 0
            ));
        }
        return targets;
    }

    @Transactional
    public List<AttachmentDTO> forwardAttachment(Long projectId, Long attachmentId,
                                                List<Long> targetProjectIds, User currentUser) {
        if (!projectService.isLeadOrAdmin(projectId, currentUser)) {
            throw new SecurityException("Only project leads or admins can forward attachments");
        }
        Project sourceProject = Project.findById(projectId);
        if (sourceProject == null || sourceProject.archived) {
            throw new IllegalStateException("Source project not found");
        }
        if (sourceProject.completed) {
            throw new IllegalStateException("Project is marked as completed and is in view-only mode");
        }
        Attachment sourceAttachment = Attachment.findById(attachmentId);
        if (sourceAttachment == null || !sourceAttachment.projectId.equals(projectId)) {
            throw new IllegalStateException("Attachment not found in source project");
        }
        if (targetProjectIds == null || targetProjectIds.isEmpty()) {
            throw new IllegalArgumentException("Target project IDs must not be empty");
        }

        List<AttachmentDTO> result = new ArrayList<>();
        LocalDateTime now = LocalDateTime.now();

        for (Long targetId : targetProjectIds) {
            Project target = Project.findById(targetId);
            if (target == null || target.archived) {
                continue;
            }
            if (target.completed) {
                throw new IllegalStateException("Cannot forward to completed project: " + target.name);
            }

            boolean isRelated = false;
            if (sourceProject.parentProjectId == null) {
                if (sourceProject.id.equals(target.parentProjectId)) {
                    isRelated = true;
                }
            } else {
                if (sourceProject.parentProjectId.equals(target.id) ||
                    (sourceProject.parentProjectId.equals(target.parentProjectId) && !sourceProject.id.equals(target.id))) {
                    isRelated = true;
                }
            }

            if (!isRelated && currentUser.role != Role.ADMIN) {
                throw new SecurityException("Target project is not a valid destination");
            }

            Attachment copy = new Attachment();
            copy.projectId = target.id;
            copy.taskId = null;
            copy.filePath = sourceAttachment.filePath; // Shared physical storage
            copy.originalName = sourceAttachment.originalName;
            copy.fileSize = sourceAttachment.fileSize;
            copy.uploadedAt = now;
            copy.uploadedBy = currentUser.id;
            copy.forwardedBy = currentUser.id;
            copy.forwardedAt = now;
            copy.sourceProjectId = sourceProject.id;
            copy.sourceAttachmentId = sourceAttachment.id;
            copy.persist();

            AttachmentDTO dto = toDTO(copy);
            result.add(dto);

            ProjectEvent event = new ProjectEvent(ProjectEventType.ATTACHMENT_CREATED, target.id, null);
            event.payload.put("attachment", dto);
            sessionManager.broadcast(target.id, event);
        }

        return result;
    }

    @Transactional
    public void deleteLibraryAttachment(Long projectId, Long attachmentId, User currentUser) {
        if (!projectService.isMember(projectId, currentUser)) {
            throw new SecurityException("Access denied: not a project member");
        }
        Project project = Project.findById(projectId);
        if (project != null && project.completed) {
            throw new IllegalStateException("Project is marked as completed and is in view-only mode");
        }
        Attachment attachment = Attachment.findById(attachmentId);
        if (attachment == null || !attachment.projectId.equals(projectId)) {
            throw new IllegalStateException("Attachment not found in project");
        }

        boolean isLeadOrAdmin = projectService.isLeadOrAdmin(projectId, currentUser);
        boolean isOwner = (attachment.uploadedBy != null && attachment.uploadedBy.equals(currentUser.id)) ||
                          (attachment.forwardedBy != null && attachment.forwardedBy.equals(currentUser.id));
        if (!isLeadOrAdmin && !isOwner) {
            throw new SecurityException("Access denied: only file owner or project lead/admin can delete files");
        }

        safeDeleteFile(attachment.filePath);

        attachment.delete();
        ProjectEvent event = new ProjectEvent(ProjectEventType.ATTACHMENT_DELETED, projectId, attachment.taskId);
        event.payload.put("attachmentId", attachmentId);
        sessionManager.broadcast(projectId, event);
    }

    private void safeDeleteFile(String filePath) {
        Number count = (Number) em.createNativeQuery(
                "SELECT COUNT(*) FROM attachments WHERE file_path = ?1")
                .setParameter(1, filePath)
                .getSingleResult();
        if (count != null && count.longValue() <= 1) {
            try {
                Files.deleteIfExists(Paths.get(filePath));
            } catch (IOException e) {
                // Log and continue
            }
        }
    }
}