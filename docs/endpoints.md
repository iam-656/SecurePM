# SecurePM API & WebSocket Specification

This document provides the complete API specification and reference for SecurePM, covering all REST endpoints, WebSocket real-time events, authentication requirements, request/response models, and status codes.

---

## 1. Master Endpoint Summary

### 1.1 REST Endpoints

| Method | Endpoint | Auth | Description |
|---|---|---|---|
| POST | `/api/auth/login` | None | Login → Vert.x session cookie set automatically |
| POST | `/api/auth/logout` | None | Destroy session → cookie cleared |
| GET | `/api/auth/me` | Session | Current user info |
| PUT | `/api/auth/profile` | Session | Self-service profile update (fullName, password) |
| GET | `/api/users/check-username` | ADMIN | Real-time username availability check |
| POST | `/api/users` | ADMIN | Create user |
| GET | `/api/users` | Auth | List users (active for users, all for ADMIN) |
| GET | `/api/users/{id}` | ADMIN | Get user |
| PUT | `/api/users/{id}` | ADMIN | Update user |
| DELETE | `/api/users/{id}` | ADMIN | Soft-delete / deactivate user |
| POST | `/api/projects` | Auth | Create project or sub-project (with optional parentProjectId, leadId) |
| GET | `/api/projects` | Auth | List user's non-archived projects & sub-projects |
| GET | `/api/projects/{id}` | Member | Project details + direct & inherited members |
| GET | `/api/projects/{id}/subprojects` | Member | List active child sub-projects for a parent project |
| PUT | `/api/projects/{id}` | Lead/Admin | Update project |
| DELETE | `/api/projects/{id}` | Lead/Admin | Archive project |
| POST | `/api/projects/{id}/complete` | Lead/Creator/Admin | Mark project/sub-project as completed (all tasks/sub-projects must be done) |
| POST | `/api/projects/{id}/reopen` | Creator/Admin | Reopen completed project/sub-project |
| POST | `/api/projects/{id}/members` | Lead/Admin | *Deprecated* (returns 400 instructing to use invitations) |
| DELETE | `/api/projects/{id}/members/{userId}` | Lead/Admin | Remove member |
| POST | `/api/projects/{projectId}/invitations` | Lead/Admin | Send project invitation (7-day expiry) |
| GET | `/api/projects/{projectId}/invitations` | Member | List project invitations |
| DELETE | `/api/projects/{projectId}/invitations/{invitationId}` | Lead/Admin | Cancel/revoke pending invitation |
| POST | `/api/invitations/{id}/accept` | Invitee | Accept invitation & enroll as project member |
| POST | `/api/invitations/{id}/decline` | Invitee | Decline project invitation |
| GET | `/api/notifications` | Auth | List current user's notifications & unread count |
| PUT | `/api/notifications/{id}/read` | Auth | Mark single notification as read |
| PUT | `/api/notifications/read-all` | Auth | Mark all user notifications as read |
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
| GET | `/api/projects/{projectId}/library` | Member | List & filter project library files (isolated) |
| POST | `/api/projects/{projectId}/library` | Member | Direct upload to project library (multipart) |
| GET | `/api/projects/{projectId}/library/{id}` | Member | Get library file metadata & download |
| GET | `/api/projects/{projectId}/library/{id}/targets` | Lead/Admin | List eligible forward targets for attachment |
| POST | `/api/projects/{projectId}/library/{id}/forward` | Lead/Admin | Forward attachment to target project libraries |
| DELETE | `/api/projects/{projectId}/library/{id}` | Owner/Lead/Admin | Delete library file (safe ref-counted deletion) |

### 1.2 WebSocket Endpoints

| Method | Endpoint | Auth | Description |
|---|---|---|---|
| WS | `/ws/projects/{projectId}` | Cookie | Project task/comment/attachment real-time event broadcasts |
| WS | `/ws/notifications` | Cookie | User-scoped notification real-time events (`NOTIFICATION_CREATED`, `NOTIFICATION_UPDATED`, `ALL_NOTIFICATIONS_READ`) |

---

## 2. Authentication & Security Architecture

- **Session-Based Authentication**: SecurePM uses Vert.x HTTP Session management with cookie name `session_id`. No JWT or API keys are stored in `localStorage` or transmitted via `Authorization` headers.
- **Cookie Security Configuration**:
  - `HttpOnly`: `true` (prohibits JavaScript access; mitigates XSS token theft).
  - `SameSite`: `Strict` (mitigates CSRF).
  - `Path`: `/`
  - `MaxAge`: `1800` seconds (30 minutes session inactivity timeout).
  - `Secure`: `true` in production mode (requires HTTPS).
- **CORS Configuration**: Allowed origin `http://localhost:5173` with `credentials: true`.
- **Password Security**: Passwords hashed using bcrypt with work factor 12.
- **Default Admin Bootstrap**: Auto-seeded on application startup with credentials from `APP_BOOTSTRAP_ADMIN_PASSWORD` (default: `ChangeMeNow123!`).

---

## 3. Authentication Endpoints (`/api/auth`)

### 3.1 POST `/api/auth/login`
- **Description**: Authenticate user credentials and establish a stateful session. Sets `session_id` cookie on the response.
- **Auth**: None (Public).
- **Consumes**: `application/json`
- **Produces**: `application/json`
- **Request Body**:
  ```json
  {
    "username": "admin",
    "password": "ChangeMeNow123!"
  }
  ```
- **Response `200 OK`**:
  - Headers: `Set-Cookie: session_id=...; Path=/; HttpOnly; SameSite=Strict`
  - Body:
    ```json
    {
      "username": "admin",
      "fullName": "System Administrator",
      "role": "ADMIN",
      "active": true
    }
    ```
- **Errors**:
  - `401 Unauthorized`: `{"error":"Invalid credentials"}` (generic message for non-existent users, incorrect passwords, or inactive users).
  - `500 Internal Server Error`: `{"error":"Session unavailable"}`

---

### 3.2 POST `/api/auth/logout`
- **Description**: Invalidate the active session on the server and expire the client cookie.
- **Auth**: None (Session optional).
- **Produces**: `application/json`
- **Response `200 OK`**:
  - Headers: `Set-Cookie: session_id=; Max-Age=0; Expires=...`
  - Body:
    ```json
    {
      "message": "Logged out"
    }
    ```

---

### 3.3 GET `/api/auth/me`
- **Description**: Retrieve the current authenticated user's profile and role.
- **Auth**: Valid session cookie required.
- **Produces**: `application/json`
- **Response `200 OK`**:
  ```json
  {
    "id": 1,
    "username": "admin",
    "email": "superadmin@pm.local",
    "fullName": "System Administrator",
    "role": "ADMIN",
    "active": true,
    "createdBy": null,
    "isSuperAdmin": true
  }
  ```
- **Errors**:
  - `401 Unauthorized`: Empty response when session is missing, expired, or user is inactive.

---

