# Plan 16 — Sub-Projects System (Single-Level Nesting, Inherited Access & Role Overrides, Scoped Invitations & Task Separation)

## Status: COMPLETED
- Created At: 2026-10-22T15:30:00+05:00
- Completed At: 2026-10-22T16:06:00+05:00
- Plan ID: plan_16

---

## 1. Overview & Objectives

In real-world project workflows, organizations frequently break down large projects into dedicated sub-tracks (e.g. Frontend, Mobile App, External Vendor) where:
1. **Single-Level Nesting**: A parent project can have multiple child sub-projects, but sub-projects cannot be nested further (depth limited to 1 level).
2. **Task Isolation**: Tasks created directly in a parent project belong only to the parent; each sub-project has its own separate tasks, Kanban boards, attachments, and comments.
3. **Inherited Access & Role Overrides**:
   - Members of a parent project automatically inherit `MEMBER` access to all its sub-projects.
   - The creator/lead of the parent project can create a sub-project and designate any active user as the `PROJECT LEAD` of that sub-project.
   - The sub-project lead has full administrative authority over the sub-project settings (invitations, updates, member removal).
   - Parent project leads and System Admins retain administrative authority over all child sub-projects.
4. **Scoped Invitation Workflow**:
   - Inviting a user to a parent project gives them access to the parent and all child sub-projects upon acceptance.
   - Inviting a user directly to a sub-project grants them access *only* to that specific sub-project; they cannot access the parent project or other sister sub-projects.

---

## 2. Technical Scope & Architecture

### 2.1 Database Schema (Flyway Migration `V8__add_subprojects_support.sql`)
1. **Modify `projects` Table**:
   - Add column `parent_project_id BIGINT NULL REFERENCES projects(id) ON DELETE CASCADE`.
   - Add column `lead_id BIGINT NULL REFERENCES users(id)`.
   - Data backfill: Set `lead_id = created_by` for existing projects.
   - Index:
     ```sql
     CREATE INDEX idx_projects_parent_id ON projects(parent_project_id);
     ```
   - Constraint / Validation rule:
     - A project with `parent_project_id IS NOT NULL` cannot itself be a `parent_project_id` for another project (enforces 1-level depth).

---

### 2.2 Backend Architecture

1. **Entity Updates (`Project.java`)**:
   - Add field `@ManyToOne(fetch = FetchType.LAZY) @JoinColumn(name = "parent_project_id") public Project parentProject;`.
   - Add field `@ManyToOne(fetch = FetchType.LAZY) @JoinColumn(name = "lead_id") public User lead;`.

2. **DTOs**:
   - `CreateProjectRequest`: Add optional `Long parentProjectId`, optional `Long leadId`.
   - `ProjectDTO`: Add `parentProjectId`, `parentProjectName`, `parentProjectKey`, `lead` (`UserDTO`), `isSubproject` (`boolean`), `subprojectCount` (`int`).
   - `ProjectMemberDTO`: Add `inherited` (`boolean`), indicating whether membership is direct or inherited from the parent project.

3. **Service Logic (`ProjectService.java`)**:
   - **Creation Validation**:
     - If `parentProjectId` is specified:
       - Validate parent project exists and is not archived.
       - Validate that parent project does NOT have a parent itself (`parent.parentProject == null`), enforcing strict 1-level depth.
       - Verify caller has Lead authority on the parent project or is System Admin.
       - Assign designated `leadId` (or default to caller/parent creator).
       - Enroll designated lead and creator in sub-project's `project_members`.
   - **Access / Membership (`isMember`)**:
     - User has access to project `P` if:
       - User is System Admin.
       - User is lead/creator of `P`.
       - User is enrolled directly in `project_members` for `P`.
       - `P` is a sub-project AND user is lead/creator/member of `P.parentProject`.
   - **Lead / Admin Authority (`isLeadOrAdmin`)**:
     - User has Lead authority on `P` if:
       - User is System Admin.
       - User is the designated `lead` or `createdBy` of `P`.
       - `P` is a sub-project AND user is the lead/creator of `P.parentProject`.
   - **Project Listing (`listProjects`)**:
     - Return parent projects and sub-projects accessible to the user.
     - For non-parent members who only have sub-project access, return the sub-project with its parent metadata.
   - **Sub-projects Listing Endpoint**:
     - `GET /api/projects/{id}/subprojects`: List active sub-projects for a parent project.

