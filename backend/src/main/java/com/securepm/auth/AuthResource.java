package com.securepm.auth;

import com.securepm.auth.dto.LoginRequest;
import com.securepm.auth.dto.LoginResponse;
import com.securepm.auth.dto.UpdateProfileRequest;
import io.vertx.ext.web.RoutingContext;
import jakarta.enterprise.context.ApplicationScoped;
import jakarta.inject.Inject;
import jakarta.transaction.Transactional;
import jakarta.validation.Valid;
import jakarta.ws.rs.*;
import jakarta.ws.rs.core.MediaType;
import jakarta.ws.rs.core.Response;

@Path("/api/auth")
@Produces(MediaType.APPLICATION_JSON)
@ApplicationScoped
public class AuthResource {

    @Inject
    PasswordService passwordService;

    @Inject
    AuthContext authContext;

    @Inject
    RoutingContext routingContext;

    @POST
    @Path("/login")
    @Consumes(MediaType.APPLICATION_JSON)
    public Response login(@Valid LoginRequest request) {
        User user = User.find("username", request.username).firstResult();
        if (user == null || !user.active || !passwordService.verify(request.password, user.passwordHash)) {
            return Response.status(401)
                    .entity("{\"error\":\"Invalid credentials\"}")
                    .build();
        }

        io.vertx.ext.web.Session session = routingContext.session();
        if (session == null) {
            return Response.status(500)
                    .entity("{\"error\":\"Session unavailable\"}")
                    .build();
        }
        session.put("userId", user.id);

        return Response.ok(new LoginResponse(user)).build();
    }

    @POST
    @Path("/logout")
    public Response logout() {
        io.vertx.ext.web.Session session = routingContext.session();
        if (session != null) {
            session.destroy();
        }
        return Response.ok("{\"message\":\"Logged out\"}").build();
    }

    @GET
    @Path("/me")
    public Response me() {
        io.vertx.ext.web.Session session = routingContext.session();
        if (session == null) {
            return Response.status(401).build();
        }
        Long userId = session.get("userId");
        if (userId == null) {
            return Response.status(401).build();
        }
        User user = User.findById(userId);
        if (user == null || !user.active) {
            return Response.status(401).build();
        }
        return Response.ok(new LoginResponse(user)).build();
    }

    @PUT
    @Path("/profile")
    @Consumes(MediaType.APPLICATION_JSON)
    @Transactional
    public Response updateProfile(@Valid UpdateProfileRequest request) {
        User currentUser = authContext.getCurrentUser();
        if (currentUser == null) {
            return Response.status(401).entity("{\"error\":\"Authentication required\"}").build();
        }
        User user = User.findById(currentUser.id);
        if (user == null || !user.active) {
            return Response.status(401).entity("{\"error\":\"User not found\"}").build();
        }

        if (request.fullName != null && !request.fullName.isBlank()) {
            user.fullName = request.fullName.trim();
        }

        if (request.newPassword != null && !request.newPassword.isBlank()) {
            if (request.currentPassword == null || !passwordService.verify(request.currentPassword, user.passwordHash)) {
                return Response.status(400).entity("{\"error\":\"Current password is incorrect\"}").build();
            }
            user.passwordHash = passwordService.hash(request.newPassword);
        }

        return Response.ok(new LoginResponse(user)).build();
    }
}
