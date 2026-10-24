package com.securepm.auth;

import com.securepm.auth.dto.CreateUserRequest;
import com.securepm.auth.dto.UpdateUserRequest;
import com.securepm.auth.dto.UserDTO;
import com.securepm.auth.dto.UsernameAvailabilityResponse;
import jakarta.enterprise.context.ApplicationScoped;
import jakarta.inject.Inject;
import jakarta.transaction.Transactional;
import jakarta.validation.Valid;
import jakarta.ws.rs.*;
import jakarta.ws.rs.core.MediaType;
import jakarta.ws.rs.core.Response;

import java.util.List;
import java.util.stream.Collectors;

@Path("/api/users")
@Produces(MediaType.APPLICATION_JSON)
@Consumes(MediaType.APPLICATION_JSON)
@ApplicationScoped
public class UserResource {

    @Inject
    AuthContext authContext;

    @Inject
    PasswordService passwordService;

    @GET
    @Path("/check-username")
    public Response checkUsername(@QueryParam("username") String username) {
        if (username == null || username.trim().length() < 3) {
            return Response.ok(new UsernameAvailabilityResponse(username, false, "Username must be at least 3 characters")).build();
        }
        String clean = username.trim().toLowerCase();
        if (!clean.matches("^[a-zA-Z0-9_.-]+$")) {
            return Response.ok(new UsernameAvailabilityResponse(username, false, "Username can only contain letters, numbers, underscores, dots, and hyphens")).build();
        }
        if (clean.length() > 50) {
            return Response.ok(new UsernameAvailabilityResponse(username, false, "Username must not exceed 50 characters")).build();
        }
        long count = User.count("LOWER(username) = ?1 and active = true", clean);
        if (count > 0) {
            return Response.ok(new UsernameAvailabilityResponse(username, false, "Username is already taken")).build();
        }
        return Response.ok(new UsernameAvailabilityResponse(username, true, "Username is available")).build();
    }

    @POST
    @Transactional
    public Response createUser(@Valid CreateUserRequest request) {
        if (!authContext.isAdmin()) {
            return Response.status(403).entity("{\"error\":\"Access denied\"}").build();
        }
        String cleanUsername = request.username.trim().toLowerCase();
        if (User.count("LOWER(username) = ?1 and active = true", cleanUsername) > 0) {
            return Response.status(409).entity("{\"error\":\"Username already exists\"}").build();
        }
        String cleanEmail = request.email.trim().toLowerCase();
        if (User.count("LOWER(email) = ?1", cleanEmail) > 0) {
            return Response.status(409).entity("{\"error\":\"Email already exists\"}").build();
        }

        User currentUser = authContext.getCurrentUser();
        User user = new User();
        user.username = request.username.trim();
        user.email = cleanEmail;
        user.fullName = request.fullName.trim();
        user.passwordHash = passwordService.hash(request.password);
        user.role = Role.valueOf(request.role.toUpperCase());
        user.active = true;
        user.createdBy = currentUser != null ? currentUser.id : null;
        user.persist();
        return Response.status(201).entity(new UserDTO(user)).build();
    }

    @GET
    public Response listUsers() {
        User currentUser = authContext.getCurrentUser();
        if (currentUser == null) {
            return Response.status(401).entity("{\"error\":\"Authentication required\"}").build();
        }
        if (authContext.isAdmin()) {
            List<UserDTO> users = User.findAll().list().stream()
                    .map(u -> new UserDTO((User) u))
                    .collect(Collectors.toList());
            return Response.ok(users).build();
        }
        // Standard users can list active users for project member assignment
        List<UserDTO> users = User.find("active = true").list().stream()
                .map(u -> new UserDTO((User) u))
                .collect(Collectors.toList());
        return Response.ok(users).build();
    }

    @GET
    @Path("/{id}")
    public Response getUser(@PathParam("id") Long id) {
        if (!authContext.isAdmin()) {
            return Response.status(403).entity("{\"error\":\"Access denied\"}").build();
        }
        User user = User.findById(id);
        if (user == null) {
            return Response.status(404).entity("{\"error\":\"User not found\"}").build();
        }
        return Response.ok(new UserDTO(user)).build();
    }

