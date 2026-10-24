# Error 06 — System Administrator Email Modifiable in User Management

## Summary
When logging in as the System Administrator and navigating to `http://localhost:5173/admin/users`, clicking the "Edit" action button on the System Administrator opened the Edit User modal with an editable email input field. Updating the email field and submitting persisted the change to the database, altering the Super Admin email.

---

## Root Cause Analysis
1. **Backend Validation Gap**:
   - In `UserResource.java` (`PUT /api/users/{id}`), validations existed to prevent demoting the Super Admin (`req.role != null && req.role != Role.ADMIN`) and to prevent secondary admins from changing the Super Admin role (`!currentUser.isSuperAdmin() && req.role != null`).
   - However, there was no check preventing changes to the Super Admin's email (`target.isSuperAdmin() && req.email != null && !req.email.equalsIgnoreCase(target.email)`).
   - Additionally, there was no check preventing an admin from editing their own email, role, or active status (`target.id.equals(currentUser.id)`).
2. **Frontend UI State**:
   - In `AdminUsersPage.tsx`, the Edit User modal disabled the Role select and Active toggle for Super Admin, but rendered the Email Address input as an ordinary editable text field.
   - There was also no restriction on editing one's own email, role, or status when editing the currently logged-in user.

---

## Required Resolution
1. **Backend (`UserResource.java`)**:
   - Reject any attempt to modify the Super Admin's email address (must remain `superadmin@pm.local`).
   - Reject any attempt by an administrator to modify their own email, role, or active status in `PUT /api/users/{id}`.
2. **Frontend (`AdminUsersPage.tsx`)**:
   - Disable the Email Address input when `selectedUser.isSuperAdmin` or `selectedUser.id === currentUser?.id`, displaying a clear visual badge and explanatory message.
   - Disable Role and Active status when editing oneself.
3. **Database State Verification**:
   - Ensure the Super Admin email is restored to `superadmin@pm.local`.

---

## Status
- Documented: 2026-10-21T01:53:00+05:00
- Resolution: RESOLVED
- Updated At: 2026-10-21T02:05:00+05:00

---

## Resolution & Changes Made
1. **[ATTEMPT 1/3] Backend Enforcement (`UserResource.java`)**:
   - In `PUT /api/users/{id}`, added explicit validation checking if `target.isSuperAdmin() && req.email != null && !req.email.trim().equalsIgnoreCase(target.email)`. If so, returns `400 Bad Request` (`"Super administrator email cannot be modified"`).
   - Added validation checking if `target.id.equals(currentUser.id)` when attempting to modify `email`, `role`, or `active` status. Returns `400 Bad Request` (`"Cannot modify your own email"`, `"Cannot modify your own role"`, `"Cannot deactivate yourself"`).
2. **[ATTEMPT 1/3] Frontend Protection (`AdminUsersPage.tsx`)**:
   - In the Edit User modal, disabled the Email Address input if `selectedUser.isSuperAdmin` with badge: `"Super Administrator email is permanent and cannot be modified"`.
   - Disabled Email Address, Role selection, and Account Status toggle when `selectedUser.id === currentUser?.id` with clear visual feedback that self-administrative properties cannot be changed in this view.
3. **Automated Verification**:
   - Added `superAdminEmailCannotBeModified` and `adminCannotModifyOwnEmailOrRole` to `UserResourceTest.java`.
   - All 64 backend tests executed with `BUILD SUCCESS` (0 failures, 0 errors).
   - Frontend linting (`oxlint`) and TypeScript build (`tsc -b && vite build`) passed with 0 errors.