### 3.4 PUT `/api/auth/profile`
- **Description**: Self-service profile update. Any authenticated user can update their `fullName` and optionally change their password by validating their `currentPassword`.
- **Auth**: Valid session cookie required.
- **Consumes / Produces**: `application/json`
- **Request Body**:
  ```json
  {
    "fullName": "System Administrator",
    "currentPassword": "ChangeMeNow123!",
    "newPassword": "NewStrongPassword456!"
  }
  ```
  *(Note: `currentPassword` and `newPassword` are optional if only updating `fullName`; if updating password, `currentPassword` is required and `newPassword` must be at least 8 characters).*
- **Response `200 OK`**:
  ```json
  {
    "id": 1,
    "username": "admin",
    "email": "superadmin@pm.local",
    "fullName": "System Administrator",
    "role": "ADMIN",
    "active": true,
    "createdBy": null,
    "isSuperAdmin": true,
    "createdAt": "2026-10-18T00:00:00Z",
    "updatedAt": "2026-10-20T21:50:00Z"
  }
  ```
- **Errors**:
  - `400 Bad Request`: `{"error":"New password must be at least 8 characters"}` or `{"error":"Current password is required to change password"}`
  - `401 Unauthorized`: `{"error":"Invalid current password"}` or unauthenticated session


---

## 4. User Management Endpoints (`/api/users`)

All user management endpoints require an active session with the **`ADMIN`** role.

### 4.1 GET `/api/users/check-username`
- **Description**: Real-time Instagram-style check to verify if a username is available. Returns whether the username is taken by an active user. Deactivated users' usernames are freed up and available for reuse.
- **Auth**: `ADMIN`
- **Query Parameters**:
  - `username` (string, required): The username to check.
- **Produces**: `application/json`
- **Response `200 OK`**:
  ```json
  {
    "username": "johndoe",
    "available": true
  }
  ```
- **Errors**:
  - `400 Bad Request`: `{"error":"Username parameter is required"}`
  - `403 Forbidden`: `{"error":"Access denied"}`

---

### 4.2 POST `/api/users`
- **Description**: Create a new user with hashed password. Automatically records the creator (`createdBy = currentUser.id`).
- **Auth**: `ADMIN`
- **Consumes / Produces**: `application/json`
- **Request Body**:
  ```json
  {
    "username": "johndoe",
    "email": "johndoe@example.com",
    "password": "SecurePassword123!",
    "fullName": "John Doe",
    "role": "USER"
  }
  ```
  *(Supported role values: `ADMIN`, `USER`, `MEMBER`)*
- **Response `201 Created`**:
  ```json
  {
    "id": 2,
    "username": "johndoe",
    "email": "johndoe@example.com",
    "fullName": "John Doe",
    "role": "USER",
    "active": true,
    "createdBy": 1,
    "isSuperAdmin": false,
    "createdAt": "2026-10-18T10:00:00Z",
    "updatedAt": "2026-10-18T10:00:00Z"
  }
  ```
- **Errors**:
  - `400 Bad Request`: Validation failure on username, email format, or password (minimum 8 characters).
  - `403 Forbidden`: `{"error":"Access denied"}`
  - `409 Conflict`: `{"error":"Username already exists"}` or `{"error":"Email already exists"}`

---

### 4.3 GET `/api/users`
- **Description**: List users across the system. Returns all users (active and deactivated) when requested by an `ADMIN`, and returns active users only when requested by a standard `USER` (for task assignment and project member selection).
- **Auth**: Authenticated session required (`ADMIN` or `USER`).
- **Produces**: `application/json`
- **Response `200 OK`**:
  ```json
  [
    {
      "id": 1,
      "username": "admin",
      "email": "superadmin@pm.local",
      "fullName": "System Administrator",
      "role": "ADMIN",
      "active": true,
      "createdBy": null,
      "isSuperAdmin": true,
      "createdAt": "2026-10-18T00:00:00Z",
      "updatedAt": "2026-10-18T00:00:00Z"
    },
    {
      "id": 2,
      "username": "johndoe",
      "email": "johndoe@example.com",
      "fullName": "John Doe",
      "role": "USER",
      "active": true,
      "createdBy": 1,
      "isSuperAdmin": false,
      "createdAt": "2026-10-18T10:00:00Z",
      "updatedAt": "2026-10-18T10:00:00Z"
    }
  ]
  ```
- **Errors**:
  - `401 Unauthorized`: Unauthenticated session

---

### 4.4 GET `/api/users/{id}`
- **Description**: Fetch single user details by user ID.
- **Auth**: `ADMIN`
- **Produces**: `application/json`
- **Response `200 OK`**: `UserDTO`
- **Errors**:
  - `403 Forbidden`: `{"error":"Access denied"}`
  - `404 Not Found`: `{"error":"User not found"}`

---

### 4.5 PUT `/api/users/{id}`
- **Description**: Update user attributes (full name, email, password, role, active status). Enforces WhatsApp Group Creator hierarchy rules and field immutability:
  - Super Administrator role cannot be demoted (`400 Bad Request`).
  - Super Administrator email is permanent and cannot be modified (`400 Bad Request`).
  - Secondary admins cannot modify the Super Administrator (`403 Forbidden`).
  - An admin cannot modify their own email, role, or active status via this endpoint (`400 Bad Request`).
- **Auth**: `ADMIN`
- **Consumes / Produces**: `application/json`
- **Request Body** (all fields optional):
  ```json
  {
    "fullName": "John Updated Doe",
    "email": "john.updated@example.com",
    "password": "NewSecurePassword456!",
    "role": "ADMIN",
    "active": true
  }
  ```
- **Response `200 OK`**: Updated `UserDTO`
- **Errors**:
  - `400 Bad Request`: `{"error":"Super administrator email cannot be modified"}`, `{"error":"Cannot modify your own email"}`, `{"error":"Cannot modify your own role"}`, or `{"error":"Cannot deactivate yourself"}`
  - `403 Forbidden`: `{"error":"Cannot modify super administrator"}` or general access denied
  - `404 Not Found`: `{"error":"User not found"}`
  - `409 Conflict`: `{"error":"Email already exists"}`

---

### 4.6 DELETE `/api/users/{id}`
- **Description**: Soft-delete / deactivate a user by setting `active = false`. Frees up their username for reuse by other users while preserving audit references.
- **Hierarchy Rules**:
  - Super Administrator (`createdBy == null`) cannot be deleted or deactivated by anyone (including self).
  - Admins cannot delete/deactivate themselves.
  - Secondary admins cannot delete Super Admin or admins created by Super Admin.
- **Auth**: `ADMIN`
- **Produces**: `application/json`
- **Response `200 OK`**:
  ```json
  {
    "message": "User deactivated"
  }
  ```
- **Errors**:
  - `400 Bad Request`: `{"error":"Cannot delete super administrator"}` or `{"error":"Cannot delete yourself"}`
  - `403 Forbidden`: `{"error":"Cannot delete an administrator created by super admin"}` or general access denied
  - `404 Not Found`: `{"error":"User not found"}`

