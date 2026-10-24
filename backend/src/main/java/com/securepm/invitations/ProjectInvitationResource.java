package com.securepm.invitations;

import com.securepm.auth.AuthContext;
import com.securepm.auth.User;
import com.securepm.common.ConflictException;
import com.securepm.invitations.dto.CreateInvitationRequest;
import com.securepm.invitations.dto.ProjectInvitationDTO;
import jakarta.enterprise.context.ApplicationScoped;
import jakarta.inject.Inject;
import jakarta.validation.Valid;
import jakarta.ws.rs.*;
import jakarta.ws.rs.core.MediaType;
import jakarta.ws.rs.core.Response;

import java.util.List;

@Path("/api/projects/{projectId}/invitations")
@Produces(MediaType.APPLICATION_JSON)
@Consumes(MediaType.APPLICATION_JSON)
@ApplicationScoped
public class ProjectInvitationResource {

    @Inject
    ProjectInvitationService invitationService;

    @Inject
    AuthContext authContext;

    @POST
    public Response createInvitation(@PathParam("projectId") Long projectId, @Valid CreateInvitationRequest request) {
        User currentUser = authContext.getCurrentUser();
        if (currentUser == null) {
            return Response.status(401).entity("{\"error\":\"Authentication required\"}").build();
        }
        if (request == null || request.userId == null) {
            return Response.status(400).entity("{\"error\":\"userId is required\"}").build();
        }
        try {
            ProjectInvitationDTO dto = invitationService.createInvitation(projectId, request.userId, currentUser);
            return Response.status(201).entity(dto).build();
        } catch (SecurityException e) {
            return Response.status(403).entity("{\"error\":\"Access denied\"}").build();
        } catch (ConflictException e) {
            return Response.status(409).entity("{\"error\":\"" + e.getMessage() + "\"}").build();
        } catch (IllegalStateException e) {
            return Response.status(400).entity("{\"error\":\"" + e.getMessage() + "\"}").build();
        }
    }

    @GET
    public Response listInvitations(@PathParam("projectId") Long projectId) {
        User currentUser = authContext.getCurrentUser();
        if (currentUser == null) {
            return Response.status(401).entity("{\"error\":\"Authentication required\"}").build();
        }
        try {
            List<ProjectInvitationDTO> list = invitationService.listProjectInvitations(projectId, currentUser);
            return Response.ok(list).build();
        } catch (SecurityException e) {
            return Response.status(403).entity("{\"error\":\"Access denied\"}").build();
        } catch (IllegalStateException e) {
            return Response.status(404).entity("{\"error\":\"" + e.getMessage() + "\"}").build();
        }
    }

    @DELETE
    @Path("/{invitationId}")
    public Response cancelInvitation(@PathParam("projectId") Long projectId, @PathParam("invitationId") Long invitationId) {
        User currentUser = authContext.getCurrentUser();
        if (currentUser == null) {
            return Response.status(401).entity("{\"error\":\"Authentication required\"}").build();
        }
        try {
            ProjectInvitationDTO dto = invitationService.cancelInvitation(projectId, invitationId, currentUser);
            return Response.ok(dto).build();
        } catch (SecurityException e) {
            return Response.status(403).entity("{\"error\":\"Access denied\"}").build();
        } catch (IllegalStateException e) {
            return Response.status(400).entity("{\"error\":\"" + e.getMessage() + "\"}").build();
        }
    }
}
