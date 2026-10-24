package com.securepm.projects;

import com.securepm.auth.Role;
import com.securepm.auth.User;
import com.securepm.realtime.ProjectEvent;
import com.securepm.realtime.ProjectEventType;
import com.securepm.realtime.SessionManager;
import io.quarkus.hibernate.orm.panache.Panache;
import jakarta.enterprise.context.ApplicationScoped;
import jakarta.inject.Inject;
import jakarta.persistence.EntityManager;
import jakarta.transaction.Transactional;
import java.math.BigInteger;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

@ApplicationScoped
public class TaskService {

    @Inject
    EntityManager em;

    @Inject
    SessionManager sessionManager;

    @Inject
    ProjectService projectService;

    private boolean isProjectMember(Long projectId, Long userId) {
        User user = User.findById(userId);
        if (user == null) {
            return false;
        }
        return projectService.isMember(projectId, user);
    }

    public PageResponse<TaskDTO> listTasks(Long projectId, String status, Long assigneeId,
                                           int page, int size, User currentUser) {
        if (!isProjectMember(projectId, currentUser.id)) {
            throw new SecurityException("Access denied: not a project member");
        }

        StringBuilder sql = new StringBuilder(
                "SELECT * FROM tasks WHERE project_id = ?1 ");
        if (status != null) {
            sql.append("AND status = ?2 ");
        }
        if (assigneeId != null) {
            sql.append("AND assignee_id = ?3 ");
        }
        sql.append("ORDER BY id ASC");

        jakarta.persistence.Query countQuery = em.createNativeQuery(
                "SELECT COUNT(*) FROM tasks WHERE project_id = ?1" +
                (status != null ? " AND status = ?2" : "") +
                (assigneeId != null ? " AND assignee_id = ?3" : ""));

        countQuery.setParameter(1, projectId);
        int param = 2;
        if (status != null) {
            countQuery.setParameter(param++, TaskStatus.valueOf(status));
        }
        if (assigneeId != null) {
            countQuery.setParameter(param, assigneeId);
        }

        long total = ((Number) countQuery.getSingleResult()).longValue();
        int totalPages = (int) Math.ceil((double) total / size);

        jakarta.persistence.Query query = em.createNativeQuery(sql.toString(), Task.class);
        query.setParameter(1, projectId);
        param = 2;
        if (status != null) {
            query.setParameter(param++, TaskStatus.valueOf(status));
        }
        if (assigneeId != null) {
            query.setParameter(param, assigneeId);
        }
        query.setFirstResult(page * size);
        query.setMaxResults(size);

        List<Task> tasks = query.getResultList();
        List<TaskDTO> items = tasks.stream()
                .map(this::toDTO)
                .collect(Collectors.toList());

        return new PageResponse<>(items, total, page, size, totalPages);
    }

    public List<TaskDTO> getKanban(Long projectId, User currentUser) {
        if (!isProjectMember(projectId, currentUser.id)) {
            throw new SecurityException("Access denied: not a project member");
        }

        List<Task> tasks = em.createNativeQuery(
                "SELECT * FROM tasks WHERE project_id = ?1 ORDER BY id ASC", Task.class)
                .setParameter(1, projectId)
                .getResultList();
        return tasks.stream()
                .map(this::toDTO)
                .collect(Collectors.toList());
    }

    @Transactional
    public TaskDTO createTask(Long projectId, CreateTaskRequest dto, User currentUser) {
        if (!isProjectMember(projectId, currentUser.id)) {
            throw new SecurityException("Access denied: not a project member");
        }
        Project project = Project.findById(projectId);
        if (project != null && project.completed) {
            throw new IllegalStateException("Project is marked as completed and is in view-only mode");
        }
        if (projectService.isSubprojectBlocked(projectId)) {
            throw new IllegalStateException("Cannot create tasks: Prerequisite sub-projects have not been completed yet.");
        }

        Task task = new Task();
        task.projectId = projectId;
        task.title = dto.title;
        task.description = dto.description;
        task.status = dto.status != null ? TaskStatus.valueOf(dto.status) : TaskStatus.TODO;
        task.priority = dto.priority != null ? TaskPriority.valueOf(dto.priority) : TaskPriority.MEDIUM;
        task.assigneeId = dto.assigneeId;
        task.dueDate = dto.dueDate;
        task.createdBy = currentUser.id;
        task.updatedBy = currentUser.id;
        task.version = 1L;
        task.persist();
        TaskDTO result = toDTO(task);
        ProjectEvent event = new ProjectEvent(ProjectEventType.TASK_CREATED, projectId, task.id);
        event.payload.put("task", result);
        sessionManager.broadcast(projectId, event);
        return result;
    }