---

## 5. Project Management Endpoints (`/api/projects`)

### 5.1 POST `/api/projects`
- **Description**: Create a new workspace project or a nested child sub-project. Any authenticated active user can create a root project. Creating a sub-project requires Lead authority on the parent project or System `ADMIN`. Single-level nesting is strictly enforced (sub-projects cannot have child sub-projects).
  - If a designated `leadId` is already an active member of the parent project, they are directly assigned as the sub-project lead and enrolled into project members.
  - If a designated `leadId` is **not** currently a member of the parent project, selecting them works as an invitation: the creator remains active lead, the designated user is recorded as `pendingLeadId`, and an automated Project Lead Invitation is delivered to the user.
- **Auth**: Session authenticated user (`ADMIN` or `USER`).
- **Consumes / Produces**: `application/json`
- **Request Body (Root Project)**:
  ```json
  {
    "name": "Secure Project Alpha",
    "description": "Enterprise cloud security project",
    "projectKey": "SPA"
  }
  ```
- **Request Body (Sub-Project under Parent)**:
  ```json
  {
    "name": "Frontend Track",
    "description": "Frontend track subproject",
    "projectKey": "SPA-FE",
    "parentProjectId": 1,
    "leadId": 2,
    "dependencyType": "START_AFTER",
    "prerequisiteIds": [10]
  }
  ```
  *Note on Sub-Project Dependencies*:
  - The very first sub-project created under a parent project has no available prerequisites and is automatically assigned `NO_DEPENDENCY`.
  - Subsequent sub-projects can specify `dependencyType`: `"NO_DEPENDENCY"` (parallel/independent) or `"START_AFTER"` (sequential/dependent).
  - When `START_AFTER` is selected, `prerequisiteIds` must contain at least one valid sub-project ID belonging to the same parent project.
- **Response `201 Created`**:
  ```json
  {
    "id": 2,
    "name": "Frontend Track",
    "description": "Frontend track subproject",
    "projectKey": "SPA-FE",
    "archived": false,
    "createdBy": 1,
    "createdByName": "System Administrator",
    "leadId": 1,
    "leadName": "System Administrator",
    "pendingLeadId": 2,
    "pendingLeadName": "Sub Lead",
    "parentProjectId": 1,
    "parentProjectName": "Secure Project Alpha",
    "parentProjectKey": "SPA",
    "isSubproject": true,
    "subprojectCount": 0,
    "dependencyType": "START_AFTER",
    "prerequisiteIds": [10],
    "prerequisiteNames": ["Backend Foundation"],
    "isBlocked": true,
    "blockingPrerequisiteNames": ["Backend Foundation"],
    "memberSummaries": [
      {
        "id": 1,
        "username": "admin",
        "fullName": "System Administrator",
        "role": "ADMIN",
        "active": true
      }
    ],
    "inheritedMemberSummaries": [],
    "completed": false,
    "completedAt": null,
    "completedBy": null,
    "completedByName": null,
    "createdAt": "2026-10-22T10:00:00Z",
    "updatedAt": "2026-10-22T10:00:00Z"
  }
  ```
- **Errors**:
  - `400 Bad Request`: Validation failure, duplicate key conflict, invalid prerequisite, circular dependency, or nesting violation (`{"error":"Cannot create a sub-project under another sub-project. Single-level nesting only."}`).
  - `401 Unauthorized`: `{"error":"Authentication required"}`
  - `403 Forbidden`: Caller lacks Lead or Admin authority on the parent project.

---

### 5.2 GET `/api/projects`
- **Description**: List all non-archived projects. By default (`includeSubprojects=false`), sub-projects are excluded from the main dashboard for users who have access to the parent project (and system admins) to prevent dashboard clutter. A sub-project only appears if `includeSubprojects=true` OR if the user is a direct member of the sub-project without access to its parent project.
- **Auth**: Session authenticated user.
- **Query Parameters**:
  - `includeSubprojects` (boolean, optional, default: `false`): When `true`, returns all accessible projects including sub-projects.
- **Produces**: `application/json`
- **Response `200 OK`**: Array of `ProjectDTO` items.

---

### 5.3 GET `/api/projects/{id}`
- **Description**: Get project metadata, parent project info (if subproject), creator, lead, pending lead (if invite pending), direct members, and inherited members.
- **Auth**: Project Member (creator, lead, direct member, or inherited from parent, or ADMIN).
- **Produces**: `application/json`
- **Response `200 OK`**: Single `ProjectDTO`.
- **Errors**:
  - `403 Forbidden`: `{"error":"Access denied"}`
  - `404 Not Found`: `{"error":"Project not found"}`

---

### 5.4 GET `/api/projects/{id}/subprojects`
- **Description**: List active child sub-projects belonging to a parent project.
- **Auth**: Parent Project Member or System `ADMIN`.
- **Produces**: `application/json`
- **Response `200 OK`**: Array of `ProjectDTO` items for child projects.
- **Errors**:
  - `403 Forbidden`: `{"error":"Access denied"}`
  - `404 Not Found`: `{"error":"Project not found"}`

---

### 5.5 PUT `/api/projects/{id}`
- **Description**: Update project title, description, archived state, or sub-project lead.
  - Sub-project lead reassignment (`leadId`) is permitted for the project creator, parent project lead, or system `ADMIN`.
  - If the new lead is a member of the parent project, they are directly promoted to `leadId`. If they are not a member of the parent project, an invitation is sent and they become lead upon acceptance.
- **Auth**: Project Lead (or designated sub-project lead) or System `ADMIN`.
- **Consumes / Produces**: `application/json`
- **Request Body**:
  ```json
  {
    "name": "Updated Project Name",
    "description": "Updated project description",
    "archived": false,
    "leadId": 3,
    "dependencyType": "START_AFTER",
    "prerequisiteIds": [10, 11]
  }
  ```
  *Note on Sub-Project Dependencies*:
  - Viewing dependencies is accessible to all sub-project members.
  - Modifying or removing dependencies (`dependencyType`, `prerequisiteIds`) is strictly restricted to the **Main Project Creator** or System **ADMIN**. Sub-project leads cannot modify dependencies (`403 Forbidden`).
  - Circular dependencies are prevented and return `400 Bad Request`.
- **Response `200 OK`**: Updated `ProjectDTO`.
- **Errors**:
  - `400 Bad Request`: `{"error":"Circular dependency detected between sub-projects"}` or `{"error":"At least one prerequisite sub-project must be selected for START_AFTER dependency"}`
  - `403 Forbidden`: `{"error":"Access denied: Only main project creator or ADMIN can modify sub-project dependencies"}`
  - `404 Not Found`: `{"error":"Project not found"}`

---

### 5.6 DELETE `/api/projects/{id}`
- **Description**: Archive project (sets `archived = true`).
- **Auth**: Project Lead (or designated sub-project lead) or System `ADMIN`.
- **Produces**: `application/json`
- **Response `200 OK`**:
  ```json
  {
    "message": "Project archived"
  }
  ```