    @PUT
    @Path("/{id}")
    @Transactional
    public Response updateUser(@PathParam("id") Long id, @Valid UpdateUserRequest request) {
        if (!authContext.isAdmin()) {
            return Response.status(403).entity("{\"error\":\"Access denied\"}").build();
        }
        User currentUser = authContext.getCurrentUser();
        User target = User.findById(id);
        if (target == null) {
            return Response.status(404).entity("{\"error\":\"User not found\"}").build();
        }

        // Hierarchy rule 1: Secondary admin cannot modify super admin
        if (target.isSuperAdmin() && !currentUser.isSuperAdmin()) {
            return Response.status(403).entity("{\"error\":\"Cannot modify super administrator\"}").build();
        }

        // Hierarchy rule 2: Super admin protections (email immutable, cannot demote, cannot deactivate)
        if (target.isSuperAdmin()) {
            if (request.email != null && !request.email.trim().equalsIgnoreCase(target.email)) {
                return Response.status(400).entity("{\"error\":\"Super administrator email cannot be modified\"}").build();
            }
            if (request.role != null && !Role.valueOf(request.role.toUpperCase()).equals(Role.ADMIN)) {
                return Response.status(400).entity("{\"error\":\"Super administrator role cannot be changed\"}").build();
            }
            if (request.active != null && !request.active) {
                return Response.status(400).entity("{\"error\":\"Super administrator cannot be deactivated\"}").build();
            }
        }

        // Rule 3: Any admin cannot modify their own email, role, or active status
        if (target.id.equals(currentUser.id)) {
            if (request.email != null && !request.email.trim().equalsIgnoreCase(target.email)) {
                return Response.status(400).entity("{\"error\":\"Cannot modify your own email\"}").build();
            }
            if (request.role != null && !Role.valueOf(request.role.toUpperCase()).equals(target.role)) {
                return Response.status(400).entity("{\"error\":\"Cannot modify your own role\"}").build();
            }
            if (request.active != null && !request.active) {
                return Response.status(400).entity("{\"error\":\"Cannot deactivate yourself\"}").build();
            }
        }

        // Hierarchy rule 3: If target is another admin, only creator or super admin can modify
        if (target.role == Role.ADMIN && !target.id.equals(currentUser.id)) {
            if (!currentUser.isSuperAdmin() && (target.createdBy == null || !target.createdBy.equals(currentUser.id))) {
                return Response.status(403).entity("{\"error\":\"Only creator or super admin can modify this admin\"}").build();
            }
        }

        if (request.fullName != null && !request.fullName.isBlank()) {
            target.fullName = request.fullName.trim();
        }
        if (request.email != null && !request.email.isBlank()) {
            String cleanEmail = request.email.trim().toLowerCase();
            long count = User.count("LOWER(email) = ?1 and id != ?2", cleanEmail, target.id);
            if (count > 0) {
                return Response.status(409).entity("{\"error\":\"Email already exists\"}").build();
            }
            target.email = cleanEmail;
        }
        if (request.password != null && !request.password.isBlank()) {
            target.passwordHash = passwordService.hash(request.password);
        }
        if (request.role != null && !request.role.isBlank()) {
            target.role = Role.valueOf(request.role.toUpperCase());
        }
        if (request.active != null) {
            target.active = request.active;
        }

        return Response.ok(new UserDTO(target)).build();
    }

    @DELETE
    @Path("/{id}")
    @Transactional
    public Response deleteUser(@PathParam("id") Long id) {
        if (!authContext.isAdmin()) {
            return Response.status(403).entity("{\"error\":\"Access denied\"}").build();
        }
        User currentUser = authContext.getCurrentUser();
        User target = User.findById(id);
        if (target == null) {
            return Response.status(404).entity("{\"error\":\"User not found\"}").build();
        }

        // Hierarchy rule 1: Cannot delete yourself
        if (currentUser != null && target.id.equals(currentUser.id)) {
            return Response.status(400).entity("{\"error\":\"You cannot delete your own account\"}").build();
        }

        // Hierarchy rule 2: Super admin cannot be deleted
        if (target.isSuperAdmin()) {
            return Response.status(403).entity("{\"error\":\"Super administrator cannot be deleted\"}").build();
        }

        // Hierarchy rule 3: If target is another admin, only creator or super admin can delete
        if (target.role == Role.ADMIN) {
            if (!currentUser.isSuperAdmin() && (target.createdBy == null || !target.createdBy.equals(currentUser.id))) {
                return Response.status(403).entity("{\"error\":\"Only creator or super admin can delete this admin\"}").build();
            }
        }

        // Soft delete: deactivate user (frees up username for reuse due to active-only index)
        target.active = false;
        return Response.ok("{\"message\":\"User deactivated\"}").build();
    }
}
