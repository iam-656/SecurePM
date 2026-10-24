# Error 08 — Sub-project In-Subproject UI Glitch & Sub-project Dashboard Visibility

## Error ID
`error_08`

## Date Encountered
2026-10-22

## Error Description
The user reported two interrelated issues:
1. **Sub-project Creation View Glitch inside Sub-projects**:
   When navigating inside a sub-project (e.g., from the parent project's "Sub-projects" tab), the page briefly displays "Sub-projects (0)" and "Create Sub-project" (as if a sub-project could contain nested sub-projects). However, immediately after a manual page reload, it renders correctly (showing the Kanban board).
2. **Sub-projects Missing from Dashboard for Direct Leads/Members**:
   A user who is a designated lead and direct member of two sub-projects (and not an active member of the parent project) sees 0 projects on their main dashboard (`/`).
   Additionally, in the background terminal (via Vite client console logging), an error appeared:
   ```
   [vite] (client) [console.error] Failed to accept invitation: Error: Invitation is no longer pending (status: ACCEPTED)
   ```

---

## Root Cause Analysis

### 1. View Mode State Retention across Project Navigations (`ProjectPage.tsx`)
- When a user views a parent project and switches to the "Sub-projects" tab, `viewMode` in `useTaskView` is set to `'subprojects'`.
- Clicking on a sub-project card executes `navigate('/projects/' + sub.id)`. Because React Router reuses the mounted `ProjectPage` component (only route param `id` changes), local state `viewMode` persists as `'subprojects'`.
- While `ProjectPage.tsx` correctly hid the "Sub-projects" tab button from the toggle bar when `project.isSubproject` was true, the content area still checked `{viewMode === 'subprojects' ? ... : ...}`. Thus, it rendered the empty sub-projects view container for the child project until a full browser reload re-initialized `useTaskView` to `'kanban'`.

### 2. Sub-project Exclusion on Dashboard (`DashboardPage.tsx` & `ProjectService.java`)
- **Frontend Overzealous Filter**: In `DashboardPage.tsx`, `filteredProjects` unconditionally executed `projects.filter(p => !p.isSubproject)`. This stripped all sub-projects from the UI even when the user only had access to those sub-projects and no access to the parent project.
- **Backend SQL 3-Valued Logic Bug in `ProjectService.java`**:
  In `listProjects(User currentUser, boolean includeSubprojects)`:
  ```sql
  LEFT JOIN project_members parent_pm ON parent_pm.project_id = parent.id AND parent_pm.user_id = ?1
  ...
  AND (parent.id IS NULL OR NOT (parent.created_by = ?1 OR parent.lead_id = ?1 OR parent_pm.user_id = ?1))
  ```
  When user `?1` is NOT a member of the parent project, `parent_pm` produces a NULL row. In SQL, `parent_pm.user_id = ?1` evaluates to `NULL`.
  `FALSE OR FALSE OR NULL` evaluates to `NULL`, and `NOT (NULL)` evaluates to `NULL`.
  In a PostgreSQL WHERE clause, `NULL` evaluates as false, causing the database to exclude sub-projects when the user was not a member of the parent project.

### 3. Invitation Acceptance Status in Notifications (`NotificationBell.tsx` & `ProjectInvitationService.java`)
- When accepting an invitation via the notification bell, `ProjectInvitationService` marked the invitation `ACCEPTED` and set notification `isRead = true`, but did not update `notification.dataJson` with `"status": "ACCEPTED"`.
- On subsequent page reloads or fetches, `NotificationBell.tsx` only had `actionSuccess` in memory. If not present in memory, it rendered the "Accept" and "Decline" buttons again.
- Clicking "Accept" again triggered `acceptInvitation`, which threw HTTP 400 `Invitation is no longer pending (status: ACCEPTED)` because `ProjectInvitationService` was not idempotent.

---

## Status
- Documented: 2026-10-22T17:30:00+05:00
- Resolution: RESOLVED
- Completed At: 2026-10-22T17:36:00+05:00

---

## Resolution & Changes Made

### 1. [ATTEMPT 1/3] View Mode Reset and Guard in `ProjectPage.tsx`
- Added `useEffect(() => { setViewMode('kanban'); }, [projectId]);` to immediately reset view mode whenever the route transitions between projects.
- Added a guard `useEffect(() => { if (project?.isSubproject && viewMode === 'subprojects') setViewMode('kanban'); }, [project?.isSubproject, viewMode]);` and updated the conditional render to `{viewMode === 'subprojects' && !project.isSubproject ? (...) : ...}`. This prevents sub-projects from ever displaying the "Sub-projects" child creation panel.

### 2. [ATTEMPT 1/3] SQL 3-Valued Logic Fix in `ProjectService.java`
- Replaced the brittle `LEFT JOIN project_members parent_pm ... AND NOT (parent.created_by = ?1 OR parent.lead_id = ?1 OR parent_pm.user_id = ?1)` query with deterministic logic using `IS DISTINCT FROM` and `NOT EXISTS`:
  ```sql
  AND (parent.id IS NULL OR (
    (parent.created_by IS DISTINCT FROM ?1)
    AND (parent.lead_id IS DISTINCT FROM ?1)
    AND NOT EXISTS (
      SELECT 1 FROM project_members parent_pm WHERE parent_pm.project_id = parent.id AND parent_pm.user_id = ?1
    )
  ))
  ```
- This ensures sub-projects are properly selected and returned on `GET /api/projects` for users who are members/leads of the sub-project without parent access.

### 3. [ATTEMPT 1/3] Main Dashboard Filtering in `DashboardPage.tsx`
- Removed the blanket `projects.filter(p => !p.isSubproject)` in `DashboardPage.tsx`.
- Because the backend `GET /api/projects` endpoint already excludes sub-projects of accessible parents (avoiding clutter), passing the returned list directly enables users who are only members of sub-projects to view their sub-project cards with the `Sub of {parentProjectKey}` badge.

### 4. [ATTEMPT 1/3] Idempotent Invitation Acceptance & Persistent Status
- In `ProjectInvitationService.java`, made `acceptInvitation` and `declineInvitation` idempotent: if already in `ACCEPTED` or `DECLINED` state, it returns the DTO without throwing an `IllegalStateException`.
- Added `markInvitationNotificationStatus` to persist `"status": "ACCEPTED"` / `"DECLINED"` in `notification.dataJson`.
- In `NotificationBell.tsx`, evaluated `effectiveStatus = statusOverride || n.data?.status` to render the persistent "Joined Project" or "Declined" badges even across page reloads.
- In `useNotifications.ts`, handled already-accepted states gracefully.

### 5. Verification
- Backend automated tests in `ProjectResourceTest.java` (including sub-project dashboard visibility for non-parent users and repeated acceptance idempotency): 13/13 passed.
- Frontend build: `npm run build` completed cleanly with exit code 0.
