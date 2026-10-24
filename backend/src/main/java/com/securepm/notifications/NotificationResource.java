package com.securepm.notifications;

import com.securepm.auth.AuthContext;
import com.securepm.auth.User;
import com.securepm.notifications.dto.NotificationDTO;
import com.securepm.notifications.dto.NotificationsResponseDTO;
import jakarta.enterprise.context.ApplicationScoped;
import jakarta.inject.Inject;
import jakarta.ws.rs.*;
import jakarta.ws.rs.core.MediaType;
import jakarta.ws.rs.core.Response;

import java.util.Map;

@Path("/api/notifications")
@Produces(MediaType.APPLICATION_JSON)
@Consumes({MediaType.APPLICATION_JSON, MediaType.WILDCARD})
@ApplicationScoped
public class NotificationResource {

    @Inject
    NotificationService notificationService;

    @Inject
    AuthContext authContext;

    @GET
    public Response getNotifications() {
        User currentUser = authContext.getCurrentUser();
        if (currentUser == null) {
            return Response.status(401).entity("{\"error\":\"Authentication required\"}").build();
        }
        NotificationsResponseDTO response = notificationService.getNotificationsForUser(currentUser.id);
        return Response.ok(response).build();
    }

    @PUT
    @Path("/{id}/read")
    public Response markAsRead(@PathParam("id") Long id) {
        User currentUser = authContext.getCurrentUser();
        if (currentUser == null) {
            return Response.status(401).entity("{\"error\":\"Authentication required\"}").build();
        }
        try {
            NotificationDTO dto = notificationService.markAsRead(id, currentUser.id);
            return Response.ok(dto).build();
        } catch (IllegalStateException e) {
            return Response.status(404).entity("{\"error\":\"" + e.getMessage() + "\"}").build();
        }
    }

    @PUT
    @Path("/read-all")
    public Response markAllAsRead() {
        User currentUser = authContext.getCurrentUser();
        if (currentUser == null) {
            return Response.status(401).entity("{\"error\":\"Authentication required\"}").build();
        }
        long unread = notificationService.markAllAsRead(currentUser.id);
        return Response.ok(Map.of("message", "All notifications marked as read", "unreadCount", unread)).build();
    }
}
