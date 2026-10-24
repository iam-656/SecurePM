# Plan 15 — Project Invitations & Notification System (Bell Icon, Invite Acceptance, Expiration, Real-time Delivery)

## Status: COMPLETED
- Created At: 2026-10-22T08:45:00+05:00
- Completed At: 2026-10-22T09:10:00+05:00
- Plan ID: plan_15

---

## 1. Overview & Objectives

Currently, adding a member to a project via `/projects/:id/settings` immediately adds them to `project_members`.
This plan replaces direct member addition with an asynchronous **Invitation and Notification system**:
1. **Invite-Only Enrollment**:
   - All member additions (including those initiated by Super Admin and system admins) must go through the project invitation workflow.
   - When a Project Lead or Admin invites a user, an invitation is created with a 7-day expiration.
2. **Generic Notification System**:
   - Database-backed notifications for users with unread tracking, filtering, and "Mark all as read".
   - Generically architected to support future event types (`PROJECT_INVITE`, `TASK_ASSIGNED`, etc.).
3. **Real-time Delivery**:
   - Real-time WebSocket event pushes to update the recipient's notification bell and badge counter immediately upon receiving an invite.
4. **User Experience & Management**:
   - **Navbar Notification Bell**: Badge counter, unread indicator, dropdown popover with "All" and "Unread" filters, "Mark all as read" button.
   - **Interactive Invite Notification Cards**: Display project details, inviter, expiration status, and one-click "Accept" / "Decline" buttons.
   - **Accept Action**: Transitions invite to `ACCEPTED`, automatically enrolls user in `project_members`, marks notification read, and project appears on user's dashboard.
   - **Decline Action**: Transitions invite to `DECLINED`, marks notification read, no membership created.
   - **Project Settings UI**:
     - **Active Members**: List current members with remove action.
     - **Pending Invitations**: List pending invites (invitee, invited by, expiry date, status) with a **"Cancel / Revoke"** action.

---

## 2. Technical Scope & Architecture

### 2.1 Database & Schema (Flyway Migration `V7`)
1. **Table `project_invitations`**:
   - `id BIGSERIAL PRIMARY KEY`
   - `project_id BIGINT NOT NULL REFERENCES projects(id) ON DELETE CASCADE`
   - `invited_user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE`
   - `invited_by BIGINT NOT NULL REFERENCES users(id)`
   - `status VARCHAR(30) NOT NULL DEFAULT 'PENDING'` (`PENDING`, `ACCEPTED`, `DECLINED`, `CANCELED`, `EXPIRED`)
   - `expires_at TIMESTAMP WITH TIME ZONE NOT NULL` (Default: `NOW() + INTERVAL '7 days'`)
   - `created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()`
   - `updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()`
   - **Partial Unique Index**:
     ```sql
     CREATE UNIQUE INDEX idx_project_invitations_pending
     ON project_invitations (project_id, invited_user_id)
     WHERE status = 'PENDING';
     ```
     Ensures a user cannot have multiple simultaneous pending invites for the same project.

2. **Table `notifications`**:
   - `id BIGSERIAL PRIMARY KEY`
   - `recipient_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE`
   - `type VARCHAR(50) NOT NULL` (`PROJECT_INVITE`, `SYSTEM`)
   - `title VARCHAR(200) NOT NULL`
   - `message TEXT NOT NULL`
   - `data_json TEXT` (Stores metadata such as `invitationId`, `projectId`, `projectKey`, `projectName`, `invitedByUsername`)
   - `is_read BOOLEAN NOT NULL DEFAULT FALSE`
   - `created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()`
   - Index on `(recipient_id, is_read, created_at DESC)`.

---

### 2.2 Backend Architecture

1. **Entities & Enums**:
   - `com.securepm.invitations.ProjectInvitation`: Panache entity.
   - `com.securepm.invitations.InvitationStatus`: `PENDING`, `ACCEPTED`, `DECLINED`, `CANCELED`, `EXPIRED`.
   - `com.securepm.notifications.Notification`: Panache entity.
   - `com.securepm.notifications.NotificationType`: `PROJECT_INVITE`, `SYSTEM`.

2. **DTOs**:
   - `ProjectInvitationDTO`: ID, projectId, projectName, projectKey, invitedUserId, invitedUsername, invitedUserFullName, invitedBy, invitedByUsername, status, expiresAt, isExpired, createdAt.
   - `CreateInvitationRequest`: `@NotNull Long userId`.
   - `NotificationDTO`: ID, type, title, message, data (parsed Map or object with invitation details), isRead, createdAt.

3. **REST API Endpoints**:
   - **Project Invitations (`/api/projects/{projectId}/invitations`)**:
     - `POST /api/projects/{projectId}/invitations`: Create an invite (Project Lead or Admin). Validates user is active, not already in `project_members`, and not pending. Sets `expiresAt = now + 7 days`. Emits notification & real-time WS event.
     - `GET /api/projects/{projectId}/invitations`: List invitations for this project (Lead or Admin). Automatically evaluates expired pending invites.
     - `DELETE /api/projects/{projectId}/invitations/{invitationId}`: Cancel/revoke invite (Lead or Admin). Marks status `CANCELED`.
   - **Invitation Actions (`/api/invitations/{id}`)**:
     - `POST /api/invitations/{id}/accept`: Authenticated invited user accepts. Verifies not expired. Inserts into `project_members`, marks invite `ACCEPTED`, updates notification.
     - `POST /api/invitations/{id}/decline`: Authenticated invited user declines. Marks invite `DECLINED`, updates notification.
   - **Notifications (`/api/notifications`)**:
     - `GET /api/notifications`: List current user's notifications (sorted newest first). Includes unread count.
     - `PUT /api/notifications/{id}/read`: Mark notification as read.
     - `PUT /api/notifications/read-all`: Mark all notifications for current user as read.

