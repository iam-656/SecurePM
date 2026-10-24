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

@Path("/api/projects")
@Produces(MediaType.APPLICATION_JSON)
@Consumes(MediaType.APPLICATION_JSON)
@ApplicationScoped
public class ProjectResource {

    @Inject
    ProjectService projectService;

    @Inject
    AuthContext authContext;

    @POST
    public Response createProject(@Valid CreateProjectRequest request) {
        User currentUser = authContext.getCurrentUser();
        if (currentUser == null) {
            return Response.status(401).entity("{\"error\":\"Authentication required\"}").build();
        }
        try {
            ProjectDTO dto = projectService.createProject(request, currentUser);
            return Response.status(201).entity(dto).build();
        } catch (SecurityException e) {
            return Response.status(403).entity("{\"error\":\"Access denied\"}").build();
        } catch (IllegalStateException e) {
            return Response.status(400).entity("{\"error\":\"" + e.getMessage() + "\"}").build();
        }
    }

    @GET
    public Response listProjects(@QueryParam("includeSubprojects") @DefaultValue("false") boolean includeSubprojects) {
        User currentUser = authContext.getCurrentUser();
        if (currentUser == null) {
            return Response.status(401).entity("{\"error\":\"Authentication required\"}").build();
        }
        List<ProjectDTO> projects = projectService.listProjects(currentUser, includeSubprojects);
        return Response.ok(projects).build();
    }

    @GET
    @Path("/{id}")
    public Response getProject(@PathParam("id") Long id) {
        User currentUser = authContext.getCurrentUser();
        if (currentUser == null) {
            return Response.status(401).entity("{\"error\":\"Authentication required\"}").build();
        }
        try {
            ProjectDTO dto = projectService.getProject(id, currentUser);
            return Response.ok(dto).build();
        } catch (SecurityException e) {
            return Response.status(403).entity("{\"error\":\"Access denied\"}").build();
        } catch (IllegalStateException e) {
            return Response.status(404).entity("{\"error\":\"Project not found\"}").build();
        }
    }

    @GET
    @Path("/{id}/subprojects")
    public Response listSubprojects(@PathParam("id") Long id) {
        User currentUser = authContext.getCurrentUser();
        if (currentUser == null) {
            return Response.status(401).entity("{\"error\":\"Authentication required\"}").build();
        }
        try {
            List<ProjectDTO> subprojects = projectService.listSubprojects(id, currentUser);
            return Response.ok(subprojects).build();
        } catch (SecurityException e) {
            return Response.status(403).entity("{\"error\":\"Access denied\"}").build();
        } catch (IllegalStateException e) {
            return Response.status(404).entity("{\"error\":\"Project not found\"}").build();
        }
    }

    @PUT
    @Path("/{id}")
    @Transactional
    public Response updateProject(@PathParam("id") Long id, @Valid UpdateProjectRequest request) {
        User currentUser = authContext.getCurrentUser();
        if (currentUser == null) {
            return Response.status(401).entity("{\"error\":\"Authentication required\"}").build();
        }
        try {
            ProjectDTO dto = projectService.updateProject(id, request, currentUser);
            return Response.ok(dto).build();
        } catch (SecurityException e) {
            return Response.status(403).entity("{\"error\":\"" + (e.getMessage() != null ? e.getMessage() : "Access denied") + "\"}").build();
        } catch (IllegalStateException e) {
            if ("Project not found".equals(e.getMessage())) {
                return Response.status(404).entity("{\"error\":\"Project not found\"}").build();
            }
            return Response.status(400).entity("{\"error\":\"" + e.getMessage() + "\"}").build();
        }
    }

    @DELETE
    @Path("/{id}")
    @Transactional
    public Response archiveProject(@PathParam("id") Long id) {
        User currentUser = authContext.getCurrentUser();
        if (currentUser == null) {
            return Response.status(401).entity("{\"error\":\"Authentication required\"}").build();
        }
        try {
            projectService.archiveProject(id, currentUser);
            return Response.ok("{\"message\":\"Project archived\"}").build();
        } catch (SecurityException e) {
            return Response.status(403).entity("{\"error\":\"Access denied\"}").build();
        } catch (IllegalStateException e) {
            if ("Project not found".equals(e.getMessage())) {
                return Response.status(404).entity("{\"error\":\"Project not found\"}").build();
            }
            return Response.status(400).entity("{\"error\":\"" + e.getMessage() + "\"}").build();
        }
    }

    @POST
    @Path("/{id}/complete")
    @Consumes({MediaType.APPLICATION_JSON, MediaType.WILDCARD})
    public Response completeProject(@PathParam("id") Long id) {
        User currentUser = authContext.getCurrentUser();
        if (currentUser == null) {
            return Response.status(401).entity("{\"error\":\"Authentication required\"}").build();
        }
        try {
            ProjectDTO dto = projectService.completeProject(id, currentUser);
            return Response.ok(dto).build();
        } catch (SecurityException e) {
            return Response.status(403).entity("{\"error\":\"" + e.getMessage() + "\"}").build();
        } catch (IllegalStateException e) {
            return Response.status(400).entity("{\"error\":\"" + e.getMessage() + "\"}").build();
        }
    }

    @POST
    @Path("/{id}/reopen")
    @Consumes({MediaType.APPLICATION_JSON, MediaType.WILDCARD})
    public Response reopenProject(@PathParam("id") Long id) {
        User currentUser = authContext.getCurrentUser();
        if (currentUser == null) {
            return Response.status(401).entity("{\"error\":\"Authentication required\"}").build();
        }
        try {
            ProjectDTO dto = projectService.reopenProject(id, currentUser);
            return Response.ok(dto).build();
        } catch (SecurityException e) {
            return Response.status(403).entity("{\"error\":\"" + e.getMessage() + "\"}").build();
        } catch (IllegalStateException e) {
            return Response.status(400).entity("{\"error\":\"" + e.getMessage() + "\"}").build();
        }
    }

    @POST
    @Path("/{id}/members")
    @Consumes({MediaType.APPLICATION_JSON, MediaType.WILDCARD})
    public Response addMember(@PathParam("id") Long projectId, @QueryParam("userId") Long userId) {
        return Response.status(400).entity("{\"error\":\"Direct member addition is disabled. Please send a project invitation via POST /api/projects/" + projectId + "/invitations.\"}").build();
    }

    @POST
    @Path("/{id}/members/{userId}")
    @Consumes({MediaType.APPLICATION_JSON, MediaType.WILDCARD})
    public Response addMemberPath(@PathParam("id") Long projectId, @PathParam("userId") Long userId) {
        return addMember(projectId, userId);
    }

    @DELETE
    @Path("/{id}/members/{userId}")
    @Transactional
    public Response removeMember(@PathParam("id") Long projectId, @PathParam("userId") Long userId) {
        User currentUser = authContext.getCurrentUser();
        if (currentUser == null) {
            return Response.status(401).entity("{\"error\":\"Authentication required\"}").build();
        }
        try {
            ProjectDTO dto = projectService.removeMember(projectId, userId, currentUser);
            return Response.ok(dto).build();
        } catch (SecurityException e) {
            return Response.status(403).entity("{\"error\":\"Access denied\"}").build();
        } catch (IllegalStateException e) {
            return Response.status(404).entity("{\"error\":\"Project not found\"}").build();
        }
    }
}
