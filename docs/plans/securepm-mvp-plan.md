# SecurePM MVP Implementation Plan

## Overview

Build a complete on-premises project and task management platform:
- **Backend**: Quarkus 3.40 LTS (Java 25, Maven 3.10.0) — REST API, WebSocket, PostgreSQL, Flyway
- **Frontend**: React 19 + TypeScript 5 + Vite 5/6 — SPA with List and Kanban views
- **Infrastructure**: Docker Compose (postgres, quarkus-app, nginx), mkcert for local HTTPS

## Key Decisions

| Decision | Choice | Rationale |
|---|---|---|
| Auth mechanism | Session-based (HttpOnly cookies via Quarkus Vert.x HTTP session) | Simpler for on-prem, browser handles cookies, no token management |
| React version | React 19 | Latest stable, full TypeScript 5 support |
| Frontend state | React Context + hooks | Simpler than external libs (Redux/Zustand), sufficient for MVP |
| HTTP client | Axios with `credentials: 'include'` | Browser sends session cookies automatically |
| Styling | Tailwind CSS v3 (explicitly pinned) | Stable, predictable build behavior |
| DB access | Hibernate ORM + Panache | Quarkus standard, minimal boilerplate |
| Backend mode | JVM | Simpler build than native for MVP |

---

## Project Structure

```
SecurePM/
├── backend/                          # Quarkus application
│   ├── pom.xml
│   ├── Dockerfile
│   ├── src/main/java/com/securepm/
│   │   ├── SecurePMApplication.java
│   │   ├── auth/         # Session auth filter, password service, auth resources
│   │   ├── projects/     # Project entity, DTOs, service, resource
│   │   ├── tasks/        # Task entity, enums, service, resource
│   │   ├── comments/     # Comment entity, service, resource
│   │   ├── attachments/  # Attachment entity, service, resource
│   │   └── realtime/     # WebSocket endpoint, session manager
│   ├── src/main/resources/
│   │   ├── application.properties
│   │   ├── application-dev.properties
│   │   ├── application-prod.properties
│   │   └── db/migration/
│   │       ├── V0__seed.sql
│   │       ├── V1__init.sql
│   │       ├── V2__projects.sql
│   │       ├── V3__tasks.sql
│   │       ├── V4__comments.sql
│   │       └── V5__attachments.sql
│   └── src/test/java/...
├── frontend/                         # React + Vite application
│   ├── package.json
│   ├── vite.config.ts
│   ├── tsconfig.json
│   ├── tailwind.config.cjs
│   ├── postcss.config.cjs
│   ├── Dockerfile
│   └── src/
│       ├── api/         # axios client (withCredentials), API modules
│       ├── components/  # UI components
│       ├── hooks/       # React hooks (useAuth, useWebSocket, etc.)
│       ├── pages/       # route pages
│       ├── stores/      # context providers
│       ├── types/       # TypeScript types
│       ├── App.tsx
│       └── main.tsx
├── docker-compose.yml
├── nginx/
│   ├── nginx.conf
│   └── certs/           # mkcert-generated certificates
├── .gitignore
└── docs/
```

---

## Phase 1: Infrastructure & Environment Bootstrap

### 1.1 Docker Compose (Root)

Create `docker-compose.yml` at project root:

```yaml
services:
  postgres:
    image: postgres:16
    container_name: securepm-postgres
    volumes:
      - pg_data:/var/lib/postgresql/data
    environment:
      POSTGRES_USER: securepm
      POSTGRES_PASSWORD: securepm
      POSTGRES_DB: securepm
    restart: unless-stopped
    ports:
      - "5432:5432"

  quarkus-app:
    build: ./backend
    container_name: securepm-app
    depends_on:
      - postgres
    volumes:
      - attachments:/data/attachments
    environment:
      QUARKUS_DATASOURCE_JDBC_URL: jdbc:postgresql://postgres:5432/securepm
      QUARKUS_DATASOURCE_USERNAME: securepm
      QUARKUS_DATASOURCE_PASSWORD: securepm
      QUARKUS_PROFILE: prod
      APP_BOOTSTRAP_ADMIN_PASSWORD: ${APP_BOOTSTRAP_ADMIN_PASSWORD:-ChangeMeNow123!}
    restart: unless-stopped

  nginx:
    image: nginx:alpine
    container_name: securepm-nginx
    depends_on:
      - quarkus-app
      - frontend
    ports:
      - "80:80"
      - "443:443"
    volumes:
      - ./nginx/nginx.conf:/etc/nginx/nginx.conf:ro
      - ./nginx/certs:/etc/nginx/certs:ro
      - attachments:/data/attachments:ro
      - frontend-build:/usr/share/nginx/html:ro
    restart: unless-stopped

  frontend:
    build: ./frontend
    container_name: securepm-frontend
    volumes:
      - frontend-build:/usr/share/nginx/html
    restart: unless-stopped

volumes:
  pg_data:
  attachments:
  frontend-build:
```

### 1.2 mkcert Local HTTPS

- Install: `brew install mkcert` (macOS) or `apt install mkcert` (Linux)
- Create local CA: `mkcert -install`
- Generate cert: `mkcert pm.local localhost 127.0.0.1`
- Place certs in `nginx/certs/` (pm.local.pem, pm.local-key.pem)
- Add to `/etc/hosts`: `127.0.0.1 pm.local`
- Nginx: HTTPS on 443, redirect HTTP 80 → 443