- **Errors**:
  - `403 Forbidden`: `{"error":"Access denied"}`
  - `404 Not Found`: `{"error":"Project not found"}`

---

### 5.6 POST `/api/projects/{id}/members` (or `/api/projects/{id}/members/{userId}`)
- **Description**: *Disabled / Deprecated*. Direct member enrollment is disabled. All project membership additions must go through the asynchronous invitation and notification workflow (`POST /api/projects/{id}/invitations`).
- **Auth**: Project Lead (creator) or System `ADMIN`.
- **Response `400 Bad Request`**:
  ```json
  {
    "error": "Direct member addition is disabled. Please send a project invitation via POST /api/projects/{id}/invitations."
  }
  ```

---

### 5.7 DELETE `/api/projects/{id}/members/{userId}`
- **Description**: Remove a member from the project.
- **Auth**: Project Lead (creator) or System `ADMIN`.
- **Response `200 OK`**: Updated `ProjectDTO`.
- **Errors**:
  - `403 Forbidden`: `{"error":"Access denied"}`
  - `404 Not Found`: `{"error":"Project not found"}`

---

### 5.8 POST `/api/projects/{id}/complete`
- **Description**: Mark a project or sub-project as **completed**. Once marked as completed, the project enters **Strict View-Only / Read-Only Mode**:
  - Mutating tasks (creating, editing, moving, or deleting) is blocked.
  - Adding, editing, or deleting comments is blocked.
  - Uploading or deleting attachments is blocked (**downloading existing attachments is permitted**).
  - Member invitations, lead reassignments, archiving, or creating child sub-projects are blocked.
  - Real-time SYSTEM notifications are dispatched to members (for sub-projects: direct + inherited members; for root projects: root members + all sub-project members).
- **Authority Matrix**:
  - For sub-projects: Sub-project lead (`leadId`), parent project creator (`parentProject.createdBy`), or System `ADMIN`.
  - For root projects: Project creator (`createdBy`) or System `ADMIN`.
- **Quality Gates**:
  - For sub-projects:
    - **Prerequisite Gate**: Sub-project must not be blocked (`isBlocked == false`). All prerequisite sub-projects must already be completed.
    - **Task Gate**: **All tasks** within the sub-project must have status `DONE`. If any task is unfinished, completion fails.
  - For root projects: **All direct tasks** must have status `DONE` **AND all child sub-projects** must already have `completed == true`. If any direct task or child sub-project is incomplete, completion fails.
- **Auth**: Authenticated user with appropriate role/authority.
- **Produces**: `application/json`
- **Response `200 OK`**: Updated `ProjectDTO` with `completed: true`, `completedAt: "<timestamp>"`, `completedBy: <id>`, `completedByName: "<name>"`.
- **Errors**:
  - `400 Bad Request`: Quality gate failed:
    - `{"error":"Cannot mark sub-project as completed: Prerequisite sub-projects have not been completed yet"}`
    - `{"error":"Cannot mark sub-project as completed: X task(s) are not finished yet"}`
    - `{"error":"Cannot mark project as completed: X direct task(s) are not finished yet"}`
    - `{"error":"Cannot mark project as completed: X sub-project(s) are not completed yet"}`
    - `{"error":"Project is already completed"}`
  - `401 Unauthorized`: `{"error":"Authentication required"}`
  - `403 Forbidden`: `{"error":"Access denied: Only sub-project lead, parent project creator, or ADMIN can mark sub-project as completed"}` or `{"error":"Access denied: Only project creator or ADMIN can mark project as completed"}`.

---

### 5.9 POST `/api/projects/{id}/reopen`
- **Description**: Revert / reopen a completed project or sub-project, restoring full read-write capabilities.
- **Authority Matrix (Strict Reversal Control)**:
  - For sub-projects: **Only the parent project creator** (`parentProject.createdBy`) or System `ADMIN`. Sub-project leads are explicitly **forbidden** from reopening a completed sub-project.
  - For root projects: **Only the root project creator** (`createdBy`) or System `ADMIN`.
- **Auth**: Authenticated user with creator/admin authority.
- **Produces**: `application/json`
- **Response `200 OK`**: Updated `ProjectDTO` with `completed: false`, `completedAt: null`, `completedBy: null`, `completedByName: null`.
- **Errors**:
  - `400 Bad Request`: `{"error":"Project is not completed"}`
  - `401 Unauthorized`: `{"error":"Authentication required"}`
  - `403 Forbidden`: `{"error":"Access denied: Only parent project creator or ADMIN can reopen a completed sub-project"}` or `{"error":"Access denied: Only project creator or ADMIN can reopen a completed project"}`.

---

## 6. Task Management Endpoints (`/api/projects/{projectId}/tasks`)

All task endpoints enforce project membership.

### 6.1 POST `/api/projects/{projectId}/tasks`
- **Description**: Create a task within the project. Increments initial `version` to 1. Broadcasts `TASK_CREATED` over WebSocket.
- **Auth**: Project Member.
- **Consumes / Produces**: `application/json`
- **Request Body**:
  ```json
  {
    "title": "Implement authentication",
    "description": "Configure Vert.x session cookie authentication",
    "status": "TODO",
    "priority": "HIGH",
    "assigneeId": 2,
    "dueDate": "2026-10-25T18:00:00Z"
  }
  ```
  *(Status: `TODO`, `IN_PROGRESS`, `REVIEW`, `DONE` | Priority: `LOW`, `MEDIUM`, `HIGH`)*
- **Response `201 Created`**:
  ```json
  {
    "id": 10,
    "projectId": 1,
    "title": "Implement authentication",
    "description": "Configure Vert.x session cookie authentication",
    "status": "TODO",
    "priority": "HIGH",
    "assigneeId": 2,
    "assigneeName": "John Doe",
    "dueDate": "2026-10-25T18:00:00Z",
    "version": 1,
    "createdBy": 1,
    "createdByName": "System Administrator",
    "updatedBy": 1,
    "createdAt": "2026-10-18T10:00:00Z",
    "updatedAt": "2026-10-18T10:00:00Z"
  }
  ```
- **Errors**:
  - `400 Bad Request`: Validation failure, or blocked by prerequisite sub-projects (`{"error":"Cannot create tasks: Prerequisite sub-projects have not been completed yet."}`), or project completed (`{"error":"Project is marked as completed and is in view-only mode"}`).
  - `403 Forbidden`: `{"error":"Access denied"}`

---

### 6.2 GET `/api/projects/{projectId}/tasks`
- **Description**: Filtered and paginated task list.
- **Auth**: Project Member.
- **Query Parameters**:
  - `status`: Optional filter (`TODO`, `IN_PROGRESS`, `REVIEW`, `DONE`).
  - `assigneeId`: Optional filter by user ID.
  - `page`: 0-based page index (default: `0`).
  - `size`: Page limit (default: `20`).
