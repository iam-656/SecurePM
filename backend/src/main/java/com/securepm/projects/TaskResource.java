package com.securepm.projects;

import com.securepm.auth.AuthContext;
import com.securepm.auth.User;
import jakarta.enterprise.context.ApplicationScoped;
import jakarta.inject.Inject;
import jakarta.transaction.Transactional;
import jakarta.validation.Valid;
import jakarta.ws.rs.*;
import jakarta.ws.rs.core.MediaType;
import jakarta.ws.rs.core.Response;

import java.util.List;

@Path("/api/projects/{projectId}/tasks")
@Produces(MediaType.APPLICATION_JSON)
@Consumes(MediaType.APPLICATION_JSON)
@ApplicationScoped
public class TaskResource {

    @Inject
    TaskService taskService;

    @Inject
    AuthContext authContext;

    @POST
    public Response createTask(@PathParam("projectId") Long projectId, @Valid CreateTaskRequest request) {
        User currentUser = authContext.getCurrentUser();
        if (currentUser == null) {
            return Response.status(401).entity("{\"error\":\"Authentication required\"}").build();
        }
        try {
            TaskDTO dto = taskService.createTask(projectId, request, currentUser);
            return Response.status(201).entity(dto).build();
        } catch (SecurityException e) {
            return Response.status(403).entity("{\"error\":\"Access denied\"}").build();
        } catch (IllegalStateException e) {
            return Response.status(400).entity("{\"error\":\"" + e.getMessage() + "\"}").build();
        }
    }

    @GET
    public Response listTasks(@PathParam("projectId") Long projectId,
                             @QueryParam("status") String status,
                             @QueryParam("assigneeId") Long assigneeId,
                             @QueryParam("page") @DefaultValue("0") int page,
                             @QueryParam("size") @DefaultValue("20") int size) {
        User currentUser = authContext.getCurrentUser();
        if (currentUser == null) {
            return Response.status(401).entity("{\"error\":\"Authentication required\"}").build();
        }
        try {
            PageResponse<TaskDTO> response = taskService.listTasks(projectId, status, assigneeId, page, size, currentUser);
            return Response.ok(response).build();
        } catch (SecurityException e) {
            return Response.status(403).entity("{\"error\":\"Access denied\"}").build();
        }
    }

    @GET
    @Path("/kanban")
    public Response getKanban(@PathParam("projectId") Long projectId) {
        User currentUser = authContext.getCurrentUser();
        if (currentUser == null) {
            return Response.status(401).entity("{\"error\":\"Authentication required\"}").build();
        }
        try {
            List<TaskDTO> tasks = taskService.getKanban(projectId, currentUser);
            return Response.ok(tasks).build();
        } catch (SecurityException e) {
            return Response.status(403).entity("{\"error\":\"Access denied\"}").build();
        }
    }

    @GET
    @Path("/{taskId}")
    public Response getTask(@PathParam("projectId") Long projectId, @PathParam("taskId") Long taskId) {
        User currentUser = authContext.getCurrentUser();
        if (currentUser == null) {
            return Response.status(401).entity("{\"error\":\"Authentication required\"}").build();
        }
        try {
            TaskDTO dto = taskService.getTask(projectId, taskId, currentUser);
            return Response.ok(dto).build();
        } catch (SecurityException e) {
            return Response.status(403).entity("{\"error\":\"Access denied\"}").build();
        } catch (IllegalStateException e) {
            return Response.status(404).entity("{\"error\":\"Task not found\"}").build();
        }
    }

    @PUT
    @Path("/{taskId}")
    @Transactional
    public Response updateTask(@PathParam("projectId") Long projectId, @PathParam("taskId") Long taskId,
                               @Valid UpdateTaskRequest request) {
        User currentUser = authContext.getCurrentUser();
        if (currentUser == null) {
            return Response.status(401).entity("{\"error\":\"Authentication required\"}").build();
        }
        try {
            TaskDTO dto = taskService.updateTask(projectId, taskId, request, currentUser);
            return Response.ok(dto).build();
        } catch (SecurityException e) {
            return Response.status(403).entity("{\"error\":\"Access denied\"}").build();
        } catch (IllegalStateException e) {
            if ("Task not found".equals(e.getMessage())) {
                return Response.status(404).entity("{\"error\":\"Task not found\"}").build();
            }
            if (e.getMessage() != null && (e.getMessage().contains("view-only mode") || e.getMessage().contains("Prerequisite") || e.getMessage().contains("prerequisite"))) {
                return Response.status(400).entity("{\"error\":\"" + e.getMessage() + "\"}").build();
            }
            return Response.status(409).entity("{\"error\":\"" + e.getMessage() + "\"}").build();
        }
    }

    @DELETE
    @Path("/{taskId}")
    @Transactional
    public Response deleteTask(@PathParam("projectId") Long projectId, @PathParam("taskId") Long taskId) {
        User currentUser = authContext.getCurrentUser();
        if (currentUser == null) {
            return Response.status(401).entity("{\"error\":\"Authentication required\"}").build();
        }
        try {
            taskService.deleteTask(projectId, taskId, currentUser);
            return Response.ok("{\"message\":\"Task deleted\"}").build();
        } catch (SecurityException e) {
            return Response.status(403).entity("{\"error\":\"Access denied\"}").build();
        } catch (IllegalStateException e) {
            if (e.getMessage() != null && e.getMessage().contains("view-only mode")) {
                return Response.status(400).entity("{\"error\":\"" + e.getMessage() + "\"}").build();
            }
            return Response.status(404).entity("{\"error\":\"Task not found\"}").build();
        }
    }
}