### 1.3 Nginx Configuration

Create `nginx/nginx.conf`:
- SSL termination with mkcert certs on port 443
- Proxy `/api/` → `http://quarkus-app:8080`
- Proxy `/ws/` → `http://quarkus-app:8080` with WebSocket upgrade headers:
  - `proxy_http_version 1.1`
  - `proxy_set_header Upgrade $http_upgrade`
  - `proxy_set_header Connection "upgrade"`
- Serve frontend static files from `/usr/share/nginx/html`
- Session cookies pass through automatically (proxy preserves cookies)
- SPA fallback: `try_files $uri $uri/ /index.html`
- Attachments served via backend API only (not direct Nginx) for auth enforcement

### 1.4 Database Verification
- `docker compose up postgres`
- Verify: `psql -h localhost -U securepm -d securepm`

---

## Phase 2: Backend — Project Setup & DB Migrations

### 2.1 Create Quarkus Backend Project
- Generate: `mvn io.quarkus:quarkus-maven-plugin:create -DprojectGroupId=com.securepm -DprojectArtifactId=securepm-backend -DclassName="com.securepm.SecurePMApplication" -Dpath="/health"`
- Java 25, Quarkus 3.40 LTS, Maven 3.10.0
- Set source/target to Java 25 in pom.xml

### 2.2 Add Quarkus Extensions
```
quarkus-resteasy-reactive-jackson   → REST + JSON serialization
quarkus-hibernate-orm-panache        → Entities with Panache (active record pattern)
quarkus-jdbc-postgresql             → PostgreSQL JDBC driver
quarkus-flyway                       → Database migrations on startup
quarkus-elytron-security             → Security annotations (@RolesAllowed)
quarkus-hibernate-validator          → Bean validation (@NotBlank, etc.)
quarkus-resteasy-reactive-multipart  → File uploads
quarkus-websockets-next              → WebSocket support (Quarkus 3.x)
```
Install: `quarkus extension add <ext>` for each, or edit pom.xml manually.

### 2.3 Remove Unnecessary Extensions
- ~~`quarkus-smallrye-jwt`~~ — not needed (session-based auth, not JWT)

### 2.4 Database Migrations (Flyway)

Location: `src/main/resources/db/migration/`

**V0__seed.sql** — Initial Admin Bootstrap
```sql
-- No rows inserted. Admin user is created at application startup
-- by AppInitializer.java (Phase 3.6) which reads the password from
-- env var APP_BOOTSTRAP_ADMIN_PASSWORD.
-- This file exists to ensure V0 runs before V1 (seed before schema
-- is not needed, but the placeholder documents the approach).
```

**V1__init.sql** — Users
```sql
CREATE TABLE users (
    id BIGSERIAL PRIMARY KEY,
    username VARCHAR(50) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    full_name VARCHAR(100) NOT NULL,
    role VARCHAR(20) NOT NULL,
    active BOOLEAN DEFAULT TRUE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
CREATE INDEX idx_users_username ON users(username);
```

**V2__projects.sql** — Projects & Project_Members
```sql
CREATE TABLE projects (
    id BIGSERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    description TEXT,
    project_key VARCHAR(10) UNIQUE NOT NULL,
    created_by BIGINT NOT NULL REFERENCES users(id),
    archived BOOLEAN DEFAULT FALSE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
CREATE INDEX idx_projects_created_by ON projects(created_by);

CREATE TABLE project_members (
    project_id BIGINT NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    PRIMARY KEY (project_id, user_id)
);
```

**V3__tasks.sql** — Tasks (with optimistic locking version column)
```sql
CREATE TABLE tasks (
    id BIGSERIAL PRIMARY KEY,
    project_id BIGINT NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    status VARCHAR(20) NOT NULL DEFAULT 'TODO',
    priority VARCHAR(10) NOT NULL DEFAULT 'MEDIUM',
    assignee_id BIGINT REFERENCES users(id),
    due_date DATE,
    created_by BIGINT NOT NULL REFERENCES users(id),
    updated_by BIGINT NOT NULL REFERENCES users(id),
    version BIGINT DEFAULT 1 NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
CREATE INDEX idx_tasks_project_id ON tasks(project_id);
CREATE INDEX idx_tasks_status ON tasks(status);
CREATE INDEX idx_tasks_assignee ON tasks(assignee_id);
CREATE INDEX idx_tasks_due_date ON tasks(due_date);
```

**V4__comments.sql**
```sql
CREATE TABLE comments (
    id BIGSERIAL PRIMARY KEY,
    task_id BIGINT NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
    author_id BIGINT NOT NULL REFERENCES users(id),
    content TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
CREATE INDEX idx_comments_task_id ON comments(task_id);
CREATE INDEX idx_comments_author_id ON comments(author_id);
```

**V5__attachments.sql**
```sql
CREATE TABLE attachments (
    id BIGSERIAL PRIMARY KEY,
    task_id BIGINT NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
    file_path VARCHAR(500) NOT NULL,
    original_name VARCHAR(255) NOT NULL,
    file_size BIGINT NOT NULL,
    uploaded_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
CREATE INDEX idx_attachments_task_id ON attachments(task_id);
```

### 2.5 Application Properties