- **Response `200 OK`**:
  ```json
  {
    "items": [
      {
        "id": 10,
        "projectId": 1,
        "title": "Implement authentication",
        "description": "Configure Vert.x session cookie authentication",
        "status": "TODO",
        "priority": "HIGH",
        "assigneeId": 2,
        "assigneeName": "John Doe",
        "dueDate": "2026-10-25T18:00:00Z",
        "version": 1,
        "createdBy": 1,
        "createdByName": "System Administrator",
        "updatedBy": 1,
        "createdAt": "2026-10-18T10:00:00Z",
        "updatedAt": "2026-10-18T10:00:00Z"
      }
    ],
    "total": 1,
    "page": 0,
    "size": 20,
    "totalPages": 1
  }
  ```

---

### 6.3 GET `/api/projects/{projectId}/tasks/kanban`
- **Description**: Retrieve all active tasks for the project formatted for Kanban status columns.
- **Auth**: Project Member.
- **Produces**: `application/json`
- **Response `200 OK`**: Array of `TaskDTO` items.

---

### 6.4 GET `/api/projects/{projectId}/tasks/{taskId}`
- **Description**: Get single task details including optimistic lock `version`.
- **Auth**: Project Member.
- **Produces**: `application/json`
- **Response `200 OK`**: `TaskDTO`
- **Errors**:
  - `403 Forbidden`: `{"error":"Access denied"}`
  - `404 Not Found`: `{"error":"Task not found"}`

---

### 6.5 PUT `/api/projects/{projectId}/tasks/{taskId}`
- **Description**: Update task attributes with optimistic locking. Broadcasts `TASK_UPDATED` over WebSocket.
- **Auth**: Project Member.
- **Consumes / Produces**: `application/json`
- **Optimistic Locking**: The client must provide the known `version`. If the client `version` does not match the database `version`, the update is rejected with `409 Conflict`.
- **Request Body**:
  ```json
  {
    "title": "Updated title",
    "description": "Updated description",
    "status": "IN_PROGRESS",
    "priority": "HIGH",
    "assigneeId": 2,
    "dueDate": "2026-10-26T18:00:00Z",
    "version": 1
  }
  ```
- **Response `200 OK`**: Updated `TaskDTO` with incremented `version` (e.g. `version: 2`).
- **Errors**:
  - `400 Bad Request`: Blocked by prerequisite sub-projects (`{"error":"Cannot change task status: Prerequisite sub-projects have not been completed yet."}`), or project completed (`{"error":"Project is marked as completed and is in view-only mode"}`).
  - `403 Forbidden`: `{"error":"Access denied"}`
  - `404 Not Found`: `{"error":"Task not found"}`
  - `409 Conflict`: `{"error":"Task was modified by another user"}`

---

### 6.6 DELETE `/api/projects/{projectId}/tasks/{taskId}`
- **Description**: Delete a task. Broadcasts `TASK_DELETED` over WebSocket.
- **Auth**: Project Member.
- **Produces**: `application/json`
- **Response `200 OK`**:
  ```json
  {
    "message": "Task deleted"
  }
  ```
- **Errors**:
  - `403 Forbidden`: `{"error":"Access denied"}`
  - `404 Not Found`: `{"error":"Task not found"}`

---

## 7. Comment Endpoints (`/api/tasks/{taskId}/comments`)

### 7.1 POST `/api/tasks/{taskId}/comments`
- **Description**: Add a comment to a task. Broadcasts `COMMENT_CREATED` over WebSocket.
- **Auth**: Project Member.
- **Query Parameters**: `projectId` (required).
- **Consumes / Produces**: `application/json`
- **Request Body**:
  ```json
  {
    "content": "Reviewed the implementation. Looks solid!"
  }
  ```
- **Response `201 Created`**:
  ```json
  {
    "id": 5,
    "taskId": 10,
    "authorId": 1,
    "authorName": "System Administrator",
    "content": "Reviewed the implementation. Looks solid!",
    "createdAt": "2026-10-18T10:15:00Z",
    "updatedAt": "2026-10-18T10:15:00Z"
  }
  ```
- **Errors**:
  - `403 Forbidden`: `{"error":"Access denied"}`
  - `404 Not Found`: `{"error":"Task not found"}`

---

### 7.2 GET `/api/tasks/{taskId}/comments`
- **Description**: List all comments on a task ordered chronologically (`created_at ASC`).
- **Auth**: Project Member.
- **Query Parameters**: `projectId` (required).
- **Produces**: `application/json`
- **Response `200 OK`**: Array of `CommentDTO` items.

---

### 7.3 PUT `/api/tasks/{taskId}/comments/{commentId}`
- **Description**: Edit an existing comment. Broadcasts `COMMENT_UPDATED` over WebSocket.
- **Auth**: Comment Author (or system `ADMIN`).
- **Query Parameters**: `projectId` (required).
- **Consumes / Produces**: `application/json`
- **Request Body**:
  ```json
  {
    "content": "Updated comment text."
  }
  ```
- **Response `200 OK`**: Updated `CommentDTO`.
- **Errors**:
  - `403 Forbidden`: `{"error":"Access denied: only author or admin can edit"}`
  - `404 Not Found`: `{"error":"Comment not found"}`

---

### 7.4 DELETE `/api/tasks/{taskId}/comments/{commentId}`
- **Description**: Delete a comment. Broadcasts `COMMENT_DELETED` over WebSocket with `{commentId}`.
- **Auth**: Comment Author (or system `ADMIN`).
- **Query Parameters**: `projectId` (required).
- **Produces**: `application/json`
- **Response `200 OK`**:
  ```json
  {
    "message": "Comment deleted"
  }
  ```
- **Errors**:
  - `403 Forbidden`: `{"error":"Access denied: only author or admin can delete"}`
  - `404 Not Found`: `{"error":"Comment not found"}`

---

## 8. Attachment Endpoints (`/api/tasks/{taskId}/attachments`)

### 8.1 POST `/api/tasks/{taskId}/attachments`
- **Description**: Upload a binary file attachment for a task. Broadcasts `ATTACHMENT_CREATED` over WebSocket.
- **Auth**: Project Member.
- **Query Parameters**: `projectId` (required).
- **Consumes**: `multipart/form-data`
- **Form Fields**: `file` (binary file payload).
- **Produces**: `application/json`
- **Response `201 Created`**:
  ```json
  {
    "id": 8,
    "taskId": 10,
    "uploaderId": 1,
    "uploaderName": "System Administrator",
    "originalName": "architecture_diagram.png",
    "fileSize": 1048576,
    "uploadedAt": "2026-10-18T10:20:00Z"
  }
  ```
- **Errors**:
  - `400 Bad Request`: Missing file or empty payload.
  - `403 Forbidden`: `{"error":"Access denied"}`
  - `404 Not Found`: `{"error":"Task not found"}`

---

