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

import java.util.List;

@Path("/api/projects/{projectId}/library")
@Produces(MediaType.APPLICATION_JSON)
@ApplicationScoped
public class ProjectLibraryResource {

    @Inject
    AttachmentService attachmentService;

    @Inject
    AuthContext authContext;

    @GET
    public Response listLibraryFiles(@PathParam("projectId") Long projectId,
                                     @QueryParam("search") String search,
                                     @QueryParam("fileType") String fileType,
                                     @QueryParam("source") String source,
                                     @QueryParam("sortBy") String sortBy) {
        User currentUser = authContext.getCurrentUser();
        if (currentUser == null) {
            return Response.status(401).entity("{\"error\":\"Authentication required\"}").build();
        }
        try {
            List<AttachmentDTO> files = attachmentService.listProjectLibrary(
                    projectId, search, fileType, source, sortBy, currentUser);
            return Response.ok(files).build();
        } catch (SecurityException e) {
            return Response.status(403).entity("{\"error\":\"Access denied\"}").build();
        } catch (IllegalStateException e) {
            return Response.status(404).entity("{\"error\":\"" + e.getMessage() + "\"}").build();
        }
    }

    @POST
    @Consumes(MediaType.MULTIPART_FORM_DATA)
    @Transactional
    public Response uploadLibraryFile(@PathParam("projectId") Long projectId,
                                      @RestForm("file") FileUpload file) {
        User currentUser = authContext.getCurrentUser();
        if (currentUser == null) {
            return Response.status(401).entity("{\"error\":\"Authentication required\"}").build();
        }
        if (file == null) {
            return Response.status(400).entity("{\"error\":\"File is required\"}").build();
        }
        try {
            AttachmentDTO dto = attachmentService.uploadLibraryAttachment(
                    projectId, file.fileName(), file.uploadedFile().toFile(), currentUser);
            return Response.status(201).entity(dto).build();
        } catch (SecurityException e) {
            return Response.status(403).entity("{\"error\":\"Access denied\"}").build();
        } catch (IllegalStateException e) {
            if (e.getMessage() != null && e.getMessage().contains("completed")) {
                return Response.status(400).entity("{\"error\":\"" + e.getMessage() + "\"}").build();
            }
            return Response.status(404).entity("{\"error\":\"" + e.getMessage() + "\"}").build();
        } catch (RuntimeException e) {
            return Response.status(500).entity("{\"error\":\"Failed to store file\"}").build();
        }
    }

    @GET
    @Path("/{attachmentId}")
    public Response getLibraryFile(@PathParam("projectId") Long projectId,
                                   @PathParam("attachmentId") Long attachmentId) {
        User currentUser = authContext.getCurrentUser();
        if (currentUser == null) {
            return Response.status(401).entity("{\"error\":\"Authentication required\"}").build();
        }
        try {
            AttachmentDTO dto = attachmentService.downloadLibraryAttachment(projectId, attachmentId, currentUser);
            return Response.ok(dto).build();
        } catch (SecurityException e) {
            return Response.status(403).entity("{\"error\":\"Access denied\"}").build();
        } catch (IllegalStateException e) {
            return Response.status(404).entity("{\"error\":\"" + e.getMessage() + "\"}").build();
        }
    }

    @GET
    @Path("/{attachmentId}/download")
    public Response downloadLibraryFile(@PathParam("projectId") Long projectId,
                                        @PathParam("attachmentId") Long attachmentId) {
        return getLibraryFile(projectId, attachmentId);
    }

    @GET
    @Path("/{attachmentId}/targets")
    public Response getForwardTargets(@PathParam("projectId") Long projectId,
                                      @PathParam("attachmentId") Long attachmentId) {
        User currentUser = authContext.getCurrentUser();
        if (currentUser == null) {
            return Response.status(401).entity("{\"error\":\"Authentication required\"}").build();
        }
        try {
            List<ForwardTargetDTO> targets = attachmentService.getForwardTargets(projectId, attachmentId, currentUser);
            return Response.ok(targets).build();
        } catch (SecurityException e) {
            return Response.status(403).entity("{\"error\":\"" + e.getMessage() + "\"}").build();
        } catch (IllegalStateException e) {
            return Response.status(404).entity("{\"error\":\"" + e.getMessage() + "\"}").build();
        }
    }

    @POST
    @Path("/{attachmentId}/forward")
    @Consumes(MediaType.APPLICATION_JSON)
    @Transactional
    public Response forwardAttachment(@PathParam("projectId") Long projectId,
                                      @PathParam("attachmentId") Long attachmentId,
                                      ForwardAttachmentRequest request) {
        User currentUser = authContext.getCurrentUser();
        if (currentUser == null) {
            return Response.status(401).entity("{\"error\":\"Authentication required\"}").build();
        }
        if (request == null || request.targetProjectIds == null || request.targetProjectIds.isEmpty()) {
            return Response.status(400).entity("{\"error\":\"Target project IDs must not be empty\"}").build();
        }
        try {
            List<AttachmentDTO> forwarded = attachmentService.forwardAttachment(
                    projectId, attachmentId, request.targetProjectIds, currentUser);
            return Response.ok(forwarded).build();
        } catch (SecurityException e) {
            return Response.status(403).entity("{\"error\":\"" + e.getMessage() + "\"}").build();
        } catch (IllegalStateException e) {
            if (e.getMessage() != null && e.getMessage().contains("completed")) {
                return Response.status(400).entity("{\"error\":\"" + e.getMessage() + "\"}").build();
            }
            return Response.status(404).entity("{\"error\":\"" + e.getMessage() + "\"}").build();
        } catch (IllegalArgumentException e) {
            return Response.status(400).entity("{\"error\":\"" + e.getMessage() + "\"}").build();
        }
    }

    @DELETE
    @Path("/{attachmentId}")
    @Transactional
    public Response deleteLibraryFile(@PathParam("projectId") Long projectId,
                                      @PathParam("attachmentId") Long attachmentId) {
        User currentUser = authContext.getCurrentUser();
        if (currentUser == null) {
            return Response.status(401).entity("{\"error\":\"Authentication required\"}").build();
        }
        try {
            attachmentService.deleteLibraryAttachment(projectId, attachmentId, currentUser);
            return Response.ok("{\"message\":\"Attachment deleted\"}").build();
        } catch (SecurityException e) {
            return Response.status(403).entity("{\"error\":\"" + e.getMessage() + "\"}").build();
        } catch (IllegalStateException e) {
            if (e.getMessage() != null && e.getMessage().contains("completed")) {
                return Response.status(400).entity("{\"error\":\"" + e.getMessage() + "\"}").build();
            }
            return Response.status(404).entity("{\"error\":\"" + e.getMessage() + "\"}").build();
        }
    }
}
