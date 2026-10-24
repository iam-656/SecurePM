# Plan 19 — Project & Sub-project Completion Milestone, Freezing & Attribution

## Status: COMPLETED
- Created At: 2026-10-22T20:25:00+05:00
- Completed At: 2026-10-22T21:02:00+05:00
- Plan ID: plan_19

---

## 1. Overview & Objectives

Based on the prompt in `docs/prompt.md` and user clarifications:
1. **Creator Attribution**:
   - Add a bottom line *"Created by {fullName}"* (or username) across all project cards (main dashboard and sub-project lists) and in the project header.
2. **Sub-project Completion**:
   - The **sub-project lead**, **main project creator**, or **system admin** can mark a sub-project as **completed**.
   - **Quality Gate**: Before marking a sub-project as completed, **all tasks** in that sub-project must be in the `DONE` state. If any task is in `TODO`, `IN_PROGRESS`, `REVIEW`, or any non-`DONE` state, completion is rejected with an explanatory error.
   - **Reversal Authority**: Once marked as completed, **only the main project creator** (or system admin) can revert (reopen) the sub-project. The sub-project lead **cannot** revert it once completed.
   - **Notification**: When marked as completed by the lead (or creator), a notification is dispatched to all members of the sub-project (direct + inherited).
3. **Main Project Completion**:
   - **Only the main project creator** (or system admin) can mark the main project as completed.
   - **Quality Gate**:
     - All direct tasks in the main project must be in the `DONE` state.
     - **AND** all child sub-projects under the main project must already be marked as `completed == true`. If any sub-project is not completed yet, the main project cannot be completed.
   - **Reversal Authority**: Only the main project creator (or system admin) can revert/reopen the main project.
   - **Notification**: When the main project is marked as completed, a notification is dispatched to all members of the main project and all members of all its sub-projects.
4. **Read-Only / View-Only Mode for Completed Projects**:
   - Once a project (or sub-project) is marked as completed, it converts into a view-only snapshot:
     - **Task Mutations**: Creating, editing, status moving, or deleting tasks is completely blocked.
     - **Comments**: Creating, editing, or deleting comments is blocked (freezes new comments).
     - **Attachments**: Uploading and deleting attachments is blocked. **Downloading existing attachments is permitted**.
     - **Invitations**: Inviting new members or modifying project members/leads is blocked while completed.
     - **Sub-project Creation**: Creating new child sub-projects under a completed parent is blocked.
   - The UI displays a prominent banner indicating the project is completed/locked with date and author, hides/disables mutation buttons ("New Task", drag-and-drop, edit forms), while allowing view/browse and file downloads.

---

## 2. Technical Scope & Architecture

### 2.1 Database Schema (Flyway Migration `V10__add_project_completion_fields.sql`)
1. Add columns to `projects` table:
   ```sql
   ALTER TABLE projects ADD COLUMN completed BOOLEAN NOT NULL DEFAULT false;
   ALTER TABLE projects ADD COLUMN completed_at TIMESTAMP WITH TIME ZONE NULL;
   ALTER TABLE projects ADD COLUMN completed_by BIGINT NULL REFERENCES users(id) ON DELETE SET NULL;
   CREATE INDEX idx_projects_completed ON projects(completed);
   ```

---

### 2.2 Backend Architecture

1. **Entity & DTO Updates (`Project.java`, `ProjectDTO.java`, `ProjectMapper.java`)**:
   - `Project.java`:
     ```java
     @Column(nullable = false)
     public boolean completed = false;

     @Column(name = "completed_at")
     public LocalDateTime completedAt;

     @Column(name = "completed_by")
     public Long completedBy;
     ```
   - `ProjectDTO.java`: Add `boolean completed;`, `LocalDateTime completedAt;`, `Long completedBy;`, `String completedByName;`.
   - `ProjectMapper.java`: Map `completed`, `completedAt`, `completedBy`, and resolve `completedByName`.