### 8.2 GET `/api/tasks/{taskId}/attachments`
- **Description**: List metadata for all attachments on a task ordered by upload date (`uploaded_at DESC`).
- **Auth**: Project Member.
- **Query Parameters**: `projectId` (required).
- **Produces**: `application/json`
- **Response `200 OK`**: Array of `AttachmentDTO` items.

---

### 8.3 GET `/api/tasks/{taskId}/attachments/{attachmentId}`
- **Description**: Download an attachment file.
- **Auth**: Project Member.
- **Query Parameters**: `projectId` (required).
- **Produces**: File binary (`application/octet-stream` or inferred MIME type).
- **Response `200 OK`**:
  - Headers:
    - `Content-Disposition: attachment; filename="..."`
    - `Content-Type: ...`
  - Body: Binary stream.
- **Errors**:
  - `403 Forbidden`: `{"error":"Access denied"}`
  - `404 Not Found`: `{"error":"Attachment not found"}`

---

### 8.4 DELETE `/api/tasks/{taskId}/attachments/{attachmentId}`
- **Description**: Delete an attachment (removes file from storage disk and deletes database record). Broadcasts `ATTACHMENT_DELETED` over WebSocket with `{attachmentId}`.
- **Auth**: Project Member.
- **Query Parameters**: `projectId` (required).
- **Produces**: `application/json`
- **Response `200 OK`**:
  ```json
  {
    "message": "Attachment deleted"
  }
  ```
- **Errors**:
  - `403 Forbidden`: `{"error":"Access denied"}`
  - `404 Not Found`: `{"error":"Attachment not found"}`

---

### 8.5 GET `/api/projects/{projectId}/library`
- **Description**: List attachments in the project's isolated Library. Displays direct library uploads, task attachments from direct tasks in this project, and forwarded attachments. Strictly isolated: does not include attachments from child sub-projects.
- **Auth**: Project Member (inherits access from parent project if sub-project).
- **Query Parameters**:
  - `search` (optional): Case-insensitive substring match on `originalName`.
  - `fileType` (optional): `all`, `image` (png, jpg, jpeg, gif, webp, svg, bmp), `document` (pdf, doc, docx, txt, rtf, odt, xls, xlsx, ppt, pptx, csv), `archive` (zip, tar, gz, rar, 7z), or `other`.
  - `source` (optional): `all`, `direct` (direct library uploads), `task` (attached to a task), `forwarded` (forwarded from another project).
  - `sortBy` (optional): `newest` (default), `oldest`, `name_asc`, `name_desc`, `size_asc`, `size_desc`.
- **Produces**: `application/json`
- **Response `200 OK`**:
  ```json
  [
    {
      "id": 101,
      "projectId": 2,
      "taskId": 15,
      "taskTitle": "Design Landing Page",
      "originalName": "mockup.png",
      "fileSize": 204850,
      "uploadedAt": "2026-10-23T19:30:00",
      "uploadedBy": 1,
      "uploadedByName": "System Administrator",
      "forwardedBy": null,
      "forwardedByName": null,
      "forwardedAt": null,
      "sourceProjectId": null,
      "sourceProjectName": null,
      "sourceAttachmentId": null,
      "isForwarded": false
    }
  ]
  ```
- **Errors**:
  - `401 Unauthorized`: `{"error":"Authentication required"}`
  - `403 Forbidden`: `{"error":"Access denied"}`
  - `404 Not Found`: `{"error":"Project not found"}`

---

### 8.6 POST `/api/projects/{projectId}/library`
- **Description**: Direct file upload to the project's Library without attaching to a specific task. Broadcasts `ATTACHMENT_CREATED` event over WebSocket with `taskId = null`.
- **Auth**: Project Member. Blocked if project is completed (view-only mode).
- **Consumes**: `multipart/form-data`
- **Form Parameters**: `file` (FileUpload, required).
- **Produces**: `application/json`
- **Response `201 Created`**: Returns created `AttachmentDTO`.
- **Errors**:
  - `400 Bad Request`: `{"error":"File is required"}` or `{"error":"Project is marked as completed and is in view-only mode"}`
  - `401 Unauthorized`: `{"error":"Authentication required"}`
  - `403 Forbidden`: `{"error":"Access denied"}`
  - `404 Not Found`: `{"error":"Project not found"}`

---

### 8.7 GET `/api/projects/{projectId}/library/{attachmentId}` & `/download`
- **Description**: Retrieve library file metadata and download information. Permitted even in completed projects (read-only mode allows downloads).
- **Auth**: Project Member.
- **Produces**: `application/json`
- **Response `200 OK`**: Returns `AttachmentDTO`.
- **Errors**:
  - `401 Unauthorized`: `{"error":"Authentication required"}`
  - `403 Forbidden`: `{"error":"Access denied"}`
  - `404 Not Found`: `{"error":"Attachment not found in project"}`

---

### 8.8 GET `/api/projects/{projectId}/library/{attachmentId}/targets`
- **Description**: List eligible destination projects for forwarding the specified attachment. If in a Main Project, targets are all child sub-projects. If in a Sub-Project, targets are the parent Main Project and sibling sub-projects. Each target includes `alreadyForwarded: boolean`.
- **Auth**: Project Lead or Admin (`projectService.isLeadOrAdmin`). Regular members are forbidden.
- **Produces**: `application/json`
- **Response `200 OK`**:
  ```json
  [
    {
      "id": 3,
      "name": "Backend API Subproject",
      "isSubproject": true,
      "completed": false,
      "alreadyForwarded": false
    }
  ]
  ```
- **Errors**:
  - `401 Unauthorized`: `{"error":"Authentication required"}`
  - `403 Forbidden`: `{"error":"Only project leads or admins can forward attachments"}`
  - `404 Not Found`: `{"error":"Project not found"}` or `{"error":"Attachment not found in this project"}`

---

### 8.9 POST `/api/projects/{projectId}/library/{attachmentId}/forward`
- **Description**: Forward an attachment from the current project to one or more destination projects. Duplicates database records referencing the existing physical storage file (zero disk byte overhead). Sets provenance fields (`forwardedBy`, `forwardedAt`, `sourceProjectId`, `sourceAttachmentId`). Broadcasts `ATTACHMENT_CREATED` to each destination project.
- **Auth**: Project Lead or Admin (`projectService.isLeadOrAdmin`). Blocked if source project is completed or any target project is completed.
- **Consumes**: `application/json`
- **Produces**: `application/json`
- **Request Body**:
  ```json
  {
    "targetProjectIds": [3, 4]
  }
  ```
- **Response `200 OK`**: Returns `List<AttachmentDTO>` for newly created forwarded attachments.
- **Errors**:
  - `400 Bad Request`: `{"error":"Target project IDs must not be empty"}` or `{"error":"Cannot forward to completed project: ..."}`
  - `401 Unauthorized`: `{"error":"Authentication required"}`
  - `403 Forbidden`: `{"error":"Only project leads or admins can forward attachments"}` or `{"error":"Target project is not a valid destination"}`
  - `404 Not Found`: `{"error":"Source project not found"}` or `{"error":"Attachment not found in source project"}`

