# Plan 14 — User Project Lead Capabilities & Super Admin Field Immutability

## Status: COMPLETED
- Created At: 2026-10-21T01:54:00+05:00
- Completed At: 2026-10-21T02:07:00+05:00
- Plan ID: plan_14

---

## 1. Overview & Objectives

### 1.1 Super Admin & Self Email Protection (Error 06)
- **Problem**: In `/admin/users`, an admin editing the Super Admin could edit and change the Super Admin email. Furthermore, admins should not be able to change their own email, username, or role.
- **Objective**:
  - Enforce backend immutability for the Super Admin's email (`superadmin@pm.local`), username (`admin`), and role (`ADMIN`).
  - Disallow any admin from modifying their own email, role, or active status via `PUT /api/users/{id}` (they can only change their full name there, or change password/full name in `/profile`).
  - Update the frontend Edit User modal so email is read-only for the Super Admin and for the currently logged-in user, with clear badge indicators explaining the restriction.
  - Ensure the database super admin email is set to `superadmin@pm.local`.

### 1.2 User Project Lead Capabilities
- **Problem**: Currently, only users with `role == Role.ADMIN` can see the "New Project" button, create projects, update project details, archive projects, or add/remove project members.
- **Objective**:
  - The concept of `ADMIN` represents system control (user management, global control). Standard `USER`s can be project leads in real life.
  - Allow standard `USER`s to see the "New Project" button and create new projects.
  - The creator of a project is its **Project Lead**:
    - The creator is automatically added to `project_members`.
    - The creator (or any system `ADMIN`) can access Project Settings (`/projects/:id/settings`).
    - The creator (or any system `ADMIN`) can update project details (name, description), archive the project, add members, and remove members.
    - The creator can assign any active user (including system `ADMIN`s and other `USER`s) to their project.
  - Standard users can fetch active users via `GET /api/users` solely for the purpose of member assignment.
  - Standard users do NOT have access to Admin User Management (`/admin/users`), which remains strictly restricted to system `ADMIN`s.

---

## 2. Technical Scope & Architecture

### 2.1 Backend Changes
1. **`UserResource.java`**:
   - In `PUT /api/users/{id}`:
     - Check: If `targetUser.isSuperAdmin() && request.email != null && !request.email.equalsIgnoreCase(targetUser.email)`, reject with `400 Bad Request` (`"Cannot modify super administrator email"`).
     - Check: If `targetUser.id.equals(currentUser.id)`:
       - If `request.email != null && !request.email.equalsIgnoreCase(targetUser.email)`, reject with `400 Bad Request` (`"Cannot modify your own email"`).
       - If `request.role != null && request.role != targetUser.role`, reject with `400 Bad Request` (`"Cannot modify your own role"`).
       - If `request.active != null && !request.active`, reject with `400 Bad Request` (`"Cannot deactivate yourself"`).
   - In `GET /api/users`:
     - Allow any authenticated user to list users.
     - If requester is an `ADMIN`: return all users (active and inactive, with all administrative metadata).
     - If requester is a standard `USER`: return active users only (`active = true`), suitable for member assignment dropdowns.
2. **`ProjectService.java`**:
   - `createProject`: Remove `currentUser.role.equals(Role.ADMIN)` check. Allow any authenticated active user.
   - Upon creating the project, insert `(project.id, currentUser.id)` into `project_members` so the creator is explicitly recorded in `project_members`.
   - `updateProject`, `archiveProject`, `addMember`, `removeMember`:
     - Change check from `!currentUser.role.equals(Role.ADMIN)` to:
       ```java
       if (!currentUser.role.equals(Role.ADMIN) && !project.createdBy.equals(currentUser.id)) {
           throw new SecurityException("Access denied: Project lead or ADMIN role required");
       }
       ```
3. **`ProjectResource.java`**:
   - `POST /api/projects`: Remove any admin check (requires only authenticated session).

### 2.2 Frontend Changes
1. **`DashboardPage.tsx`**:
   - Remove `isAdmin` condition from the top header "New Project" button and from the empty state "Create Project" button so all logged-in users have access to create projects.
2. **`ProjectSettingsPage.tsx`**:
   - Access control check: Change from `if (!isAdmin)` to:
     ```tsx
     const canManage = isAdmin || project?.createdBy === user?.id;
     if (!canManage) { ... Access Denied ... }
     ```
   - Load user directory: Allow loading `usersApi.fetchUsers()` whenever `canManage` is true, so project leads can assign members (including admins).
3. **`AdminUsersPage.tsx`**:
   - In Edit User modal:
     - If `selectedUser.isSuperAdmin`:
       - Email field rendered as disabled / read-only with note: "Super Administrator email cannot be modified".
     - If `selectedUser.id === currentUser?.id`:
       - Email field disabled / read-only with note: "You cannot change your own email".
       - Role field disabled with note: "You cannot change your own role".
       - Active toggle disabled with note: "You cannot deactivate your own account".

---

## 3. Step-by-Step Implementation Steps
1. **Step 1: Backend Implementation**
   - Update `UserResource.java` with email/self-edit immutability rules and user listing for member selection.
   - Update `ProjectService.java` with project lead permissions and automatic member insertion.
2. **Step 2: Frontend Implementation**
   - Update `AdminUsersPage.tsx` with email/self-protection UI.
   - Update `DashboardPage.tsx` to expose "New Project" for all users.
   - Update `ProjectSettingsPage.tsx` to permit project creator as project lead.
3. **Step 3: Automated Testing & Verification**
   - Update `UserResourceTest.java` and `ProjectResourceTest.java` to test:
     - Super admin email cannot be changed.
     - Admin cannot change own email or role.
     - Standard user can create project.
     - Standard user (creator) can update their project and add/remove members (including assigning admins).
     - Standard user cannot update another user's project.
     - Standard user can list active users for member assignment.
   - Run `/opt/maven/bin/mvn test`.
   - Run `npm run lint` and `npm run build`.
4. **Step 4: Documentation**
   - Update `docs/endpoints.md`.
   - Update `docs/errors/error_06.md` with resolution and verification.
   - Update `docs/plans/plan_14.md` to `COMPLETED`.

---

## 4. Acceptance Criteria
- [x] Super Admin email cannot be modified via `PUT /api/users/{id}` or the UI.
- [x] An admin cannot modify their own email, role, or active status via `PUT /api/users/{id}` or the UI.
- [x] Any authenticated user sees the "New Project" button on the Dashboard and can create a project.
- [x] Project creator is automatically added to `project_members`.
- [x] Project creator can access Project Settings, edit details, archive project, and add/remove members (including assigning admins).
- [x] Non-creator standard users cannot access Project Settings or modify projects they didn't create.
- [x] System admins retain global project management capabilities across all projects.
- [x] Standard users can fetch active users for member assignment, but cannot access `/admin/users`.
- [x] All automated tests pass (`mvn test`), and frontend linting/build pass with 0 errors.
