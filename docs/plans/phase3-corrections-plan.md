# Phase 3 Corrections Plan — Switch to Built-in Vert.x Sessions & Revert Migrations

## Context

Phase 3 (Auth & Users) was implemented with a custom `SessionManager` and H2-compatible Flyway migrations to accommodate testing. This deviates from the master plan (`docs/plans/securepm-mvp-plan.md`) which specifies:

- **Quarkus built-in Vert.x HTTP session management** (no custom session store)
- **PostgreSQL-only** Flyway migrations (production uses Postgres 16)

The user has requested corrections to align with the plan. This document is implementation-ready.

---

## Correction 1: Delete SessionManager, Use Vert.x Sessions

### 1a. Delete `backend/src/main/java/com/securepm/auth/SessionManager.java`

The custom in-memory session store is removed entirely. Quarkus's built-in Vert.x HTTP session management (configured in `application.properties` via `quarkus.http.session.cookie.*`) handles:
- Session creation
- `session_id` cookie lifecycle (HttpOnly, SameSite=Strict, Secure, MaxAge=1800)
- Session expiry

### 1b. Rewrite `AuthResource.java`

Replace `SessionManager` usage with `RoutingContext.session()`.

**New file content:**

```java
package com.securepm.auth;

import com.securepm.auth.dto.LoginRequest;
import com.securepm.auth.dto.LoginResponse;
import io.quarkus.vertx.core.runtime.context.VertxContextual;
import jakarta.enterprise.context.ApplicationScoped;
import jakarta.inject.Inject;
import jakarta.validation.Valid;
import jakarta.ws.rs.*;
import jakarta.ws.rs.core.MediaType;
import jakarta.ws.rs.core.Response;
import io.vertx.ext.web.RoutingContext;

@Path("/api/auth")
@Produces(MediaType.APPLICATION_JSON)
@Consumes(MediaType.APPLICATION_JSON)
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
    public Response login(@Valid LoginRequest request) {
        User user = User.find("username", request.username).firstResult();
        if (user == null || !user.active || !passwordService.verify(request.password, user.passwordHash)) {
            return Response.status(401)
                    .entity("{\"error\":\"Invalid credentials\"}")
                    .build();
        }

        io.vertx.ext.web.Session session = routingContext.session();
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
        User user = authContext.getCurrentUser();
        if (user == null) {
            return Response.status(401).build();
        }
        return Response.ok(new LoginResponse(user)).build();
    }
}
```

**Key changes:**
- Removed `@Inject SessionManager sessionManager`
- Added `@Inject RoutingContext routingContext`
- Login: replaced `sessionManager.createSession(user.id)` + manual `NewCookie` with `routingContext.session().put("userId", user.id)` — Quarkus auto-sets `session_id` cookie
- Logout: replaced manual cookie clearing with `routingContext.session().destroy()` — Quarkus auto-clears cookie
- Removed `isSecureConnection()` private method (no longer needed — Quarkus handles Secure flag via `quarkus.http.session.cookie.secure`)
- Removed `Cookie`, `NewCookie` imports

### 1c. Rewrite `SessionAuthFilter.java`

Read session from Vert.x `RoutingContext`, not from cookies + custom map.

**New file content:**

```java
package com.securepm.auth;

import jakarta.annotation.Priority;
import jakarta.inject.Inject;
import jakarta.ws.rs.Priorities;
import jakarta.ws.rs.container.ContainerRequestContext;
import jakarta.ws.rs.container.ContainerRequestFilter;
import jakarta.ws.rs.core.Response;
import jakarta.ws.rs.ext.Provider;
import java.io.IOException;
import io.vertx.ext.web.RoutingContext;

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
        if (path.startsWith("/api/auth/")) {
            return;
        }

        io.vertx.ext.web.Session session = routingContext.session();
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
```

**Key changes:**
- Removed `@Inject SessionManager sessionManager`
- Added `@Inject RoutingContext routingContext`
- Replaced cookie parsing (`requestContext.getCookies().get("session_id")`) with `routingContext.session()` — Quarkus handles cookie parsing internally
- Added `@ApplicationScoped` annotation removal (was unnecessary; `@Provider` is enough)
- Removed `Cookie` import

**Note on `RoutingContext` injection in `@Provider` filter:**
In Quarkus RESTEasy Reactive, `RoutingContext` is a CDI bean available during request processing. Since `ContainerRequestFilter` methods are invoked during request processing, `@Inject RoutingContext` works correctly. The `@RequestScoped` nature of `RoutingContext` ensures each request gets its own instance.

---

## Correction 2: Revert Flyway Migrations to PostgreSQL Syntax

Revert `TIMESTAMP` back to `TIMESTAMP WITH TIME ZONE` in all migration files.

### 2a. `V1__init.sql`
Change line 9–10:
```
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
```
Back to:
```
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
```

