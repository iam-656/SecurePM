package com.securepm.auth;

import io.vertx.ext.web.RoutingContext;
import io.vertx.ext.web.Session;
import jakarta.annotation.Priority;
import jakarta.inject.Inject;
import jakarta.ws.rs.Priorities;
import jakarta.ws.rs.container.ContainerRequestContext;
import jakarta.ws.rs.container.ContainerRequestFilter;
import jakarta.ws.rs.core.Response;
import jakarta.ws.rs.ext.Provider;
import java.io.IOException;

@Provider
@Priority(Priorities.AUTHENTICATION)
public class SessionAuthFilter implements ContainerRequestFilter {

    @Inject
    AuthContext authContext;

    @Inject
    RoutingContext routingContext;

    @Override
    public void filter(ContainerRequestContext requestContext) throws IOException {
        String path = requestContext.getUriInfo().getPath();
        if (path.equals("/api/auth/login") || path.equals("api/auth/login")) {
            return;
        }

        Session session = routingContext.session();
        if (session == null) {
            requestContext.abortWith(
                    Response.status(401)
                            .entity("{\"error\":\"Authentication required\"}")
                            .build());
            return;
        }

        Long userId = session.get("userId");
        if (userId == null) {
            requestContext.abortWith(
                    Response.status(401)
                            .entity("{\"error\":\"Invalid or expired session\"}")
                            .build());
            return;
        }

        User user = User.findById(userId);
        if (user == null || !user.active) {
            requestContext.abortWith(
                    Response.status(401)
                            .entity("{\"error\":\"Authentication required\"}")
                            .build());
            return;
        }

        authContext.setCurrentUser(user);
    }
}