2. **Project Completion Endpoints (`ProjectResource.java` & `ProjectService.java`)**:
   - `POST /api/projects/{id}/complete`:
     - **Authority Validation**:
       - If `project.isSubproject`: caller must be sub-project lead (`project.leadId`), main project creator (`parentProject.createdBy`), or `ADMIN`.
       - If root project: caller must be project creator (`project.createdBy`) or `ADMIN`.
     - **Quality Gate Validation**:
       - Query non-`DONE` tasks: `SELECT count(t) FROM Task t WHERE t.projectId = ?1 AND t.status != TaskStatus.DONE`. If count > 0, throw `IllegalStateException("Cannot complete project: " + count + " task(s) are not completed")`.
       - If root project: query non-completed subprojects: `SELECT count(p) FROM Project p WHERE p.parentProjectId = ?1 AND p.archived = false AND p.completed = false`. If count > 0, throw `IllegalStateException("Cannot complete project: " + count + " sub-project(s) are not completed yet")`.
     - **State Update**:
       - `project.completed = true;`
       - `project.completedAt = LocalDateTime.now();`
       - `project.completedBy = currentUser.id;`
       - `project.persist();`
     - **Notifications**:
       - Sub-project: Notify all members of the subproject: `"Sub-project \"" + project.name + "\" has been marked as completed by @" + currentUser.username`.
       - Main project: Notify all members of the main project + all members of all child subprojects: `"Project \"" + project.name + "\" has been marked as completed by @" + currentUser.username`.
     - Return updated `ProjectDTO`.
   - `POST /api/projects/{id}/reopen` (or `/revert`):
     - **Authority Validation**:
       - If subproject: caller MUST be `parentProject.createdBy` or `ADMIN`. (Sub-project lead is explicitly disallowed).
       - If root project: caller MUST be `project.createdBy` or `ADMIN`.
     - **State Update**:
       - `project.completed = false;`
       - `project.completedAt = null;`
       - `project.completedBy = null;`
       - `project.persist();`
     - Return updated `ProjectDTO`.

3. **Read-Only / Mutation Guard Enforcement**:
   - `TaskService.java`:
     - In `createTask`, `updateTask`, `deleteTask`, and `moveTask`:
       ```java
       Project project = Project.findById(projectId);
       if (project != null && project.completed) {
           throw new IllegalStateException("Project is marked as completed and is in view-only mode");
       }
       ```
   - `CommentService.java`:
     - In `createComment`, `updateComment`, `deleteComment`:
       ```java
       Project project = Project.findById(task.projectId);
       if (project != null && project.completed) {
           throw new IllegalStateException("Project is marked as completed. Comments cannot be modified.");
       }
       ```
   - `AttachmentService.java`:
     - In `uploadAttachment`, `deleteAttachment`:
       ```java
       Project project = Project.findById(task.projectId);
       if (project != null && project.completed) {
           throw new IllegalStateException("Project is marked as completed. Attachments cannot be modified.");
       }
       ```
     - In `downloadAttachment`: **ALLOWED** (read-only access).
   - `ProjectInvitationService.java`:
     - In `createInvitation`: if `project.completed`, reject with `"Cannot invite members to a completed project"`.
   - `ProjectService.java`:
     - In `createProject`: if `parentProjectId != null` and `parent.completed`, reject with `"Cannot create sub-project under a completed project"`.
     - In `updateProject` & `archiveProject`: if `project.completed`, reject modifications.

---

### 2.3 Frontend Architecture

1. **Attribution Display**:
   - `DashboardPage.tsx`: In the bottom bar of each project card:
     Display `Created by {project.createdByName || 'Unknown'} • {formatDate(project.createdAt)}`.
   - `ProjectPage.tsx`:
     - In header / members bar: `Created by {project.createdByName || 'Unknown'}`.
     - In sub-project cards inside parent: `Created by {sub.createdByName}`.
2. **Completed Project Visual Mode & Badges**:
   - Add status chip in `DashboardPage.tsx` and `ProjectPage.tsx`:
     - If `project.completed`: `<span className="badge badge-emerald">✓ Completed</span>`.
   - On `ProjectPage.tsx`:
     - Prominent Banner at top:
       *"✓ This project was marked as completed by {completedByName} on {formatDate(completedAt)}. It is in view-only snapshot mode."*
     - If user is main project creator or admin: render **"Reopen Project"** button in banner / settings.
     - If project is not completed:
       - Sub-project: Render **"Mark as Completed"** button for sub-project lead, main creator, or admin.
       - Main project: Render **"Mark as Completed"** button for main creator or admin.