### 2b. `V2__projects.sql`
Same change: `TIMESTAMP` → `TIMESTAMP WITH TIME ZONE` (lines 9, 10)

### 2c. `V3__tasks.sql`
Same change: `TIMESTAMP` → `TIMESTAMP WITH TIME ZONE` (lines 14, 15)

### 2d. `V4__comments.sql`
Same change: `TIMESTAMP` → `TIMESTAMP WITH TIME ZONE` (lines 7, 8)

### 2e. `V5__attachments.sql`
Same change: `TIMESTAMP` → `TIMESTAMP WITH TIME ZONE` (line 8)

**Note:** `BIGINT GENERATED BY DEFAULT AS IDENTITY` is kept — this is valid PostgreSQL 16 syntax and a better standard than `BIGSERIAL`.

---

## Correction 3: Fix Test Configuration

### 3a. Rewrite `backend/src/test/resources/application.properties`

```properties
# Test profile: PostgreSQL via Quarkus Dev Services
# (requires Docker to be available — integration tests are @Disabled if Docker is unavailable)
quarkus.flyway.enabled=true
quarkus.flyway.baseline-on-migrate=true
quarkus.flyway.validate-on-migrate=true
quarkus.hibernate.orm.database.generation=none
quarkus.hibernate.orm.sql-load-script=no-load-script

# Quarkus Dev Services: auto-starts a PostgreSQL container for tests
quarkus.devservices.enabled=true
quarkus.devservices.image=postgres:16

# Test: cookies not secure (no HTTPS in tests)
quarkus.http.session.cookie.secure=false
```

### 3b. Remove `quarkus-jdbc-h2` from `pom.xml`

Delete this test dependency (lines 85–89):

```xml
<dependency>
    <groupId>io.quarkus</groupId>
    <artifactId>quarkus-jdbc-h2</artifactId>
    <scope>test</scope>
</dependency>
```

**Rationale:** Tests should use PostgreSQL (via Dev Services) to validate the actual Flyway migrations. H2 in PostgreSQL mode doesn't fully replicate PG behavior. Integration tests remain `@Disabled` if Docker is unavailable.

### 3c. Keep `@Disabled` on integration tests

Both `AuthResourceTest.java` and `UserResourceTest.java` remain `@Disabled` until PostgreSQL (via Docker) is available. `PasswordServiceTest` (pure unit test, no database) continues to pass.

---

## Correction 4: AppInitializer — KEEP try/catch

The `try/catch` around `User.count()` is kept. This is good defensive programming — it prevents startup failure if the schema isn't ready yet (e.g., in edge cases during testing). **No change needed.**

---

## Validation Steps

1. **`mvn compile`** — Must succeed with no compilation errors
2. **`mvn test -pl '!backend/src/test/java/com/securepm/auth/AuthResourceTest.java,!backend/src/test/java/com/securepm/auth/UserResourceTest.java'` or `mvn test` with @Disabled tests** — At minimum, `PasswordServiceTest` should pass (5 tests)
3. **`mvn compile quarkus:dev`** with Docker running — Verify login works:
   ```bash
   curl -c cookies.txt -X POST http://localhost:8080/api/auth/login \
     -H "Content-Type: application/json" \
     -d '{"username":"admin","password":"ChangeMeNow123!"}'
   curl -b cookies.txt http://localhost:8080/api/users
   ```

---

## Affected Files Summary

**Delete:**
- `backend/src/main/java/com/securepm/auth/SessionManager.java`

**Rewrite:**
- `backend/src/main/java/com/securepm/auth/AuthResource.java`
- `backend/src/main/java/com/securepm/auth/SessionAuthFilter.java`
- `backend/src/test/resources/application.properties`

**Revert (TIMESTAMP only):**
- `backend/src/main/resources/db/migration/V1__init.sql`
- `backend/src/main/resources/db/migration/V2__projects.sql`
- `backend/src/main/resources/db/migration/V3__tasks.sql`
- `backend/src/main/resources/db/migration/V4__comments.sql`
- `backend/src/main/resources/db/migration/V5__attachments.sql`

**Edit:**
- `backend/pom.xml` (remove `quarkus-jdbc-h2` test dependency)

**Keep as-is:**
- `backend/src/main/java/com/securepm/auth/AppInitializer.java` (try/catch stays)
- All DTOs, `PasswordService`, `Role`, `User`, `AuthContext`, `UserResource`
- `PasswordServiceTest.java`
- `AuthResourceTest.java`, `UserResourceTest.java` (both @Disabled)
- `docs/endpoints.md`

---

## Phase 4 Readiness

After corrections are applied and `mvn compile` succeeds, Phase 4 (Project Management) can begin. All auth infrastructure will use Quarkus built-in Vert.x sessions, ready for WebSocket integration in Phase 7.
