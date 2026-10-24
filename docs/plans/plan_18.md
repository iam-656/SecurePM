# Plan 18 — Fix Sub-project View Retention, Dashboard Visibility, and Invitation Idempotency

## Status: COMPLETED
- Created At: 2026-10-22T17:31:00+05:00
- Completed At: 2026-10-22T17:36:00+05:00
- Plan ID: plan_18

---

## 1. Overview & Objectives

Address the two bugs reported by the user:
1. **Sub-project Creation View Glitch inside Sub-projects**:
   - Ensure `viewMode` resets to `'kanban'` whenever navigating between projects (`projectId` change).
   - Guard `ProjectPage.tsx` so that if `project.isSubproject` is true, it strictly never renders the "Sub-projects" view mode, falling back to `'kanban'`.
2. **Sub-project Dashboard Visibility for Direct Leads/Members**:
   - Fix the SQL 3-valued NULL logic in `ProjectService.java` where `NOT (parent.created_by = ?1 OR parent.lead_id = ?1 OR parent_pm.user_id = ?1)` evaluated to NULL when `parent_pm` was empty, improperly excluding sub-projects from `/api/projects`.
   - Remove the blanket `p => !p.isSubproject` filter in `DashboardPage.tsx`, allowing sub-projects returned by the backend (for users with no parent access) to display with their `Sub of {parentKey}` badges.
3. **Invitation Acceptance Idempotency & Notification Status Persistence**:
   - Make `acceptInvitation` in `ProjectInvitationService.java` idempotent: if the recipient calls accept on an already accepted invitation, return the current `ProjectInvitationDTO` cleanly instead of throwing a 400 error.
   - Update `notification.dataJson` with `"status": "ACCEPTED"` / `"DECLINED"` in `ProjectInvitationService.java` when invitations are accepted or declined.
   - In `NotificationBell.tsx`, check `n.data?.status` to render `Joined Project` or `Declined` even after a page reload.

---

## 2. Technical Scope & Architecture

### 2.1 Backend Changes

1. **`ProjectService.java`**:
   - In `listProjects(User currentUser, boolean includeSubprojects)`:
     Replace:
     ```sql
     AND (parent.id IS NULL OR NOT (parent.created_by = ?1 OR parent.lead_id = ?1 OR parent_pm.user_id = ?1))
     ```
     With deterministic SQL:
     ```sql
     AND (
       parent.id IS NULL OR (
         (parent.created_by IS DISTINCT FROM ?1)
         AND (parent.lead_id IS DISTINCT FROM ?1)
         AND NOT EXISTS (
           SELECT 1 FROM project_members ppm 
           WHERE ppm.project_id = parent.id AND ppm.user_id = ?1
         )
       )
     )
     ```
     This guarantees that if the user is NOT a member/lead/creator of the parent project, the sub-project is returned.

2. **`ProjectInvitationService.java`**:
   - In `acceptInvitation(invitationId, currentUser)`:
     - If `invitation.status == InvitationStatus.ACCEPTED`: return `ProjectInvitationMapper.toDTO(invitation)` idempotently.
   - In `markInvitationNotificationRead(userId, invitationId, status)`:
     - Update the notification's `dataJson` with the resolved status (`"status":"ACCEPTED"` or `"status":"DECLINED"`).
     - Persist notification.

---

### 2.2 Frontend Changes

1. **`ProjectPage.tsx`**:
   - Add `useEffect(() => { setViewMode('kanban'); }, [projectId]);`.
   - In the render block:
     ```tsx
     {viewMode === 'subprojects' && !project.isSubproject ? (
        // Sub-projects view
     ) : viewMode === 'kanban' || (viewMode === 'subprojects' && project.isSubproject) ? (
        // Kanban view
     ) : (
        // List view
     )}
     ```
   - Automatically resets `viewMode` to `'kanban'` if `project.isSubproject` is loaded.

2. **`DashboardPage.tsx`**:
   - Simplify `filteredProjects`:
     ```tsx
     const filteredProjects = useMemo(() => {
       const q = searchQuery.toLowerCase().trim();
       if (!q) return projects;
       return projects.filter(
         (p) =>
           p.name.toLowerCase().includes(q) ||
           p.projectKey.toLowerCase().includes(q) ||
           (p.description && p.description.toLowerCase().includes(q))
       );
     }, [projects, searchQuery]);
     ```
   - Sub-project cards already have the badge:
     `Sub of {project.parentProjectKey || 'Parent'}`.

3. **`NotificationBell.tsx`**:
   - Check `n.data?.status === 'ACCEPTED' || statusOverride === 'ACCEPTED'` to show `Joined Project`.
   - Check `n.data?.status === 'DECLINED' || statusOverride === 'DECLINED'` to show `Declined`.
   - Only show Accept/Decline action buttons when `isInvite && !statusOverride && n.data?.status !== 'ACCEPTED' && n.data?.status !== 'DECLINED'`.

---

## 3. Step-by-Step Implementation Steps

### Step 1: Backend Fixes
- Update `ProjectService.java` query.
- Update `ProjectInvitationService.java` idempotency and notification data status.

### Step 2: Frontend Fixes
- Update `ProjectPage.tsx` viewMode reset and subproject guards.
- Update `DashboardPage.tsx` project list filter.
- Update `NotificationBell.tsx` invite action rendering.

### Step 3: Automated Testing (Rule 8)
- Update `ProjectResourceTest.java` to test:
  - User who is a sub-project member/lead but not in parent project receives sub-projects on `/api/projects`.
- Update `ProjectInvitationResourceTest.java` to test:
  - Idempotent invitation acceptance.
- Run `/opt/maven/bin/mvn test`.
- Run `npm run build` in `frontend/`.

### Step 4: Documentation & Error Updating
- Update `docs/errors/error_08.md` with resolution details.
- Mark `docs/plans/plan_18.md` as completed.

---

## 4. Acceptance Criteria
- [x] Navigating into a sub-project from the parent project's sub-project list immediately displays the sub-project's Kanban board, never the "Create Sub-project" placeholder.
- [x] Reloading inside a sub-project continues to show the Kanban board.
- [x] A user who is lead or member of a sub-project (and not in parent project) sees their sub-project on the main dashboard (`/`).
- [x] Sub-projects are displayed with `Sub of {parentKey}` badge on the dashboard.
- [x] Repeatedly accepting an invitation does not produce 400 errors in console or terminal.
- [x] Notification dropdown accurately displays "Joined Project" or "Declined" even after page reloads.
- [x] Full backend tests pass (`mvn test`) and frontend builds cleanly (`npm run build`).
