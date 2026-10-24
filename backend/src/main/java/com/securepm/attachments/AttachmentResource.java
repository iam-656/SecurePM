package com.securepm.attachments;

import com.securepm.auth.AuthContext;
import com.securepm.auth.User;
import jakarta.enterprise.context.ApplicationScoped;
import jakarta.inject.Inject;
import jakarta.transaction.Transactional;
import jakarta.ws.rs.*;
import jakarta.ws.rs.core.MediaType;
import jakarta.ws.rs.core.Response;
import org.jboss.resteasy.reactive.RestForm;
import org.jboss.resteasy.reactive.multipart.FileUpload;

import java.io.File;
import java.util.List;

@Path("/api/tasks/{taskId}/attachments")
@Produces(MediaType.APPLICATION_JSON)
@Consumes(MediaType.MULTIPART_FORM_DATA)
@ApplicationScoped
public class AttachmentResource {

    @Inject
    AttachmentService attachmentService;

    @Inject
    AuthContext authContext;

    @POST
    @Transactional
    public Response uploadAttachment(@PathParam("taskId") Long taskId,
                                     @QueryParam("projectId") Long projectId,
                                     @RestForm("file") FileUpload file) {
        User currentUser = authContext.getCurrentUser();
        if (currentUser == null) {
            return Response.status(401).entity("{\"error\":\"Authentication required\"}").build();
        }
        try {
            AttachmentDTO dto = attachmentService.upload(taskId, projectId,
                    file.fileName(), file.uploadedFile().toFile(), currentUser);
            return Response.status(201).entity(dto).build();
        } catch (SecurityException e) {
            return Response.status(403).entity("{\"error\":\"Access denied\"}").build();
        } catch (IllegalStateException e) {
            if (e.getMessage() != null && e.getMessage().contains("completed")) {
                return Response.status(400).entity("{\"error\":\"" + e.getMessage() + "\"}").build();
            }
            return Response.status(404).entity("{\"error\":\"Task not found\"}").build();
        } catch (RuntimeException e) {
            return Response.status(500).entity("{\"error\":\"Failed to store file\"}").build();
        }
    }

    @GET
    public Response listAttachments(@PathParam("taskId") Long taskId,
                                    @QueryParam("projectId") Long projectId) {
        User currentUser = authContext.getCurrentUser();
        if (currentUser == null) {
            return Response.status(401).entity("{\"error\":\"Authentication required\"}").build();
        }
        try {
            List<AttachmentDTO> attachments = attachmentService.listAttachments(taskId, projectId, currentUser);
            return Response.ok(attachments).build();
        } catch (SecurityException e) {
            return Response.status(403).entity("{\"error\":\"Access denied\"}").build();
        } catch (IllegalStateException e) {
            return Response.status(404).entity("{\"error\":\"Task not found\"}").build();
        }
    }

    @GET
    @Path("/{attachmentId}")
    public Response downloadAttachment(@PathParam("taskId") Long taskId,
                                       @PathParam("attachmentId") Long attachmentId,
                                       @QueryParam("projectId") Long projectId) {
        User currentUser = authContext.getCurrentUser();
        if (currentUser == null) {
            return Response.status(401).entity("{\"error\":\"Authentication required\"}").build();
        }
        try {
            AttachmentDTO dto = attachmentService.download(taskId, attachmentId, projectId, currentUser);
            return Response.ok(dto).build();
        } catch (SecurityException e) {
            return Response.status(403).entity("{\"error\":\"Access denied\"}").build();
        } catch (IllegalStateException e) {
            return Response.status(404).entity("{\"error\":\"Attachment not found\"}").build();
        }
    }

    @DELETE
    @Path("/{attachmentId}")
    @Transactional
    public Response deleteAttachment(@PathParam("taskId") Long taskId,
                                     @PathParam("attachmentId") Long attachmentId,
                                     @QueryParam("projectId") Long projectId) {
        User currentUser = authContext.getCurrentUser();
        if (currentUser == null) {
            return Response.status(401).entity("{\"error\":\"Authentication required\"}").build();
        }
        try {
            attachmentService.deleteAttachment(taskId, attachmentId, projectId, currentUser);
            return Response.ok("{\"message\":\"Attachment deleted\"}").build();
        } catch (SecurityException e) {
            return Response.status(403).entity("{\"error\":\"Access denied\"}").build();
        } catch (IllegalStateException e) {
            if (e.getMessage() != null && e.getMessage().contains("completed")) {
                return Response.status(400).entity("{\"error\":\"" + e.getMessage() + "\"}").build();
            }
            return Response.status(404).entity("{\"error\":\"Attachment not found\"}").build();
        }
    }
}