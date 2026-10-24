# Plan 13 — User Management & Profile System (Admin User Creation, RBAC Hierarchy, Profile Settings)

## Status: COMPLETED
- Created At: 2026-10-20T21:45:00+05:00
- Updated At: 2026-10-20T22:20:00+05:00
- Plan ID: plan_13

---

## 1. Overview & Objectives
Currently, the system only seeds an initial `admin` account via Flyway migrations, without any frontend interface or backend email support to register and manage additional team members.
This plan implements an end-to-end User Management and Profile system:
1. **Database & Entity Enhancement**:
   - Add `email` and `created_by` (creator hierarchy) to the `users` table via Flyway migration `V6`.
   - Seed Super Admin email as `superadmin@pm.local`.
   - Partial unique index on active usernames: `CREATE UNIQUE INDEX idx_users_active_username ON users (LOWER(username)) WHERE active = true;`, ensuring that if a user is deleted/deactivated, their username is freed up and becomes available again.
2. **Real-time Username Availability Indicator (Instagram style)**:
   - Admin typing a username in the "New User" modal gets immediate visual feedback:
     - **Green** border / ring + checkmark icon when the username is available.
     - **Red** border / ring + alert icon when the username is already taken.
   - Dedicated backend endpoint: `GET /api/users/check-username?username=...`.
3. **"WhatsApp Group Creator" Permission Hierarchy**:
   - **Super Admin (Seed Creator, `createdBy == null`)**:
     - Cannot be deleted, deactivated, or demoted by anyone (including self).
     - Can create, edit, deactivate, reset passwords, and delete other admins/users.
   - **Secondary Admin**:
     - Can create and manage standard `USER`s.
     - Cannot delete or demote the Super Admin.
     - Cannot delete themselves.
   - **Standard User**:
     - Can view and edit **only** their own `fullName` and change their `password` in their Profile; cannot edit `username`, `email`, or `role`.
4. **Admin User Management Interface (`/admin/users`)**:
   - Dedicated dashboard for Admins to view all users, filter/search, create new users (with Option A initial password), edit user roles/emails/names, toggle active status, and reset passwords.
5. **User Profile Section (`/profile`)**:
   - Accessible by all authenticated users to view their account info, update their `fullName`, and securely change their `password`.
6. **Project Member Integration**:
   - Allows project settings to pull the active user directory for assigning project members.

---

## 2. Technical Scope & Architecture

### 2.1 Backend Changes
1. **Flyway Migration (`V6__add_user_email_and_creator.sql`)**:
   - Add `email VARCHAR(150) UNIQUE` to `users`.
   - Update existing seed admin with `email = 'superadmin@pm.local'`.
   - Set `email` column as `NOT NULL`.
   - Add `created_by BIGINT REFERENCES users(id)` (nullable for initial super admin).
   - Adjust username unique constraint:
     ```sql
     ALTER TABLE users DROP CONSTRAINT IF EXISTS users_username_key;
     CREATE UNIQUE INDEX idx_users_active_username ON users (LOWER(username)) WHERE active = true;
     ```
     This ensures if a user is deactivated/deleted, their username is immediately available for reuse.
2. **Panache Entity (`User.java`)**:
   - Add `@Column(unique = true, nullable = false, length = 150) public String email;`
   - Add `@Column(name = "created_by") public Long createdBy;`
   - Helper methods: `boolean isSuperAdmin()` (`createdBy == null && role == Role.ADMIN`).
3. **DTOs (`com.securepm.auth.dto`)**:
   - `CreateUserRequest`: `username`, `email`, `fullName`, `password`, `role`.
   - `UpdateUserRequest`: `fullName`, `email`, `role`, `active`, `password`.
   - `UpdateProfileRequest`: `fullName`, `currentPassword`, `newPassword`.
   - `UserDTO`: Include `email`, `createdBy`, `isSuperAdmin`.
   - `UsernameAvailabilityResponse`: `boolean available`, `String username`.
4. **API Endpoints (`UserResource.java` & `AuthResource.java`)**:
   - `GET /api/users/check-username?username={val}`: Check if username is available (checks active users case-insensitively).
   - `GET /api/users`: Admin-only list of all users.
   - `POST /api/users`: Admin-only user creation (validates unique active username, email, min 8 char password, role, records `createdBy = currentUser.id`).
   - `GET /api/users/{id}`: Admin-only user detail.
   - `PUT /api/users/{id}`: Admin-only update (validates hierarchy: secondary admin cannot demote super admin; cannot edit super admin role).
   - `DELETE /api/users/{id}`: Admin-only soft delete / deactivation:
     - Reject if `target.id == currentUser.id` (cannot delete self).
     - Reject if `target.isSuperAdmin()` (cannot delete super admin).
     - Reject if requester is secondary admin and target is another admin created by super admin.
   - `PUT /api/auth/profile`: Authenticated user profile update (`fullName` and optional password change verifying `currentPassword`).
5. **Documentation**:
   - Document all updated endpoints in `docs/endpoints.md` per Rule 4.

### 2.2 Frontend Changes
1. **Types (`frontend/src/types/index.ts`)**:
   - Update `User` interface with `email`, `createdBy`, `isSuperAdmin`.
   - Add `CreateUserRequest`, `UpdateUserRequest`, `UpdateProfileRequest`, `UsernameCheckResult`.
2. **API Clients**:
   - `frontend/src/api/users.ts`: `listUsers()`, `createUser()`, `updateUser()`, `deleteUser()`, `resetPassword()`, `checkUsername(username)`.
   - `frontend/src/api/auth.ts`: `updateProfile()`.