**application.properties** (common, dev + prod):
```properties
# Flyway
quarkus.flyway.enabled=true
quarkus.flyway.baseline-on-migrate=true
quarkus.flyway.validate-on-migrate=true

# Hibernate ORM
quarkus.hibernate.orm.database.generation=none
quarkus.hibernate.orm.sql-load-script=no-load-script

# CORS (frontend dev server in dev; nginx in prod)
quarkus.http.cors=true
quarkus.http.cors.origins=http://localhost:5173
quarkus.http.cors.headers=Content-Type,Cookie
quarkus.http.cors.exposed-headers=*
# Note: Quarkus allows credentials when origin is specific (not wildcard)

# HTTP
quarkus.http.host=0.0.0.0
quarkus.http.port=8080
quarkus.http.max-form-attribute-size=10485760  # 10MB upload limit
quarkus.http.body.merge-form-attributes=true

# Sessions (Quarkus built-in Vert.x HTTP session management)
# Quarkus automatically creates/manages the session_id cookie on the Vert.x Session.
# No custom SessionStore needed — Quarkus handles cookie lifecycle, expiry, and encryption.
quarkus.http.session.cookie.name=session_id
quarkus.http.session.cookie.http-only=true
quarkus.http.session.cookie.same-site=STRICT
quarkus.http.session.cookie.path=/
quarkus.http.session.timeout=1800  # 30 minutes

# Dev services (auto-start PostgreSQL in dev if Docker available)
%dev.quarkus.devservices.enabled=true
%dev.quarkus.devservices.image=postgres:16
```

> **Key correction**: Removed fake `quarkus.http.body.part-sized=true`. Correct Quarkus properties: `quarkus.http.max-form-attribute-size` and `quarkus.http.body.merge-form-attributes`.

**application-dev.properties** (%dev):
```properties
quarkus.datasource.db-kind=postgresql
quarkus.datasource.username=securepm
quarkus.datasource.password=securepm
quarkus.datasource.jdbc.url=jdbc:postgresql://localhost:5432/securepm
quarkus.http.session.cookie.secure=false  # dev mode: no HTTPS required
```

**application-prod.properties** (%prod):
```properties
quarkus.datasource.db-kind=postgresql
quarkus.datasource.username=${POSTGRES_USER:securepm}
quarkus.datasource.password=${POSTGRES_PASSWORD:securepm}
quarkus.datasource.jdbc.url=${QUARKUS_DATASOURCE_JDBC_URL:jdbc:postgresql://postgres:5432/securepm}
quarkus.http.session.cookie.secure=true  # prod: HTTPS only
```

### 2.6 Backend Dockerfile
Create `backend/Dockerfile`:
```dockerfile
FROM maven:3.10-eclipse-temurin-25 AS build
WORKDIR /build
COPY pom.xml .
COPY src ./src
RUN mvn -B package -DskipTests

FROM eclipse-temurin:25-jre-alpine
WORKDIR /work
COPY --from=build /build/target/*-runner.jar /work/application.jar
EXPOSE 8080
ENTRYPOINT ["java", "-jar", "/work/application.jar"]
```

---

## Phase 3: Backend — Authentication & Users (Session-Based)

### 3.1 Password Hashing
- Add `jBCrypt` dependency (`org.mindrot:jbcrypt:0.4.1`) to pom.xml
- Create `PasswordService.java`:
  - `hash(String plaintext)` → bcrypt hash (12 rounds)
  - `verify(String plaintext, String hash)` → boolean

### 3.2 Session Management (Quarkus Vert.x HTTP Session)

Use Quarkus's **built-in Vert.x HTTP session management** (configured in Phase 2.5):
- Quarkus automatically handles the `session_id` cookie lifecycle: creation, expiry, HttpOnly, SameSite
- On login: store `userId` and `role` in the Vert.x `Session` via `RoutingContext.session()`
- Quarkus sets the `session_id` cookie automatically — no custom session ID generation
- No custom `SessionStore` needed — Quarkus manages session state in-memory
- Sessions expire after 30 minutes of inactivity (configured via `quarkus.http.session.timeout`)

### 3.3 Session Auth Filter
Create `SessionAuthFilter.java` (`@ServerRequestFilter`):
- Reads the Vert.x HTTP `Session` from the request context
- Extracts `userId` from the session (set during login)
- Loads `User` from DB and creates a `SecurityIdentity` with principal name = username, role = user's role
- If no session or invalid: leaves `SecurityIdentity` null → Quarkus returns 401
- This replaces the need for a custom `HttpAuthenticationMechanism` — Quarkus Vert.x session handles cookie management, the filter handles identity resolution

### 3.4 Auth Entities & Enums
- `Role.java` — enum: `ADMIN`, `MEMBER`
- `User.java` (extends PanacheEntity):
  - Fields: `username`, `passwordHash`, `fullName`, `role`, `active` (default true), `createdAt`, `updatedAt`

DTOs (each in own file):
- `LoginRequest.java` — `username`, `password`
- `LoginResponse.java` — `username`, `fullName`, `role`, `active`
- `CreateUserRequest.java` — `username`, `password`, `fullName`, `role`
- `UpdateUserRequest.java` — `fullName`, `password` (optional), `role`, `active`

### 3.5 Auth Resources (Session-Based)

**AuthResource.java** (`/api/auth`):

