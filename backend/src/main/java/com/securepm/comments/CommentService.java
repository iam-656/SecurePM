package com.securepm.comments;

import com.securepm.auth.Role;
import com.securepm.auth.User;
import com.securepm.projects.Project;
import com.securepm.realtime.ProjectEvent;
import com.securepm.realtime.ProjectEventType;
import com.securepm.realtime.SessionManager;
import io.quarkus.hibernate.orm.panache.Panache;
import jakarta.enterprise.context.ApplicationScoped;
import jakarta.inject.Inject;
import jakarta.persistence.EntityManager;
import jakarta.persistence.Query;
import jakarta.transaction.Transactional;
import java.math.BigInteger;
import java.util.List;
import java.util.stream.Collectors;

@ApplicationScoped
public class CommentService {

    @Inject
    EntityManager em;

    @Inject
    SessionManager sessionManager;

    private boolean isProjectMember(Long projectId, Long userId) {
        User user = User.findById(userId);
        if (user != null && user.role == Role.ADMIN) {
            return true;
        }
        Project project = Project.findById(projectId);
        if (project != null && project.createdBy.equals(userId)) {
            return true;
        }
        Number count = (Number) em.createNativeQuery(
                "SELECT COUNT(*) FROM project_members WHERE project_id = ? AND user_id = ?")
                .setParameter(1, projectId)
                .setParameter(2, userId)
                .getSingleResult();
        return count.longValue() > 0;
    }

    private boolean isTaskInProject(Long taskId, Long projectId) {
        Number count = (Number) em.createNativeQuery(
                "SELECT COUNT(*) FROM tasks WHERE id = ? AND project_id = ?")
                .setParameter(1, taskId)
                .setParameter(2, projectId)
                .getSingleResult();
        return count.longValue() > 0;
    }

    @Transactional
    public CommentDTO createComment(Long taskId, Long projectId, CreateCommentRequest dto, User currentUser) {
        if (!isProjectMember(projectId, currentUser.id)) {
            throw new SecurityException("Access denied: not a project member");
        }
        Project project = Project.findById(projectId);
        if (project != null && project.completed) {
            throw new IllegalStateException("Project is marked as completed and is in view-only mode");
        }
        if (!isTaskInProject(taskId, projectId)) {
            throw new IllegalStateException("Task not found in project");
        }

        Comment comment = new Comment();
        comment.taskId = taskId;
        comment.authorId = currentUser.id;
        comment.content = dto.content;
        comment.persist();
        CommentDTO dtoResult = toDTO(comment);
        ProjectEvent event = new ProjectEvent(ProjectEventType.COMMENT_CREATED, projectId, taskId);
        event.payload.put("comment", dtoResult);
        sessionManager.broadcast(projectId, event);
        return dtoResult;
    }

    public List<CommentDTO> listComments(Long taskId, Long projectId, User currentUser) {
        if (!isProjectMember(projectId, currentUser.id)) {
            throw new SecurityException("Access denied: not a project member");
        }
        if (!isTaskInProject(taskId, projectId)) {
            throw new IllegalStateException("Task not found in project");
        }

        List<Comment> comments = em.createNativeQuery(
                "SELECT * FROM comments WHERE task_id = ?1 ORDER BY created_at ASC", Comment.class)
                .setParameter(1, taskId)
                .getResultList();
        return comments.stream()
                .map(this::toDTO)
                .collect(Collectors.toList());
    }

    @Transactional
    public CommentDTO updateComment(Long taskId, Long projectId, Long commentId, UpdateCommentRequest dto, User currentUser) {
        Project project = Project.findById(projectId);
        if (project != null && project.completed) {
            throw new IllegalStateException("Project is marked as completed and is in view-only mode");
        }
        Comment comment = Comment.findById(commentId);
        if (comment == null) {
            throw new IllegalStateException("Comment not found");
        }
        if (!comment.taskId.equals(taskId)) {
            throw new IllegalStateException("Comment not found in task");
        }
        if (!comment.authorId.equals(currentUser.id) && !currentUser.role.equals(com.securepm.auth.Role.ADMIN)) {
            throw new SecurityException("Access denied: only author or admin can edit");
        }
        comment.content = dto.content;
        CommentDTO dtoResult = toDTO(comment);
        ProjectEvent event = new ProjectEvent(ProjectEventType.COMMENT_UPDATED, projectId, taskId);
        event.payload.put("comment", dtoResult);
        sessionManager.broadcast(projectId, event);
        return dtoResult;
    }

    @Transactional
    public void deleteComment(Long taskId, Long projectId, Long commentId, User currentUser) {
        Project project = Project.findById(projectId);
        if (project != null && project.completed) {
            throw new IllegalStateException("Project is marked as completed and is in view-only mode");
        }
        Comment comment = Comment.findById(commentId);
        if (comment == null) {
            throw new IllegalStateException("Comment not found");
        }
        if (!comment.taskId.equals(taskId)) {
            throw new IllegalStateException("Comment not found in task");
        }
        if (!comment.authorId.equals(currentUser.id) && !currentUser.role.equals(com.securepm.auth.Role.ADMIN)) {
            throw new SecurityException("Access denied: only author or admin can delete");
        }
        comment.delete();
        ProjectEvent event = new ProjectEvent(ProjectEventType.COMMENT_DELETED, projectId, taskId);
        event.payload.put("commentId", commentId);
        sessionManager.broadcast(projectId, event);
    }

    private CommentDTO toDTO(Comment comment) {
        CommentDTO dto = new CommentDTO(comment);
        if (comment.authorId != null) {
            User author = User.findById(comment.authorId);
            if (author != null) {
                dto.authorName = author.fullName;
            }
        }
        return dto;
    }
}