4. **Invitations & Notifications Integration (`ProjectInvitationService.java`)**:
   - Calling `/api/projects/{projectId}/invitations` checks `isLeadOrAdmin(projectId, currentUser)`.
   - When an invite for a sub-project is accepted:
     - User is enrolled into `project_members` for that sub-project only.
     - User receives instant WebSocket notification and can access that sub-project immediately.

---

### 2.3 Frontend Architecture

1. **API Client & Types (`frontend/src/api/projects.ts` & `frontend/src/types/project.ts`)**:
   - Add `parentProjectId`, `parentProjectName`, `parentProjectKey`, `leadId`, `subprojectCount` to types.
   - Add `getSubprojects(parentId)` API call.

2. **Dashboard (`ProjectsPage.tsx`)**:
   - Hierarchical display: Top-level parent projects displayed as cards with a badge showing child sub-projects count (e.g. `3 Sub-projects`).
   - Expandable/collapsible drawer or list of sub-projects directly within parent card.
   - Standalone sub-projects displayed clearly for users who are only members of the child project (with a "Sub-project of [Parent Key]" indicator).

3. **Project Header & Breadcrumbs (`ProjectLayout.tsx` / `Navbar.tsx`)**:
   - Display breadcrumbs: `Projects / [Parent Key & Name] / [Sub-project Key & Name]`.
   - Link to parent project if user has access.

4. **Parent Project View ("Sub-projects" Tab / Section)**:
   - Dedicated "Sub-projects" tab alongside Kanban/List views.
   - Lists all child projects with key, name, lead, task count, and active members.
   - "New Sub-project" modal: Allows parent leads to create a child project and assign a sub-project lead.

5. **Project Settings ("Members" UI)**:
   - In sub-projects, members list shows two distinct groups:
     1. **Direct Members**: Enrolled directly in the sub-project (can be removed by sub-project lead).
     2. **Inherited Members**: Automatically inherited from the parent project (labeled with "Inherited from Parent" badge).

---

## 3. Step-by-Step Implementation Steps

### Step 1: Database Migration
- Create `V8__add_subprojects_support.sql` adding `parent_project_id` and `lead_id` to `projects` table with proper foreign keys and index.

### Step 2: Backend Entities, DTOs & Services
- Update `Project.java` entity with `parentProject` and `lead` relations.
- Update `ProjectDTO`, `CreateProjectRequest`, and `ProjectMapper`.
- Update `ProjectService` with nesting depth enforcement, inherited membership resolution, and sub-project query methods.
- Update `ProjectResource` to support sub-project creation and listing (`GET /api/projects/{id}/subprojects`).

### Step 3: Backend Automated Tests (Rule 8)
- Add unit and integration tests in `ProjectResourceTest.java`:
  - Test creating sub-project under parent.
  - Test rejection of nesting beyond 1 level (creating sub-project under a sub-project returns 400).
  - Test parent member can access sub-project tasks.
  - Test sub-project member CANNOT access parent project tasks.
  - Test sub-project lead can invite members to sub-project.
  - Test parent lead can manage sub-project.

### Step 4: Documentation (Rule 4)
- Document all updated and new endpoints in `docs/endpoints.md`.

### Step 5: Frontend Integration & UI
- Update project types and API methods.
- Update `ProjectsPage.tsx` with nested sub-project organization.
- Add "Sub-projects" tab and "Create Sub-project" modal in project view.
- Update `ProjectSettingsPage.tsx` to display inherited vs direct members.
- Add breadcrumbs navigation.

### Step 6: Build & Verification (Rule 8)
- Run `mvn test` to verify backend tests pass.
- Run `npm run lint && npm run build` to verify frontend compilation.

---

## 4. Acceptance Criteria
- [x] Projects support an optional `parent_project_id`, restricted to exactly 1 level of nesting.
- [x] Attempting to create a sub-project under an existing sub-project is rejected with an error.
- [x] Tasks, boards, and comments remain isolated to their specific project/sub-project.
- [x] Users in a parent project automatically inherit member access to all child sub-projects.
- [x] Sub-project creator can assign a dedicated Sub-Project Lead who has authority over that sub-project's settings.
- [x] Users invited directly to a sub-project only gain access to that sub-project.
- [x] Sub-project settings cleanly display direct members and inherited members.
- [x] All backend tests (`mvn test`) and frontend builds (`npm run build`) pass cleanly.