| Method | Path | Auth | Description |
|---|---|---|---|
| POST | `/api/auth/login` | None | Verify password → store userId in Vert.x session → Quarkus sets `session_id` cookie automatically |
| POST | `/api/auth/logout` | None | Destroy session → clear `session_id` cookie |
| GET | `/api/auth/me` | Session | Return current user info (for frontend to check auth state) |

Login flow:
1. Receive `LoginRequest` (username, password)
2. Look up `User` by username, verify password with `PasswordService.verify()`
3. If invalid or inactive → 401 with generic message ("Invalid credentials")
4. Get Vert.x `Session` from `RoutingContext.session()`
5. Store `userId` + `role` in the session
6. Quarkus automatically sets the `session_id` cookie (HttpOnly, SameSite=Strict, Secure in prod)
7. Return `LoginResponse` with user info

Logout flow:
1. Get Vert.x `Session` from `RoutingContext.session()`
2. Call `session.destroy()` — Quarkus clears the `session_id` cookie
3. Return success

**UserResource.java** (`/api/users`, `@RolesAllowed("ADMIN")`):

| Method | Path | Description |
|---|---|---|
| POST | `/api/users` | Create user (hash password with bcrypt) |
| GET | `/api/users` | List active users |
| GET | `/{id}` | Get user by ID |
| PUT | `/{id}` | Update user (fullName, optionally password, role, active) |
| DELETE | `/{id}` | **Soft delete**: set `active=false` (user cannot log in; data preserved for audit) |

### 3.6 Admin Seed (Bootstrap)
Create `AppInitializer.java` (`@Singleton @Startup`):
```java
@Singleton
@Startup
public class AppInitializer {
    void onStart(@Observes StartupEvent ev) {
        if (User.count() == 0) {
            String defaultPassword = System.getenv().getOrDefault(
                "APP_BOOTSTRAP_ADMIN_PASSWORD", "ChangeMeNow123!");
            User admin = new User();
            admin.username = "admin";
            admin.passwordHash = PasswordService.hash(defaultPassword);
            admin.fullName = "System Administrator";
            admin.role = Role.ADMIN;
            admin.active = true;
            admin.persist();
            // Log creation (do NOT log password)
        }
    }
}
```
- Bootstrap password from env var `APP_BOOTSTRAP_ADMIN_PASSWORD` (rule 6: no hardcoded secrets)
- Default `ChangeMeNow123!` for initial setup only
- Only creates admin if no users exist (chicken-and-egg solved)

### 3.7 Frontend API Client
Create `src/api/client.ts`:
```ts
const client = axios.create({
  baseURL: '/api',
  withCredentials: true,  // CRITICAL: sends session_id cookie automatically
});
// No Authorization header needed — browser handles session cookies
// No localStorage needed — no token to store
// 401 response → redirect to /login
```

### 3.8 Verify
- `mvn quarkus:dev` — start server
- `curl -c cookies.txt -X POST http://localhost:8080/api/auth/login -H "Content-Type: application/json" -d '{"username":"admin","password":"ChangeMeNow123!"}'`
- `curl -b cookies.txt http://localhost:8080/api/users` — verify session auth works

---

## Phase 4: Backend — Project Management

### 4.1 Entities & DTOs
- `Project.java` (PanacheEntity) — `name`, `description`, `projectKey`, `createdBy FK→User`, `members Set<User>`, `archived`, timestamps
- `ProjectDTO.java` — flat DTO with `createdByName`, `memberSummaries` (List<UserSummaryDTO>)
- `ProjectMapper.java` — Project ↔ ProjectDTO conversion (avoids lazy-loading JSON issues)

### 4.2 ProjectService.java
- `createProject(dto, currentUser)` — ADMIN only, validate key uniqueness, set createdBy
- `listProjects(currentUser)` — projects where user is creator or member, not archived
- `getProject(id, currentUser)` — verify access (creator or member)
- `updateProject(id, dto, currentUser)` — ADMIN only
- `archiveProject(id, currentUser)` — ADMIN only, set archived=true
- `addMember(projectId, userId, currentUser)` — ADMIN only, verify user is active
- `removeMember(projectId, userId, currentUser)` — ADMIN only
- `isMember(projectId, user)` — returns true if user is creator or in project_members (used by WebSocket)

### 4.3 ProjectResource.java (`/api/projects`)

| Method | Path | Auth | Description |
|---|---|---|---|
| POST | `/api/projects` | ADMIN | Create project |
| GET | `/api/projects` | Auth | List user's projects (non-archived) |
| GET | `/api/projects/{id}` | Member | Project details + members |
| PUT | `/api/projects/{id}` | ADMIN | Update project |
| DELETE | `/api/projects/{id}` | ADMIN | Archive project |
| POST | `/api/projects/{id}/members` | ADMIN | Add active member |
| DELETE | `/api/projects/{id}/members/{userId}` | ADMIN | Remove member |

---

## Phase 5: Backend — Task Management

### 5.1 Entities & Enums
- `TaskStatus.java` — enum: `TODO`, `IN_PROGRESS`, `REVIEW`, `DONE`
- `TaskPriority.java` — enum: `LOW`, `MEDIUM`, `HIGH`
- `Task.java` (PanacheEntity) — `project FK`, `title`, `description`, `status`, `priority`, `assignee FK→User`, `dueDate`, `createdBy`, `updatedBy`, **`@Version Long version`** for optimistic locking, timestamps
- `TaskDTO.java` — flat DTO with `assigneeName`, `createdByName`, `version`
- `CreateTaskRequest.java`, `UpdateTaskRequest.java` — include `version` for optimistic locking

