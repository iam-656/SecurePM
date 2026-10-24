# 1. Authentication & Authorization
- User Roles: Two roles only: ADMIN (manages users/projects) and MEMBER (uses projects/tasks).
- User Management (Admin only): Create, update, and deactivate local user accounts (Username, Password hashed with bcrypt, Full Name, Role).
- Login/Logout: Secure JWT-based authentication (or Quarkus session-based auth) with token expiration.
- Context Awareness: Every API request must resolve the current user to enforce data isolation (e.g., a user can only see projects they are assigned to).

# 2. Project Management
- Project CRUD: Create, Read, Update, and Archive projects.
- Project Metadata: Name, Description, and a short unique Key (e.g., "SEC" for SecurePM).
- Member Assignment: Admin can add/remove existing local users to/from a specific project.

# 3. Task Management (The Core)
- Task CRUD: Create, Read, Update, Delete tasks within a project.
- Task Data Model:
    - Title (String, required)
    - Description (String/Markdown, optional)
    - Status (Enum: TODO, IN_PROGRESS, REVIEW, DONE)
    - Priority (Enum: LOW, MEDIUM, HIGH)
    - Assignee (Foreign Key to User, optional)
    - Due Date (LocalDate, optional)
- List View API: Endpoint to fetch tasks for a project with basic filtering (by status, assignee) and pagination.
- Kanban View API: Endpoint optimized to fetch tasks grouped by Status for drag-and-drop UI rendering.

# 4. Real-Time Collaboration (WebSockets)
- WebSocket Endpoint: A Quarkus @WebSocket endpoint that clients connect to upon loading a project.
- Broadcast Events: When a task is created, updated (e.g., status change), or deleted, the server broadcasts a lightweight JSON event (e.g., { type: "TASK_UPDATED", taskId: 123, payload: {...} }) to all connected clients in that project.
- Connection Handling: Graceful handling of Wi-Fi drops (clients can reconnect and fetch the latest state via REST if they miss a WebSocket message).

# 5. Local File Attachments
- Upload Endpoint: multipart/form-data endpoint to upload a file to a specific task.
- Local Storage Logic: Quarkus saves the file to a configured local directory (e.g., /data/attachments/{projectId}/{taskId}/) and saves only the file path, original name, and size in the PostgreSQL Attachment entity.
- Download Endpoint: Secure endpoint to stream the file back to the user, verifying they have access to the parent task/project.
- Delete Attachment: Removes the file from the local disk and the database record.

# 6. Task Comments
- Comment CRUD: Add, edit, and delete text-based comments on a specific task.
- Metadata: Automatically capture the author (current user) and timestamp.
- Real-time: New comments trigger a WebSocket broadcast to the task's viewers.

# 7. Infrastructure & Deployment (MVP Level)
- Database Migrations: Flyway scripts (V1__init.sql, V2__tasks.sql, etc.) to ensure the schema is created reliably on first run.
- Configuration: application.properties properly split into %dev (localhost) and %prod (environment variables) profiles.
- Docker Compose: A single docker-compose.yml containing:
    - postgres (with a persistent named volume).
    - quarkus-app (with a persistent host-mounted volume for /data/attachments).
    - nginx (configured as a reverse proxy with WebSocket upgrade headers and local SSL termination).

# Strictly OUT OF SCOPE for MVP
- Do not write code for these until the MVP is deployed and used.
- Active Directory / LDAP integration (use local DB auth for now).
- Email notifications.
- Gantt charts, roadmaps, or task dependencies (blocking/blocked by).
- Time tracking or billing.
- Custom fields or complex workflow automations.
- Native mobile apps