4. **Real-time Delivery (`UserNotificationWebSocket`)**:
   - `/ws/users/notifications`: User-scoped WebSocket endpoint with session cookie authentication.
   - When an invitation/notification is created or updated, broadcasts `NOTIFICATION_CREATED` or `NOTIFICATION_UPDATED` event to the recipient's active sessions.

---

### 2.3 Frontend Architecture

1. **State & Store (`useNotifications`)**:
   - Notification list, unread count, loading, error state.
   - Real-time listener via WebSocket to bump unread count and prepend notifications in real time.
   - Action handlers: `markAsRead`, `markAllAsRead`, `acceptInvite`, `declineInvite`.

2. **Navbar Notification Bell (`Navbar.tsx` & `NotificationBell.tsx`)**:
   - Bell icon with unread badge counter (e.g. `3` in emerald or rose pill).
   - Popover menu:
     - Header: "Notifications" title, unread count, and "Mark all as read" button.
     - Tabs: "All" and "Unread".
     - Empty states for no notifications or no unread notifications.
     - Card items for project invitations:
       - Project Key badge, project name, sender username, relative time.
       - If pending and active: "Accept" (emerald button) and "Decline" (slate/rose button).
       - If accepted: "Joined Project" subtle badge.
       - If declined: "Declined" subtle badge.
       - If expired: "Expired" warning badge.

3. **Project Settings Page Update (`ProjectSettingsPage.tsx`)**:
   - Replace direct "Add Member" with "Invite Member".
   - Split section into two tabs or cards:
     1. **Team Members**: Displays active enrolled members with "Remove" action.
     2. **Pending Invitations**: Displays sent invitations with invitee info, expiry date, status badge, and "Cancel Invite" action.

---

## 3. Step-by-Step Implementation Steps

### Step 1: Database Migration
- Create `backend/src/main/resources/db/migration/V7__create_invitations_and_notifications.sql`.
- Run validation and migration in Postgres.

### Step 2: Backend Entities, DTOs & Services
- Implement `ProjectInvitation` and `Notification` entities.
- Implement `ProjectInvitationService` with invite generation, expiration checking, member enrollment on accept, cancellation, and notification generation.
- Implement `NotificationService` with read tracking and bulk read operations.
- Implement `UserNotificationWebSocket` for real-time notification push to users.

### Step 3: Backend REST Resources
- Implement endpoints in `ProjectInvitationResource` and `NotificationResource`.
- Deprecate / replace direct `POST /api/projects/{id}/members` in favor of invitation flow, ensuring all additions require invite acceptance.
- Document all new endpoints in `docs/endpoints.md`.

### Step 4: Backend Automated Tests
- Create `ProjectInvitationResourceTest.java` and `NotificationResourceTest.java`:
  - Test lead/admin sending invite.
  - Test non-lead/non-admin blocked from sending invite (`403`).
  - Test duplicate pending invite rejected (`409`).
  - Test user accepting invite enrolls user in `project_members`.
  - Test user declining invite does not enroll user.
  - Test expired invite cannot be accepted.
  - Test lead/admin cancelling invite.
  - Test notification read and mark-all-read.

### Step 5: Frontend Types & API Client
- Add types for `ProjectInvitation`, `Notification`, `NotificationType`, `InvitationStatus`.
- Implement `frontend/src/api/invitations.ts` and `frontend/src/api/notifications.ts`.

### Step 6: Frontend Components & Pages
- Create `NotificationBell.tsx` with popover dropdown, unread counter, filter tabs, and action buttons.
- Integrate `NotificationBell` into `Navbar.tsx`.
- Update `ProjectSettingsPage.tsx` to display "Invite Member" flow and "Pending Invitations" list with cancel actions.
- Connect WebSocket hook for instant real-time notification updates.

### Step 7: Build & Verification
- Run backend test suite (`/opt/maven/bin/mvn test`).
- Run frontend linter (`npm run lint`) and build (`npm run build`).
- Verify complete invite lifecycle end-to-end in the browser.

---

## 4. Acceptance Criteria
- [x] Direct member enrollment is replaced with project invitations; all roles (including super admin) must invite users.
- [x] Project Lead or Admin can send project invite to any active user from Project Settings.
- [x] Invitations automatically expire after 7 days; expired invites cannot be accepted.
- [x] Inviting a user creates a `PROJECT_INVITE` notification and sends real-time WebSocket update to recipient.
- [x] Notification bell in Navbar shows live unread count and opens a dropdown with "All" and "Unread" filters.
- [x] Dropdown includes "Mark all as read" button that updates all unread notifications.
- [x] Recipient can click "Accept" on the notification card:
  - Enrolls user into `project_members`.
  - Updates invite status to `ACCEPTED`.
  - Project immediately becomes available on the recipient's dashboard.
- [x] Recipient can click "Decline" on the notification card:
  - Updates invite status to `DECLINED`.
  - User is not added to project.
- [x] Project Settings displays "Pending Invitations" list and allows Project Leads/Admins to cancel pending invites.
- [x] All automated tests pass (`mvn test`), and frontend linting/build pass with 0 errors.
