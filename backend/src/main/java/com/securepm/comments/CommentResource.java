package com.securepm.comments;

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

@Path("/api/tasks/{taskId}/comments")
@Produces(MediaType.APPLICATION_JSON)
@Consumes(MediaType.APPLICATION_JSON)
@ApplicationScoped
public class CommentResource {

    @Inject
    CommentService commentService;

    @Inject
    AuthContext authContext;

    @POST
    public Response createComment(@PathParam("taskId") Long taskId,
                                 @QueryParam("projectId") Long projectId,
                                 @Valid CreateCommentRequest request) {
        User currentUser = authContext.getCurrentUser();
        if (currentUser == null) {
            return Response.status(401).entity("{\"error\":\"Authentication required\"}").build();
        }
        try {
            CommentDTO dto = commentService.createComment(taskId, projectId, request, currentUser);
            return Response.status(201).entity(dto).build();
        } catch (SecurityException e) {
            return Response.status(403).entity("{\"error\":\"Access denied\"}").build();
        } catch (IllegalStateException e) {
            if (e.getMessage() != null && e.getMessage().contains("completed")) {
                return Response.status(400).entity("{\"error\":\"" + e.getMessage() + "\"}").build();
            }
            return Response.status(404).entity("{\"error\":\"Task not found\"}").build();
        }
    }

    @GET
    public Response listComments(@PathParam("taskId") Long taskId,
                                @QueryParam("projectId") Long projectId) {
        User currentUser = authContext.getCurrentUser();
        if (currentUser == null) {
            return Response.status(401).entity("{\"error\":\"Authentication required\"}").build();
        }
        try {
            List<CommentDTO> comments = commentService.listComments(taskId, projectId, currentUser);
            return Response.ok(comments).build();
        } catch (SecurityException e) {
            return Response.status(403).entity("{\"error\":\"Access denied\"}").build();
        } catch (IllegalStateException e) {
            return Response.status(404).entity("{\"error\":\"Task not found\"}").build();
        }
    }

    @PUT
    @Path("/{commentId}")
    @Transactional
    public Response updateComment(@PathParam("taskId") Long taskId,
                                 @PathParam("commentId") Long commentId,
                                 @QueryParam("projectId") Long projectId,
                                 @Valid UpdateCommentRequest request) {
        User currentUser = authContext.getCurrentUser();
        if (currentUser == null) {
            return Response.status(401).entity("{\"error\":\"Authentication required\"}").build();
        }
        try {
            CommentDTO dto = commentService.updateComment(taskId, projectId, commentId, request, currentUser);
            return Response.ok(dto).build();
        } catch (SecurityException e) {
            return Response.status(403).entity("{\"error\":\"Access denied\"}").build();
        } catch (IllegalStateException e) {
            if (e.getMessage() != null && e.getMessage().contains("completed")) {
                return Response.status(400).entity("{\"error\":\"" + e.getMessage() + "\"}").build();
            }
            return Response.status(404).entity("{\"error\":\"Comment not found\"}").build();
        }
    }

    @DELETE
    @Path("/{commentId}")
    @Transactional
    public Response deleteComment(@PathParam("taskId") Long taskId,
                                 @PathParam("commentId") Long commentId,
                                 @QueryParam("projectId") Long projectId) {
        User currentUser = authContext.getCurrentUser();
        if (currentUser == null) {
            return Response.status(401).entity("{\"error\":\"Authentication required\"}").build();
        }
        try {
            commentService.deleteComment(taskId, projectId, commentId, currentUser);
            return Response.ok("{\"message\":\"Comment deleted\"}").build();
        } catch (SecurityException e) {
            return Response.status(403).entity("{\"error\":\"Access denied\"}").build();
        } catch (IllegalStateException e) {
            if (e.getMessage() != null && e.getMessage().contains("completed")) {
                return Response.status(400).entity("{\"error\":\"" + e.getMessage() + "\"}").build();
            }
            return Response.status(404).entity("{\"error\":\"Comment not found\"}").build();
        }
    }
}