### 5.2 Optimistic Locking
- `@Version private Long version;` on `Task` entity (Panache auto-increments on update)
- DTOs include `version` field
- On update: if `dto.version != task.version` → throw `OptimisticLockException` → 409 Conflict
- Frontend must send current `version` when updating tasks
- Frontend should handle 409 by showing "Task was modified by another user" error

### 5.3 Pagination Envelope
Create `PageResponse.java`:
```java
public class PageResponse<T> {
    List<T> items;
    long total;
    int page;        // zero-based
    int size;        // page size
    int totalPages;  // computed: ceil(total / size)
}
```
- Task List API returns `PageResponse<TaskDTO>` instead of raw `List<TaskDTO>`

### 5.4 TaskService.java
- `createTask(projectId, dto, currentUser)` — verify project membership, broadcast WebSocket event
- `listTasks(projectId, status, assigneeId, page, size, currentUser)` — verify membership, filter, paginate
- `getKanban(projectId, currentUser)` — verify membership, group by status
- `updateTask(projectId, taskId, dto, currentUser)` — **verify project membership** (any member can update; version field for optimistic locking)
- `deleteTask(projectId, taskId, currentUser)` — **verify project membership** (any member can delete)
- `getTask(projectId, taskId, currentUser)` — verify membership

### 5.5 TaskResource.java (`/api/projects/{projectId}/tasks`)

| Method | Path | Auth | Description |
|---|---|---|---|
| POST | `/tasks` | Member | Create task |
| GET | `/tasks` | Member | List (query: `status`, `assigneeId`, `page`, `size`) → `PageResponse<TaskDTO>` |
| GET | `/tasks/kanban` | Member | Kanban view (grouped by status) |
| GET | `/{id}` | Member | Get single task |
| PUT | `/tasks/{id}` | Member | Update task (version checked) |
| DELETE | `/tasks/{id}` | Member | Delete task |

---

## Phase 6: Backend — Comments & Attachments

### 6.1 Comments
- `Comment.java` (PanacheEntity) — `task FK`, `author FK→User`, `content`, timestamps
- `CommentDTO.java` — flat DTO with `authorName`

**CommentResource.java** (`/api/tasks/{taskId}/comments`):

| Method | Path | Auth | Description |
|---|---|---|---|
| POST | `/comments` | Member | Add comment |
| GET | `/comments` | Member | List comments |
| PUT | `/comments/{id}` | Author | Edit comment |
| DELETE | `/comments/{id}` | Author or Admin | Delete comment |

WebSocket broadcast on create/update/delete.

### 6.2 Attachments
- `Attachment.java` (PanacheEntity) — `task FK`, `filePath`, `originalName`, `fileSize`, `uploadedAt`
- Storage: `/data/attachments/{projectId}/{taskId}/`

**AttachmentResource.java** (`/api/tasks/{taskId}/attachments`):

| Method | Path | Auth | Description |
|---|---|---|---|
| POST | `/attachments` | Member | Upload (multipart/form-data) |
| GET | `/attachments` | Member | List attachments |
| GET | `/attachments/{id}` | Member | Download (stream) |
| DELETE | `/attachments/{id}` | Member | Delete (file + DB) |

### 6.3 Services
- `AttachmentService.java`:
  - `upload(taskId, file, currentUser)` — verify task access, create dirs, save file, persist record
  - `download(taskId, attachmentId, currentUser)` — verify access, stream file response
  - `listAttachments(taskId, currentUser)` — list for task
  - `deleteAttachment(taskId, attachmentId, currentUser)` — delete file from disk + DB record
  - Also broadcast `ATTACHMENT_CREATED` / `ATTACHMENT_DELETED` WebSocket events

---

## Phase 7: Backend — WebSocket Real-Time Collaboration

### 7.1 WebSocket Endpoint
`ProjectWebSocket.java` (`quarkus-websockets-next`):
```java
@io.quarkus.websockets.next.WebSocket(path = "/ws/projects/{projectId}")
public class ProjectWebSocket {
    @OnOpen
    void onOpen(Session session,
                 @PathParam("projectId") Long projectId,
                 RoutingContext ctx) {
        // 1. Extract session_id cookie from cookie header
        // 2. Validate session via Quarkus Vert.x HTTP session (ctx.session())
        // 3. If invalid → close connection with 4001 (violated policy)
        // 4. Load User from session-stored userId
        // 5. Verify project membership via ProjectService.isMember(projectId, user)
        // 6. If not a member → close with 4003 (no such project / access denied)
        // 7. Register session in SessionManager
    }

    @OnClose
    void onClose(Session session, @PathParam("projectId") Long projectId) {
        SessionManager.unregister(projectId, session);
    }

    @OnError
    void onError(Session session, Throwable error) {
        // log + cleanup
    }
}
```

**Key corrections**:
- Authentication via Quarkus Vert.x HTTP session cookie (NOT `?token=<jwt>` query param)
- Browser sends session cookie automatically with WebSocket upgrade request
- Project membership enforced in `@OnOpen` via `ProjectService.isMember()`