3. **Navbar Enhancement (`frontend/src/components/Navbar.tsx`)**:
   - Add `"Team"` navigation link when `user.role === 'ADMIN'` pointing to `/admin/users`.
   - Add `"Profile"` link when clicking user avatar/name pointing to `/profile`.
4. **Admin Users Management Page (`frontend/src/pages/AdminUsersPage.tsx`)**:
   - User table: Name/Username, Email, Role, Status badge (Active/Inactive), Created date, Actions.
   - Filter/Search by username/name/role.
   - **"New User" Modal with Real-time Instagram-style Username Validation**:
     - Debounced (300ms) check against `GET /api/users/check-username`.
     - Visual states:
       - Default: Neutral slate border.
       - Checking: Subtle spinner indicator.
       - **Available**: Green border (`border-emerald-500/80 ring-emerald-500/20`), green check icon, text: "Username is available".
       - **Unavailable / Taken**: Red border (`border-rose-500/80 ring-rose-500/20`), red alert icon, text: "Username is already taken".
     - Other fields: `email`, `fullName`, `password` (Option A direct entry), `role` dropdown (`USER` or `ADMIN`).
   - "Edit User" Modal: Update fullName, email, role, active status.
   - "Reset Password" Modal: Set new password for a user.
   - "Deactivate/Delete User" confirmation modal with hierarchy rule enforcement.
5. **User Profile Page (`frontend/src/pages/ProfilePage.tsx`)**:
   - View account details: Username, Email, Role (read-only for standard users).
   - Edit Full Name form.
   - Change Password form (current password, new password, confirm password) with validation feedback.
6. **Routing (`frontend/src/App.tsx`)**:
   - Route `/profile`: Protected route for all logged-in users.
   - Route `/admin/users`: Protected route for Admins only.

---

## 3. Step-by-Step Implementation Steps

### Step 1: Database Migration & Entity Update
- Create `backend/src/main/resources/db/migration/V6__add_user_email_and_creator.sql`:
  - Set Super Admin email to `'superadmin@pm.local'`.
  - Replace absolute unique constraint with active-only partial unique index `idx_users_active_username`.
- Update `User.java` with `email` and `createdBy` fields and `isSuperAdmin()` method.
- Update `TestDatabaseCleaner.java` to handle sequence and cleanups properly.

### Step 2: Backend DTOs & Validation
- Update `CreateUserRequest.java` to require valid `email`.
- Update `UpdateUserRequest.java` to support `email`, `role`, `active`, `password`.
- Create `UpdateProfileRequest.java` for self-service profile updates.
- Create `UsernameAvailabilityResponse.java`.
- Update `UserDTO.java` to include `email`, `createdBy`, `isSuperAdmin`.

### Step 3: Backend Resource & Service Implementation
- Add `checkUsername` in `UserResource.java`.
- Update `UserResource.java` with hierarchy check methods:
  - `canModifyUser(currentUser, targetUser)`
  - `canDeleteUser(currentUser, targetUser)`
- Add profile management endpoint in `AuthResource.java` (`PUT /api/auth/profile`).
- Update `docs/endpoints.md`.

### Step 4: Backend Unit & Integration Tests
- Update `UserResourceTest.java` and `AuthResourceTest.java`:
  - Test username availability endpoint (available vs taken vs freed after deletion).
  - Test admin creating user with email and role.
  - Test duplicate active username and duplicate email rejection (409 Conflict).
  - Test super admin protection (cannot delete self, cannot delete super admin).
  - Test user profile update and password change verification.
  - Test standard user blocked from admin endpoints (403 Forbidden).

### Step 5: Frontend API Client & Types
- Update `frontend/src/types/index.ts`.
- Create `frontend/src/api/users.ts`.
- Update `frontend/src/api/auth.ts`.

### Step 6: Frontend Pages & Components
- Create `frontend/src/pages/ProfilePage.tsx` with modern dark-mode aesthetic.
- Create `frontend/src/pages/AdminUsersPage.tsx` with responsive data table, search, modals, and debounced Instagram-style green/red username validation.
- Update `Navbar.tsx` with `Team` link (ADMIN only) and `Profile` link.
- Update `App.tsx` with routes `/profile` and `/admin/users`.

### Step 7: Verification & Build
- Run backend test suite: `/opt/maven/bin/mvn test`.
- Run frontend linter: `npm run lint`.
- Run frontend build: `npm run build`.
- Verify user creation, permission boundaries, real-time username availability, and profile edits end-to-end.

---

## 4. Acceptance Criteria
- [x] Super admin account in database has email `superadmin@pm.local`.
- [x] Admin can navigate to `/admin/users` and view all registered users.
- [x] In "New User" modal, typing a username dynamically turns the field border green with a checkmark if available, or red with an alert icon if taken.
- [x] If a user is deactivated/deleted, their username is freed and can be registered by a new user.
- [x] Admin can create a new user with `username`, `email`, `fullName`, `password`, and `role` (`USER` or `ADMIN`).
- [x] Duplicate active username or email returns `409 Conflict` with clear error messages.
- [x] Super admin cannot be deleted or deactivated by anyone, nor can any admin delete themselves.
- [x] Secondary admins cannot delete the super admin.
- [x] Any user can open `/profile`, view their details, update `fullName`, and change their password.
- [x] Standard `USER` accounts cannot access `/admin/users` or call `/api/users` endpoints (`403 Forbidden`).
- [x] All automated tests pass (`mvn test`), frontend linting (`oxlint`) passes with 0 warnings/errors, and `tsc -b && vite build` succeeds.