---

### 8.10 DELETE `/api/projects/{projectId}/library/{attachmentId}`
- **Description**: Delete an attachment from the project library. Only file owner (uploader/forwarder) or project lead/admin can delete. Uses reference counting so physical file on disk is only deleted if no other attachment records share the same file path. Blocked if project is completed. Broadcasts `ATTACHMENT_DELETED`.
- **Auth**: File Owner or Project Lead / Admin.
- **Produces**: `application/json`
- **Response `200 OK`**: `{"message":"Attachment deleted"}`
- **Errors**:
  - `400 Bad Request`: `{"error":"Project is marked as completed and is in view-only mode"}`
  - `401 Unauthorized`: `{"error":"Authentication required"}`
  - `403 Forbidden`: `{"error":"Access denied: only file owner or project lead/admin can delete files"}`
  - `404 Not Found`: `{"error":"Attachment not found in project"}`

---

## 9. WebSocket Real-Time Specification (`/ws/projects/{projectId}`)

### 9.1 Connection & Handshake Lifecycle
- **Endpoint**: `ws://<host>:<port>/ws/projects/{projectId}` (or `wss://` in production).
- **Authentication**: Validated during handshake using `session_id` cookie sent by the browser.
- **Handshake Verification**:
  1. Quarkus WebSocket Next `@OnOpen` inspects the Vert.x `RoutingContext` session.
  2. Resolves `userId` from session. If missing or invalid, closes connection immediately with code `4001`.
  3. Verifies user is active and an approved member of `projectId`. If not a member, closes with code `4003`.
  4. On successful verification, registers connection with `SessionManager`.

### 9.2 Close Reason Codes
| Close Code | Reason | Meaning |
|---|---|---|
| `1000` | Normal Closure | Clean disconnect by client or server unmount |
| `4001` | Authentication required | Session cookie missing, expired, or invalid user |
| `4003` | Access denied | User is authenticated but not a member of the project |

### 9.3 WebSocket Message Envelope
Every message broadcast from the backend adheres to the following JSON structure:
```json
{
  "type": "EVENT_TYPE",
  "projectId": 1,
  "taskId": 10,
  "payload": {}
}
```

### 9.4 Event Types & Payload Schemas

| Event Type | `taskId` | `payload` Content | Description |
|---|---|---|---|
| `TASK_CREATED` | Task ID | `{"task": TaskDTO}` | Dispatched when a task is created |
| `TASK_UPDATED` | Task ID | `{"task": TaskDTO}` | Dispatched when task attributes or status change |
| `TASK_DELETED` | Task ID | `{}` | Dispatched when a task is removed |
| `COMMENT_CREATED` | Task ID | `{"comment": CommentDTO}` | Dispatched when a comment is added |
| `COMMENT_UPDATED` | Task ID | `{"comment": CommentDTO}` | Dispatched when comment content is edited |
| `COMMENT_DELETED` | Task ID | `{"commentId": Long}` | Dispatched when a comment is deleted |
| `ATTACHMENT_CREATED` | Task ID | `{"attachment": AttachmentDTO}` | Dispatched when a file is uploaded |
| `ATTACHMENT_DELETED` | Task ID | `{"attachmentId": Long}` | Dispatched when a file is removed |

---

## 10. Data Transfer Objects (DTO) Reference

### 10.1 `UserDTO`
```ts
interface UserDTO {
  id: number;
  username: string;
  fullName: string;
  role: 'ADMIN' | 'MEMBER';
  active: boolean;
  createdAt: string;
  updatedAt: string;
}
```

### 10.2 `ProjectDTO`
```ts
interface ProjectDTO {
  id: number;
  name: string;
  description: string;
  projectKey: string;
  archived: boolean;
  createdBy: number;
  createdByName?: string;
  leadId: number;
  leadName?: string;
  pendingLeadId?: number | null;
  pendingLeadName?: string | null;
  parentProjectId?: number | null;
  parentProjectName?: string | null;
  parentProjectKey?: string | null;
  isSubproject: boolean;
  subprojectCount?: number;
  memberSummaries: UserDTO[];
  inheritedMemberSummaries?: UserDTO[];
  createdAt: string;
  updatedAt: string;
}
```

### 10.3 `TaskDTO`
```ts
interface TaskDTO {
  id: number;
  projectId: number;
  title: string;
  description?: string;
  status: 'TODO' | 'IN_PROGRESS' | 'REVIEW' | 'DONE';
  priority: 'LOW' | 'MEDIUM' | 'HIGH';
  assigneeId?: number;
  assigneeName?: string;
  dueDate?: string;
  version: number;
  createdBy: number;
  createdByName?: string;
  updatedBy: number;
  createdAt: string;
  updatedAt: string;
}
```

### 10.4 `PageResponse<T>`
```ts
interface PageResponse<T> {
  items: T[];
  total: number;
  page: number;
  size: number;
  totalPages: number;
}
```

### 10.5 `CommentDTO`
```ts
interface CommentDTO {
  id: number;
  taskId: number;
  authorId: number;
  authorName: string;
  content: string;
  createdAt: string;
  updatedAt: string;
}
```

### 10.6 `AttachmentDTO`
```ts
interface AttachmentDTO {
  id: number;
  taskId: number;
  uploaderId: number;
  uploaderName: string;
  originalName: string;
  fileSize: number;
  uploadedAt: string;
}
```

### 10.7 `ProjectInvitationDTO`
```ts
interface ProjectInvitationDTO {
  id: number;
  projectId: number;
  projectName?: string;
  projectKey?: string;
  invitedUserId: number;
  invitedUsername?: string;
  invitedUserFullName?: string;
  invitedBy: number;
  invitedByUsername?: string;
  status: 'PENDING' | 'ACCEPTED' | 'DECLINED' | 'CANCELED' | 'EXPIRED';
  expiresAt: string;
  expired: boolean;
  createdAt: string;
}
```

### 10.8 `NotificationDTO`
```ts
interface NotificationDTO {
  id: number;
  type: 'PROJECT_INVITE' | 'SYSTEM';
  title: string;
  message: string;
  dataJson?: string;
  data?: Record<string, unknown>;
  isRead: boolean;
  createdAt: string;
}
```

### 10.9 `NotificationsResponseDTO`
```ts
interface NotificationsResponseDTO {
  notifications: NotificationDTO[];
  unreadCount: number;
}
```

---

## 11. Project Invitation Endpoints (`/api/projects/{projectId}/invitations` & `/api/invitations/{id}`)

### 11.1 POST `/api/projects/{projectId}/invitations`
- **Description**: Send a project invitation to an active user. Creates an invitation with a 7-day expiration date, creates an unread `PROJECT_INVITE` notification for the recipient, and broadcasts a real-time event to the recipient's notification bell via WebSocket.
- **Auth**: Project Lead (creator) or System `ADMIN`.
- **Consumes / Produces**: `application/json`
- **Request Body**:
  ```json
  {
    "userId": 2
  }
  ```
