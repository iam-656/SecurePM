package com.securepm.invitations;

import com.securepm.auth.AuthContext;
import com.securepm.auth.User;
import com.securepm.invitations.dto.ProjectInvitationDTO;
import jakarta.enterprise.context.ApplicationScoped;
import jakarta.inject.Inject;
import jakarta.ws.rs.*;
import jakarta.ws.rs.core.MediaType;
import jakarta.ws.rs.core.Response;

@Path("/api/invitations/{id}")
@Produces(MediaType.APPLICATION_JSON)
@Consumes({MediaType.APPLICATION_JSON, MediaType.WILDCARD})
@ApplicationScoped
public class InvitationResource {

    @Inject
    ProjectInvitationService invitationService;

    @Inject
    AuthContext authContext;

    @POST
    @Path("/accept")
    public Response acceptInvitation(@PathParam("id") Long id) {
        User currentUser = authContext.getCurrentUser();
        if (currentUser == null) {
            return Response.status(401).entity("{\"error\":\"Authentication required\"}").build();
        }
        try {
            ProjectInvitationDTO dto = invitationService.acceptInvitation(id, currentUser);
            return Response.ok(dto).build();
        } catch (SecurityException e) {
            return Response.status(403).entity("{\"error\":\"Access denied\"}").build();
        } catch (IllegalStateException e) {
            return Response.status(400).entity("{\"error\":\"" + e.getMessage() + "\"}").build();
        }
    }

    @POST
    @Path("/decline")
    public Response declineInvitation(@PathParam("id") Long id) {
        User currentUser = authContext.getCurrentUser();
        if (currentUser == null) {
            return Response.status(401).entity("{\"error\":\"Authentication required\"}").build();
        }
        try {
            ProjectInvitationDTO dto = invitationService.declineInvitation(id, currentUser);
            return Response.ok(dto).build();
        } catch (SecurityException e) {
            return Response.status(403).entity("{\"error\":\"Access denied\"}").build();
        } catch (IllegalStateException e) {
            return Response.status(400).entity("{\"error\":\"" + e.getMessage() + "\"}").build();
        }
    }
}