### 7.2 SessionManager.java
- `@ApplicationScoped` — `Map<Long, Set<Session>>` (project → sessions)
- `register(projectId, session)` — adds session to project's session set
- `unregister(projectId, session)` — removes session from project's session set
- `broadcast(projectId, ProjectEvent)` — JSON-serialize event, send to all sessions in project

### 7.3 Event Types
- `ProjectEventType` — `TASK_CREATED`, `TASK_UPDATED`, `TASK_DELETED`, `COMMENT_CREATED`, `COMMENT_UPDATED`, `COMMENT_DELETED`, **`ATTACHMENT_CREATED`**, **`ATTACHMENT_DELETED`**
- `ProjectEvent.java` — `type`, `projectId`, `taskId`, `payload` (Map<String,Object>)

### 7.4 Integration — Broadcast After Transaction Commit
- Inject `SessionManager` into `TaskService`, `CommentService`, `AttachmentService`
- **Broadcast AFTER transaction commit**: Use CDI `@TransactionalEventListener` (observe `TransactionalObserverResolver` for `AFTER_SUCCESS`) or call `broadcast()` from the **Resource layer** (after the service method returns successfully)
- This prevents race conditions where a client receives a WebSocket event before the DB write is committed
- Event payload includes the full DTO for created/updated entities

---

## Phase 8: Backend — Testing

### 8.1 Unit Tests (JUnit 5)
- `PasswordServiceTest.java` — hash/verify roundtrip, null handling
- `JwtTokenServiceTest.java` — **(remove, no JWT)** → replaced by session auth
- `PageResponseTest.java` — pagination calculation (totalPages)

### 8.2 Integration Tests (@QuarkusTest)
- `AuthResourceTest.java` — login (valid/invalid), logout, session cookie persistence, unauthenticated access
- `UserResourceTest.java` — CRUD with role checks, soft-delete verifies `active=false`
- `ProjectResourceTest.java` — CRUD with member/admin access
- `TaskResourceTest.java` — create, list with filters, pagination, kanban, update (version conflict), delete
- `WebSocketTest.java` — connect with valid/invalid session, membership enforcement
- `CommentResourceTest.java` — add/list/edit/delete
- `AttachmentResourceTest.java` — upload/download/delete (temp files)

### 8.3 Test Database
- Use `@QuarkusTest` with `@TestTransaction` for DB isolation
- Flyway migrations run automatically during tests
- H2 in-memory DB for unit tests; Testcontainers for integration (optional for MVP)

### 8.4 Commands
```bash
cd backend
mvn test                    # all tests
mvn compile quarkus:dev     # dev mode
```

---

## Phase 9: Frontend — Setup

### 9.1 Create Vite + React Project
```bash
npm create vite@latest frontend -- --template react-ts
cd frontend
npm install react@19 react-dom@19
npm install axios
npm install -D tailwindcss@3 postcss postcss-cli autoprefixer
npx tailwindcss init -p
```

### 9.2 Pin Tailwind CSS v3
**tailwind.config.cjs**:
```js
module.exports = {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: { extend: {} },
  plugins: [],
};
```
**postcss.config.cjs**:
```js
module.exports = {
  plugins: { tailwindcss: {}, autoprefixer: {} },
};
```
**src/index.css**:
```css
@tailwind base;
@tailwind components;
@tailwind utilities;
```
> **Decision**: Explicitly pin to Tailwind v3 (not v4) for predictable build behavior. v4 has a different import syntax (`@import "tailwindcss"`) and may introduce build instability. Using `tailwindcss@3` in npm install and `tailwind.config.cjs` (CommonJS format compatible with v3).

### 9.3 Vite Config (`vite.config.ts`)
```ts
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    proxy: {
      '/api': { target: 'http://localhost:8080', changeOrigin: true },
      '/ws':  { target: 'http://localhost:8080', ws: true },
    },
  },
});
```

### 9.4 TypeScript Types (`src/types/`)
- `auth.ts` — User, Role, LoginRequest, LoginResponse
- `project.ts` — Project, CreateProjectRequest, UpdateProjectRequest, UserSummary
- `task.ts` — Task, TaskStatus, TaskPriority, CreateTaskRequest, UpdateTaskRequest, KanbanBoard, `PageResponse<T>`
- `comment.ts` — Comment, CreateCommentRequest
- `attachment.ts` — Attachment

---

## Phase 10: Frontend — API Client & Auth

### 10.1 Axios Client (`src/api/client.ts`)
```ts
const client = axios.create({
  baseURL: '/api',
  withCredentials: true,  // CRITICAL: session cookie sent automatically
});
// 401 response → redirect to /login
// No Authorization header — cookies handle auth
// No localStorage — no token to store
```

### 10.2 Auth Store (`src/stores/auth.ts`)
- `AuthProvider` (React Context)
- State: `user`, `isAuthenticated`, `loading`
- Methods: `login(credentials)`, `logout()`, `checkAuth()`
- On init: call `me()` → if 200, user is authenticated (cookie-based)
- No token storage in localStorage — entirely cookie-driven