3. **Locking Down Interactive Controls when Completed**:
   - Hide "New Task" and "Create Sub-project" buttons.
   - In `KanbanBoard.tsx`: Disable drag-and-drop (`isDragDisabled={project.completed}`), hide "+ Add task" shortcuts on columns.
   - In `TaskDetailModal.tsx`: Hide "Edit Task", hide comment input box, hide attachment file upload zone and attachment delete button. Keep file download button active.
   - In `ProjectSettingsPage.tsx`: Show completion status card with "Mark Completed" / "Reopen Project" button. Disable member invitations, lead changes, or archiving while completed.

---

## 3. Step-by-Step Implementation Steps

### Step 1: Database Migration
- Create `V10__add_project_completion_fields.sql`.

### Step 2: Backend Entities, DTOs & Services
- Update `Project.java`, `ProjectDTO.java`, `ProjectMapper.java`.
- Update `ProjectService.java` with `completeProject` and `reopenProject` methods, task completion counts, and subproject checks.
- Add endpoints `POST /api/projects/{id}/complete` and `POST /api/projects/{id}/reopen` in `ProjectResource.java`.
- Update `TaskService.java`, `CommentService.java`, `AttachmentService.java`, and `ProjectInvitationService.java` to enforce read-only completion guards.
- Implement member notification dispatch in `ProjectService.java` using `NotificationService`.

### Step 3: API Documentation (Rule 4)
- Update `docs/endpoints.md` documenting `/complete`, `/reopen`, and completion rejection error rules.

### Step 4: Backend Automated Tests (Rule 8)
- In `ProjectResourceTest.java`:
  - Test completing a sub-project with uncompleted tasks (fails with 400).
  - Test completing sub-project when all tasks are `DONE` (succeeds).
  - Test sub-project lead cannot reopen sub-project (fails with 403).
  - Test main project creator can reopen sub-project (succeeds).
  - Test completing main project when sub-projects are not completed (fails with 400).
  - Test completing main project when all sub-projects and tasks are `DONE` (succeeds).
  - Test task creation, task edit, comment add, and attachment upload are blocked in completed project.
  - Test attachment download remains accessible in completed project.
  - Test notification generation for project completion.

### Step 5: Frontend Updates
- Update `project.ts` types with `completed`, `completedAt`, `completedBy`, `completedByName`.
- Update `projects.ts` API with `completeProject(id)` and `reopenProject(id)`.
- Update `DashboardPage.tsx` with "Created by xyz" attribution line and `Completed` badge.
- Update `ProjectPage.tsx` with attribution line, completed banner, read-only control disables, and "Mark as Completed" / "Reopen Project" modal/button.
- Update `KanbanBoard.tsx`, `TaskDetailModal.tsx`, and `ProjectSettingsPage.tsx` to respect read-only completed state.

### Step 6: Verification (Rule 8)
- Run `/opt/maven/bin/mvn test` to verify all backend tests pass.
- Run `npm run build` in `frontend/` to verify frontend builds cleanly.

---

## 4. Acceptance Criteria
- [x] Every project card on the dashboard and sub-project list displays a bottom line "Created by {fullName}".
- [x] Project page header displays "Created by {fullName}".
- [x] Sub-project lead or main creator can mark a sub-project as completed only when all its tasks are in `DONE` status.
- [x] Attempting to mark a sub-project completed with unfinished tasks is rejected with a clear error message.
- [x] Sub-project lead CANNOT revert/reopen a completed sub-project. Only the main project creator (or admin) can revert it.
- [x] Main project creator can mark the main project as completed only when all its direct tasks are `DONE` AND all its sub-projects are completed.
- [x] Only the main project creator (or admin) can revert/reopen a completed main project.
- [x] Completed projects and sub-projects are strictly view-only: no task creation/update/deletion, no comments, no attachment uploads/deletions, no member invitations.
- [x] Attachment download continues to function in completed projects.
- [x] Members receive notifications upon project and sub-project completion.
- [x] All automated tests pass (`mvn test`) and frontend builds without errors (`npm run build`).