    public TaskDTO getTask(Long projectId, Long taskId, User currentUser) {
        if (!isProjectMember(projectId, currentUser.id)) {
            throw new SecurityException("Access denied: not a project member");
        }
        Task task = Task.findById(taskId);
        if (task == null || !task.projectId.equals(projectId)) {
            throw new IllegalStateException("Task not found");
        }
        return toDTO(task);
    }

    @Transactional
    public TaskDTO updateTask(Long projectId, Long taskId, UpdateTaskRequest dto, User currentUser) {
        if (!isProjectMember(projectId, currentUser.id)) {
            throw new SecurityException("Access denied: not a project member");
        }
        Project project = Project.findById(projectId);
        if (project != null && project.completed) {
            throw new IllegalStateException("Project is marked as completed and is in view-only mode");
        }
        Task task = Task.findById(taskId);
        if (task == null || !task.projectId.equals(projectId)) {
            throw new IllegalStateException("Task not found");
        }

        // Optimistic locking check
        if (dto.version != null && !dto.version.equals(task.version)) {
            throw new IllegalStateException("Task was modified by another user");
        }

        if (dto.status != null && !task.status.name().equals(dto.status)) {
            if (projectService.isSubprojectBlocked(projectId)) {
                throw new IllegalStateException("Cannot change task status: Prerequisite sub-projects have not been completed yet.");
            }
        }

        if (dto.title != null) {
            task.title = dto.title;
        }
        if (dto.description != null) {
            task.description = dto.description;
        }
        if (dto.status != null) {
            task.status = TaskStatus.valueOf(dto.status);
        }
        if (dto.priority != null) {
            task.priority = TaskPriority.valueOf(dto.priority);
        }
        if (dto.assigneeId != null) {
            task.assigneeId = dto.assigneeId;
        }
        if (dto.dueDate != null) {
            task.dueDate = dto.dueDate;
        }
        task.updatedBy = currentUser.id;
        em.flush();
        TaskDTO result = toDTO(task);
        ProjectEvent event = new ProjectEvent(ProjectEventType.TASK_UPDATED, projectId, task.id);
        event.payload.put("task", result);
        sessionManager.broadcast(projectId, event);
        return result;
    }

    @Transactional
    public void deleteTask(Long projectId, Long taskId, User currentUser) {
        if (!isProjectMember(projectId, currentUser.id)) {
            throw new SecurityException("Access denied: not a project member");
        }
        Project project = Project.findById(projectId);
        if (project != null && project.completed) {
            throw new IllegalStateException("Project is marked as completed and is in view-only mode");
        }
        Task task = Task.findById(taskId);
        if (task == null || !task.projectId.equals(projectId)) {
            throw new IllegalStateException("Task not found");
        }
        task.delete();
        ProjectEvent event = new ProjectEvent(ProjectEventType.TASK_DELETED, projectId, taskId);
        sessionManager.broadcast(projectId, event);
    }

    private TaskDTO toDTO(Task task) {
        TaskDTO dto = new TaskDTO(task);
        if (task.createdBy != null) {
            User creator = User.findById(task.createdBy);
            if (creator != null) {
                dto.createdByName = creator.fullName;
            }
        }
        if (task.assigneeId != null) {
            User assignee = User.findById(task.assigneeId);
            if (assignee != null) {
                dto.assigneeName = assignee.fullName;
            }
        }
        return dto;
    }
}