### 10.3 API Modules (`src/api/`)
- `auth.ts` — `login()`, `logout()`, `me()`
- `projects.ts` — `fetchProjects()`, `createProject()`, `fetchProject()`, `updateProject()`, `archiveProject()`, `addMember()`, `removeMember()`
- `tasks.ts` — `createTask()`, `fetchTasks()`, `fetchKanban()`, `fetchTask()`, `updateTask()`, `deleteTask()`
- `comments.ts` — `fetchComments()`, `addComment()`, `editComment()`, `deleteComment()`
- `attachments.ts` — `uploadAttachment()`, `downloadAttachment()`, `listAttachments()`, `deleteAttachment()`

### 10.4 Protected Routes (`src/components/ProtectedRoute.tsx`)
- Checks `useAuth().isAuthenticated`
- Redirects to `/login` if not authenticated
- `PublicRoute` for `/login`

---

## Phase 11: Frontend — Pages & Routing

### 11.1 Routing (`src/App.tsx`)
```
/login              → LoginPage
/                   → DashboardPage (redirects if not auth)
/projects           → DashboardPage
/projects/:id       → ProjectPage
/projects/:id/settings → ProjectSettingsPage
```

### 11.2 Pages (`src/pages/`)
- `LoginPage.tsx` — login form (username, password) → calls `auth.login()` → on success, redirect to dashboard
- `DashboardPage.tsx` — project list grid + create button (admin only)
- `ProjectPage.tsx` — project header + task view toggle + task/comment/attachment sections
- `ProjectSettingsPage.tsx` — edit project details + member management (admin only)

---

## Phase 12: Frontend — Task UI Components

### 12.1 Components (`src/components/`)
- `TaskList.tsx` — table view with filter bar (status, assignee) + pagination controls
- `KanbanBoard.tsx` — drag-and-drop columns per status
- `TaskCard.tsx` — individual task (title, priority badge, assignee, due date)
- `TaskForm.tsx` — create/edit task modal (includes hidden `version` field for optimistic locking)
- `TaskFilter.tsx` — filter dropdown (status, assignee)

### 12.2 Hooks (`src/hooks/`)
- `useTasks.ts` — `fetchTasks(projectId, filters)`, `createTask()`, `updateTask()`, `deleteTask()`
- `useKanban.ts` — `fetchKanban(projectId)` — returns tasks grouped by status
- `useTaskView.ts` — combined hook managing list/kanban toggle state

### 12.3 Kanban Drag & Drop
- Install `dnd-kit` (`@dnd-kit/core`, `@dnd-kit/sortable`)
- Drop on different status column → `updateTask` with new status + version
- Optimistic UI update, revert on 409 conflict (version mismatch)

---

## Phase 13: Frontend — Comments & Attachments UI

### 13.1 Comment Components
- `CommentList.tsx` — scrollable list with author, relative timestamp, edit/delete (author only)
- `CommentForm.tsx` — textarea + submit (edit mode if pre-fill)

### 13.2 Attachment Components
- `AttachmentList.tsx` — file name, size, download link, delete button (confirm)
- `AttachmentUpload.tsx` — file input + upload button, progress indicator

---

## Phase 14: Frontend — WebSocket Real-Time Updates

### 14.1 WebSocket Hook (`src/hooks/useWebSocket.ts`)
```ts
// Connects via session cookie (browser sends automatically — no query param needed)
const ws = new WebSocket(`wss://${window.location.host}/ws/projects/${projectId}`);