- **Response `201 Created`**:
  ```json
  {
    "id": 1,
    "projectId": 5,
    "projectName": "Cloud Architecture",
    "projectKey": "CA",
    "invitedUserId": 2,
    "invitedUsername": "alice",
    "invitedUserFullName": "Alice Smith",
    "invitedBy": 1,
    "invitedByUsername": "admin",
    "status": "PENDING",
    "expiresAt": "2026-10-29T10:00:00Z",
    "expired": false,
    "createdAt": "2026-10-22T10:00:00Z"
  }
  ```
- **Errors**:
  - `400 Bad Request`: `{"error":"User is already a project member"}` or user inactive.
  - `403 Forbidden`: `{"error":"Access denied: Project lead or ADMIN role required"}`
  - `404 Not Found`: `{"error":"Project not found"}`
  - `409 Conflict`: `{"error":"A pending invitation already exists for this user"}`

---

### 11.2 GET `/api/projects/{projectId}/invitations`
- **Description**: List all invitations for this project, sorted newest first. Automatically evaluates any pending invitations whose expiration date has elapsed and updates their status to `EXPIRED`.
- **Auth**: Project Member or System `ADMIN`.
- **Produces**: `application/json`
- **Response `200 OK`**: Array of `ProjectInvitationDTO` items.
- **Errors**:
  - `403 Forbidden`: `{"error":"Access denied: Project membership or ADMIN role required"}`
  - `404 Not Found`: `{"error":"Project not found"}`

---

### 11.3 DELETE `/api/projects/{projectId}/invitations/{invitationId}`
- **Description**: Cancel / revoke a pending project invitation. Sets status to `CANCELED`.
- **Auth**: Project Lead (creator) or System `ADMIN`.
- **Produces**: `application/json`
- **Response `200 OK`**: Updated `ProjectInvitationDTO` with `status: "CANCELED"`.
- **Errors**:
  - `400 Bad Request`: `{"error":"Cannot cancel an invitation that is already ACCEPTED"}`
  - `403 Forbidden`: `{"error":"Access denied"}`
  - `404 Not Found`: `{"error":"Invitation not found"}`

---

### 11.4 POST `/api/invitations/{id}/accept`
- **Description**: The invited recipient accepts the invitation. Validates that the invitation has not expired, inserts the user into `project_members`, transitions status to `ACCEPTED`, automatically marks the associated notification as read, and broadcasts WebSocket updates.
- **Auth**: The authenticated user matching `invitedUserId`.
- **Produces**: `application/json`
- **Response `200 OK`**: Updated `ProjectInvitationDTO` with `status: "ACCEPTED"`.
- **Errors**:
  - `400 Bad Request`: `{"error":"Invitation has expired"}` or `{"error":"Invitation is no longer pending"}`
  - `403 Forbidden`: `{"error":"Access denied: You are not the recipient of this invitation"}`
  - `404 Not Found`: `{"error":"Invitation not found"}`

---

### 11.5 POST `/api/invitations/{id}/decline`
- **Description**: The invited recipient declines the invitation. Validates not expired, transitions status to `DECLINED`, automatically marks the associated notification as read, and does not enroll the user.
- **Auth**: The authenticated user matching `invitedUserId`.
- **Produces**: `application/json`
- **Response `200 OK`**: Updated `ProjectInvitationDTO` with `status: "DECLINED"`.
- **Errors**:
  - `400 Bad Request`: `{"error":"Invitation has expired"}` or `{"error":"Invitation is no longer pending"}`
  - `403 Forbidden`: `{"error":"Access denied: You are not the recipient of this invitation"}`
  - `404 Not Found`: `{"error":"Invitation not found"}`

---

## 12. Notification Endpoints (`/api/notifications`)

### 12.1 GET `/api/notifications`
- **Description**: Retrieve all notifications for the current authenticated user ordered by `createdAt DESC`, along with the current total unread counter.
- **Auth**: Valid session cookie required.
- **Produces**: `application/json`
- **Response `200 OK`**:
  ```json
  {
    "notifications": [
      {
        "id": 15,
        "type": "PROJECT_INVITE",
        "title": "Project Invitation: Cloud Architecture",
        "message": "@admin invited you to join Cloud Architecture (CA)",
        "data": {
          "invitationId": 1,
          "projectId": 5,
          "projectName": "Cloud Architecture",
          "projectKey": "CA",
          "invitedBy": 1,
          "invitedByUsername": "admin"
        },
        "isRead": false,
        "createdAt": "2026-10-22T10:00:00Z"
      }
    ],
    "unreadCount": 1
  }
  ```
- **Errors**:
  - `401 Unauthorized`: `{"error":"Authentication required"}`

---

### 12.2 PUT `/api/notifications/{id}/read`
- **Description**: Mark a single notification as read (`is_read = true`). Emits real-time event to the user's active sessions.
- **Auth**: Valid session cookie matching `recipientId`.
- **Produces**: `application/json`
- **Response `200 OK`**: Updated `NotificationDTO` with `isRead: true`.
- **Errors**:
  - `401 Unauthorized`: `{"error":"Authentication required"}`
  - `404 Not Found`: `{"error":"Notification not found"}`

---

### 12.3 PUT `/api/notifications/read-all`
- **Description**: Mark all unread notifications for the current user as read in bulk. Emits real-time event with `unreadCount: 0`.
- **Auth**: Valid session cookie required.
- **Produces**: `application/json`
- **Response `200 OK`**:
  ```json
  {
    "message": "All notifications marked as read",
    "unreadCount": 0
  }
  ```
- **Errors**:
  - `401 Unauthorized`: `{"error":"Authentication required"}`

---

## 13. User Notification WebSocket (`/ws/notifications`)

### 13.1 Connection & Handshake Lifecycle
- **Endpoint**: `ws://<host>:<port>/ws/notifications` (or `wss://` in production).
- **Authentication**: Validated during handshake via `session_id` cookie or query parameter. Resolves `userId` from Vert.x session store.
- **Registration**: On successful handshake, registers the connection in `SessionManager` under `userSessions`.

### 13.2 Real-Time Event Types
Broadcast directly to the recipient's active sessions:
1. `NOTIFICATION_CREATED`:
   ```json
   {
     "type": "NOTIFICATION_CREATED",
     "notification": { ...NotificationDTO... },
     "unreadCount": 3
   }
   ```
2. `NOTIFICATION_UPDATED`:
   ```json
   {
     "type": "NOTIFICATION_UPDATED",
     "notification": { ...NotificationDTO... },
     "unreadCount": 2
   }
   ```
3. `ALL_NOTIFICATIONS_READ`:
   ```json
   {
     "type": "ALL_NOTIFICATIONS_READ",
     "unreadCount": 0
   }
   ```
