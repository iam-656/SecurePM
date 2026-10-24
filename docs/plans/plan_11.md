# Plan 11 — Phase 15: Backend Endpoint Documentation & Audit

## Status: COMPLETED
- Created At: 2026-10-19T17:23:00+05:00
- Completed At: 2026-10-19T17:24:30+05:00

## Overview
Perform a comprehensive audit and update of `docs/endpoints.md` according to Phase 15 of `docs/plans/securepm-mvp-plan.md` and repository rules. This document serves as the single source of truth for all API consumers (frontend, tests, external integrations, and documentation), detailing all 28 REST endpoints, the real-time WebSocket connection, authentication flows, error envelopes, and data contracts.

---

## Deliverables & Documentation Architecture

### 15.1 Master Summary Tables
- Include the complete master summary table for all 28 REST endpoints specifying `Method`, `Endpoint`, `Auth`, and `Description`.
- Include the WebSocket summary table specifying `Method`, `Endpoint`, `Auth`, and `Description`.

### 15.2 Detailed Endpoint Specifications
Document each endpoint with:
1. **Authentication & Authorization**: None / Session / ADMIN / Member / Author.
2. **Parameters**: Path parameters, Query parameters (with default values and required flags).
3. **Request Body**: Headers (`Content-Type`), Schema, and JSON example.
4. **Responses**: Success HTTP status code, response schema, and JSON example.
5. **Error Responses**: HTTP status codes (`400`, `401`, `403`, `404`, `409`, `500`) with error payload format.

Categorized into:
- **Authentication Endpoints** (`/api/auth/login`, `/api/auth/logout`, `/api/auth/me`)
- **User Management Endpoints** (`POST /api/users`, `GET /api/users`, `GET /api/users/{id}`, `PUT /api/users/{id}`, `DELETE /api/users/{id}`)
- **Project Management Endpoints** (`POST /api/projects`, `GET /api/projects`, `GET /api/projects/{id}`, `PUT /api/projects/{id}`, `DELETE /api/projects/{id}`, `POST /api/projects/{id}/members`, `POST /api/projects/{id}/members/{userId}`, `DELETE /api/projects/{id}/members/{userId}`)
- **Task Management Endpoints** (`POST /api/projects/{projectId}/tasks`, `GET /api/projects/{projectId}/tasks`, `GET /api/projects/{projectId}/tasks/kanban`, `GET /api/projects/{projectId}/tasks/{id}`, `PUT /api/projects/{projectId}/tasks/{id}`, `DELETE /api/projects/{projectId}/tasks/{id}`)
- **Comment Endpoints** (`POST /api/tasks/{taskId}/comments`, `GET /api/tasks/{taskId}/comments`, `PUT /api/tasks/{taskId}/comments/{id}`, `DELETE /api/tasks/{taskId}/comments/{id}`)
- **Attachment Endpoints** (`POST /api/tasks/{taskId}/attachments`, `GET /api/tasks/{taskId}/attachments`, `GET /api/tasks/{taskId}/attachments/{id}`, `DELETE /api/tasks/{taskId}/attachments/{id}`)

### 15.3 WebSocket Specification (`/ws/projects/{projectId}`)
- Connection lifecycle and upgrade protocol over HTTP/HTTPS.
- Vert.x session cookie validation and project membership checks.
- Connection closure codes: `4001` (Authentication required), `4003` (Access denied), `1000` (Normal closure).
- All 8 event types and detailed payload structures (`TASK_CREATED`, `TASK_UPDATED`, `TASK_DELETED`, `COMMENT_CREATED`, `COMMENT_UPDATED`, `COMMENT_DELETED`, `ATTACHMENT_CREATED`, `ATTACHMENT_DELETED`).

### 15.4 Data Models & Enums Reference
- Document all core Enums: `Role`, `TaskStatus`, `TaskPriority`, `ProjectEventType`.
- Document all DTO structures and JSON representations.

---

## Verification Results
1. **Consistency Audit**:
   - Audited all 6 JAX-RS Resource classes (`AuthResource`, `UserResource`, `ProjectResource`, `TaskResource`, `CommentResource`, `AttachmentResource`) and `ProjectWebSocket`. All 28 REST endpoints and the WebSocket endpoint accurately represented.
2. **Data Contracts & Types**:
   - Verified that all DTO definitions match Java backend Panache entities/DTOs and TypeScript interfaces in `frontend/src/types/`.
3. **Frontend API Client Alignment**:
   - Cross-checked `frontend/src/api/` modules (`auth.ts`, `users.ts`, `projects.ts`, `tasks.ts`, `comments.ts`, `attachments.ts`, `client.ts`) against the documented paths and query parameters.
4. **Documentation Quality**:
   - `docs/endpoints.md` updated with master tables, parameters, JSON payload examples, status codes, error models, and close reason codes.