type WebSocketMessage = {
  type: 'TASK_CREATED' | 'TASK_UPDATED' | 'TASK_DELETED' |
        'COMMENT_CREATED' | 'COMMENT_UPDATED' | 'COMMENT_DELETED' |
        'ATTACHMENT_CREATED' | 'ATTACHMENT_DELETED';
  taskId: number;
  payload: Record<string, unknown>;
};
```
- Auto-reconnect with exponential backoff
- Fallback to REST refetch if disconnected > 30 seconds

### 14.2 WebSocket Integrations — Patch Local State, Don't Refetch
- **Patch local state directly**: On `TASK_CREATED`/`TASK_UPDATED`/`TASK_DELETED`, insert/update/remove the task in the local React state (task list array or Kanban columns). This prevents UI flickering and is faster than a REST round-trip.
- Same approach for comments: patch `CommentList` state directly on `COMMENT_*` events.
- Same for attachments: patch `AttachmentList` state on `ATTACHMENT_*` events.
- **Full REST refetch only on WebSocket reconnect**: If the WS connection drops and reconnects, do a full `fetchTasks()` / `fetchComments()` / `fetchAttachments()` to ensure state consistency after potentially missed events.
- `ProjectPage.tsx` — no automatic refetch on events (only on reconnect)

### 14.3 Conflict Handling
- If a `TASK_UPDATED` event arrives for a task currently being edited locally, show a notification: "Task updated by another user"
- If a `TASK_DELETED` event arrives for a task being edited, auto-close the edit modal and refresh

---

## Phase 15: Backend — Endpoint Documentation

Update `docs/endpoints.md` with all endpoints:

### REST Endpoints
| Method | Endpoint | Auth | Description |
|---|---|---|---|
| POST | `/api/auth/login` | None | Login → Vert.x session cookie set automatically |
| POST | `/api/auth/logout` | None | Destroy session → cookie cleared |
| GET | `/api/auth/me` | Session | Current user info |
| POST | `/api/users` | ADMIN | Create user |
| GET | `/api/users` | ADMIN | List active users |
| GET | `/api/users/{id}` | ADMIN | Get user |
| PUT | `/api/users/{id}` | ADMIN | Update user |
| DELETE | `/api/users/{id}` | ADMIN | Soft-delete (set active=false) |
| POST | `/api/projects` | ADMIN | Create project |
| GET | `/api/projects` | Auth | List user's non-archived projects |
| GET | `/api/projects/{id}` | Member | Project details + members |
| PUT | `/api/projects/{id}` | ADMIN | Update project |
| DELETE | `/api/projects/{id}` | ADMIN | Archive project |
| POST | `/api/projects/{id}/members` | ADMIN | Add member |
| DELETE | `/api/projects/{id}/members/{userId}` | ADMIN | Remove member |
| POST | `/api/projects/{projectId}/tasks` | Member | Create task |
| GET | `/api/projects/{projectId}/tasks` | Member | List (filter+pagination) → `PageResponse` |
| GET | `/api/projects/{projectId}/tasks/kanban` | Member | Kanban view |
| GET | `/api/projects/{projectId}/tasks/{id}` | Member | Get task (with version) |
| PUT | `/api/projects/{projectId}/tasks/{id}` | Member | Update task (version-checked, 409 on conflict) |
| DELETE | `/api/projects/{projectId}/tasks/{id}` | Member | Delete task |
| POST | `/api/tasks/{taskId}/comments` | Member | Add comment |
| GET | `/api/tasks/{taskId}/comments` | Member | List comments |
| PUT | `/api/tasks/{taskId}/comments/{id}` | Author | Edit comment |
| DELETE | `/api/tasks/{taskId}/comments/{id}` | Author/Admin | Delete comment |
| POST | `/api/tasks/{taskId}/attachments` | Member | Upload (multipart) |
| GET | `/api/tasks/{taskId}/attachments` | Member | List attachments |
| GET | `/api/tasks/{taskId}/attachments/{id}` | Member | Download |
| DELETE | `/api/tasks/{taskId}/attachments/{id}` | Member | Delete |

### WebSocket Endpoint
| Method | Endpoint | Auth | Description |
|---|---|---|---|
| WS | `/ws/projects/{projectId}` | Cookie | Real-time events (session cookie validated in @OnOpen, project membership enforced) |

---

## Phase 16: Final Verification

### 16.1 Dev Workflow
```bash
# Terminal 1 — Database
docker compose up postgres

# Terminal 2 — Backend
cd backend && mvn quarkus:dev

# Terminal 3 — Frontend
cd frontend && npm run dev
```

### 16.2 Production Build & Run
```bash
docker compose up --build
# Access via https://pm.local
```

### 16.3 Build & Test Commands
```bash
# Backend
cd backend
mvn test                    # unit + integration tests
mvn compile quarkus:dev     # dev mode

# Frontend
cd frontend
npm install                 # install deps
npm run build               # production build
npm run dev                 # dev server

# Full stack
docker compose up --build   # all services
```

---

## Corrections Applied (vs. Original Plan)

| # | Correction | Before | After |
|---|---|---|---|
| 1 | Auth mechanism | JWT | Session-based (HttpOnly cookies via Quarkus Vert.x HTTP session) |
| 2 | Users | Hard delete | Soft delete (`active=true/false` flag) |
| 3 | WebSocket auth | `?token=<jwt>` query param | Session cookie (browser sends automatically) |
| 4 | WebSocket project check | None in @OnOpen | `ProjectService.isMember()` enforced in @OnOpen |
| 5 | Task permissions | "Verify ownership" | "Verify project membership" (any member) |
| 6 | Tailwind | v4 (broken `@import`) | Explicitly pinned v3 |
| 7 | Infrastructure | Phase 15/16 (late) | Phase 1 (testable from day one) |
| 8 | Quarkus config | Fake `quarkus.http.body.part-sized=true` | Correct `quarkus.http.max-form-attribute-size` |
| 8b | Quarkus config | Missing SameSite | Added `quarkus.http.session.cookie.same-site=STRICT` |
| 9 | DB indexes | None | Added indexes: tasks.project_id, tasks.status, tasks.assignee, tasks.due_date, comments.task_id, comments.author_id, attachments.task_id, users.username, projects.created_by |
| 10 | Optimistic locking | None | `@Version Long version` on Task entity |
| 11 | Pagination | Raw list | `PageResponse<T>` envelope |
| 12 | Admin seed | Not mentioned | `AppInitializer.java` with env var password |
| 13 | JWT storage | localStorage | Removed entirely (cookies only) |
| A1 | SessionStore | Custom `SessionStore.java` | Removed — Quarkus built-in Vert.x HTTP session |
| A2 | AuthMechanism | Custom `HttpAuthenticationMechanism` | `SessionAuthFilter` (`@ServerRequestFilter`) — reads Vert.x session → `SecurityIdentity` |
| A3 | Transaction safety | Broadcast immediately | Broadcast AFTER transaction commit (`@TransactionalEventListener` or Resource-layer call) |
| A4 | Attachment events | Not in enum | Added `ATTACHMENT_CREATED`, `ATTACHMENT_DELETED` to `ProjectEventType` |
| A5 | WS state updates | Full REST refetch on events | Patch local React state directly; full refetch only on reconnect |

## Out of Scope (per features.md §"Strictly OUT OF SCOPE for MVP")
- AD/LDAP, email notifications, Gantt charts, task dependencies, time tracking, custom fields, native mobile apps.
