# Plan 17 — Sub-Projects Dashboard Cleanup & Designate Lead Invitation Workflow

## Status: COMPLETED
- Created At: 2026-10-22T16:25:00+05:00
- Completed At: 2026-10-22T17:03:00+05:00
- Plan ID: plan_17

---

## 1. Overview & Objectives

Based on user requirements and feedback:
1. **Dashboard Clutter Removal**:
   - Sub-projects should NOT be displayed as separate cards on the main dashboard (`/`, `Projects Dashboard`).
   - Parent projects are already displayed on the dashboard with sub-project count badges (e.g., `1 sub-project`), and child sub-projects are managed inside the parent project's dedicated "Sub-projects" tab.
   - If a user only has access to a sub-project (and has no access to the parent project), that sub-project is shown on their dashboard so they can access their workspace.
2. **Designate Lead Invitation Workflow for Non-Members**:
   - When creating a sub-project and selecting a designate user who is **not currently in the project (parent project) nor in the sub-project**:
     - The user must **NOT** be directly added to `project_members`.
     - The user must **NOT** immediately become the active `leadId`.
     - Instead, this selection automatically creates and sends a **Project Invitation** to that user with a notification.
     - The sub-project creator acts as the temporary active `leadId`, and the designated user is recorded as `pendingLeadId`.
     - When the designated user accepts the invitation from their notification bell:
       - They are added to `project_members`.
       - They are promoted to the sub-project's `leadId`, and `pendingLeadId` is cleared.
     - If the invitation is declined or canceled, `pendingLeadId` is cleared and the creator remains the lead.
   - If the designate user is **already** an active member of the parent project, they can be directly designated as `leadId` since they are already part of the project team.
3. **Change Sub-project Lead by Project Creator**:
   - The project creator (or parent project lead / system admin) can change the lead of an existing sub-project from the sub-project's settings.
   - If the newly selected lead is **already a member** of the parent project, they are directly assigned as `leadId` and enrolled in `project_members`.
   - If the newly selected lead is **not a member** of the parent project:
     - An invitation to become the Sub-project Lead is sent to them.
     - `project.pendingLeadId` is updated to the new user.
     - The current lead remains in place until the new user accepts the invitation from their notification bell.

---

## 2. Technical Scope & Architecture

### 2.1 Database Schema (Flyway Migration `V9__add_pending_lead_to_projects.sql`)
1. Add column `pending_lead_id BIGINT NULL REFERENCES users(id) ON DELETE SET NULL` to `projects` table.
2. Create index:
   ```sql
   CREATE INDEX idx_projects_pending_lead_id ON projects(pending_lead_id);
   ```

---

### 2.2 Backend Architecture

1. **Entity & DTO Updates (`Project.java`, `ProjectDTO.java`)**:
   - `Project.java`: Add `@Column(name = "pending_lead_id") public Long pendingLeadId;`.
   - `ProjectDTO.java`: Add `Long pendingLeadId;` and `String pendingLeadName;`.
   - `ProjectMapper.java`: Map `pendingLeadId` and resolve `pendingLeadName`.

2. **Project Listing (`ProjectService.java` & `ProjectResource.java`)**:
   - Update `listProjects(User currentUser, boolean includeSubprojects)`:
     - By default (`includeSubprojects=false`), `GET /api/projects` excludes sub-projects when the user has access to the parent project (or is ADMIN).
     - Sub-projects are only included if `includeSubprojects=true` OR if the user is a direct member of the sub-project but does NOT have access to the parent project.
   - Update `ProjectResource.java`: Add `@QueryParam("includeSubprojects") @DefaultValue("false") boolean includeSubprojects`.

3. **Sub-Project Creation Logic (`ProjectService.java`)**:
   - When creating a sub-project (`parentProjectId != null`):
     - If `dto.leadId != null` and `!dto.leadId.equals(currentUser.id)`:
       - Check if `designatedLead` is an active member of `parentProject`:
         - If **YES** (`isMember(parent.id, designatedLead)`):
           - Set `project.leadId = designatedLead.id`.
           - Directly enroll `designatedLead` and `currentUser` into `project_members`.
         - If **NO** (`!isMember(parent.id, designatedLead)`):
           - Set `project.leadId = currentUser.id` (creator acts as active lead).
           - Set `project.pendingLeadId = designatedLead.id`.
           - Only enroll `currentUser` into `project_members`.
           - Automatically create and send an invitation via `ProjectInvitationService` with notification:
             `"@" + currentUser.username + " invited you to be the Project Lead for sub-project " + project.name`.
     - Else:
       - `project.leadId = currentUser.id;`

4. **Invitation Acceptance & Promotion (`ProjectInvitationService.java`)**:
   - In `acceptInvitation(invitationId, currentUser)`:
     - Add user to `project_members`.
     - If `project.pendingLeadId != null && project.pendingLeadId.equals(currentUser.id)`:
       - `project.leadId = currentUser.id;`
       - `project.pendingLeadId = null;`
       - `project.persist();`
   - In `declineInvitation(invitationId, currentUser)` & `cancelInvitation(projectId, invitationId, currentUser)`:
     - If `project.pendingLeadId != null && project.pendingLeadId.equals(invitation.invitedUserId)`:
       - `project.pendingLeadId = null;`
       - `project.persist();`

---

5. **Sub-Project Lead Reassignment (`UpdateProjectRequest.java` & `ProjectService.java`)**:
   - Add optional `Long leadId;` to `UpdateProjectRequest.java`.
   - In `ProjectService.updateProject`:
     - Allow changing `leadId` if caller is the sub-project creator, parent project lead, or system admin.
     - If newly selected `leadId` is an active member of the parent project:
       - Update `project.leadId = newLead.id` directly and ensure enrolled in `project_members`.
     - If newly selected `leadId` is NOT a member of the parent project:
       - Keep current `project.leadId` active.
       - Set `project.pendingLeadId = newLead.id`.
       - Create and send a Lead Invitation to the designated user via `ProjectInvitationService`.

---

### 2.3 Frontend Architecture

1. **Dashboard Cleanup (`DashboardPage.tsx`)**:
   - On the main dashboard, filter out sub-projects if the user has access to their parent project (or filter `!p.isSubproject`).
   - Cards display only main workspace projects with their sub-project counts.

2. **Sub-project Creation Modal (`CreateProjectModal.tsx`)**:
   - In the "Designate Sub-project Lead" dropdown:
     - Label members: `User Name (@username) • (Parent Member - Direct Assign)`.
     - Label non-members: `User Name (@username) • (Invite as Lead)`.
   - Add a helpful tip below dropdown:
     `"Users who are not members of the parent project will be sent an invitation and become lead upon accepting."`

3. **Sub-project Settings & Lead Management (`ProjectSettingsPage.tsx`)**:
   - For sub-projects, if the user is the project creator, parent lead, or admin:
     - Display a "Change Sub-project Lead" dropdown selector in project settings.
     - Show current active lead and pending lead invitation status (e.g., `Pending: Ali (Invited)`).

4. **Sub-project Cards & Headers (`ProjectPage.tsx`)**:
   - When a sub-project has a `pendingLeadName`, show:
     `Lead: Creator Name (Pending Lead: Ali - Invited)`.

---

## 3. Step-by-Step Implementation Steps

### Step 1: Database Migration
- Create `V9__add_pending_lead_to_projects.sql` with Flyway migration.

### Step 2: Backend Entities, DTOs & Services
- Update `Project.java`, `ProjectDTO.java`, and `UpdateProjectRequest.java` to support `pendingLeadId`, `pendingLeadName`, and lead updates.
- Update `ProjectService.java` to handle dashboard filtering, designate invite workflow, and lead re-assignment by creator.
- Update `ProjectInvitationService.java` to handle lead promotion upon invitation acceptance.
- Update `ProjectResource.java` with `@QueryParam("includeSubprojects")`.

### Step 3: API Documentation (Rule 4)
- Update `docs/endpoints.md` with `includeSubprojects` parameter, lead update field, and new response fields.

### Step 4: Backend Automated Tests (Rule 8)
- Add tests in `ProjectResourceTest.java`:
  - Verify `GET /api/projects` excludes sub-projects for admin / parent members.
  - Verify designating a non-parent member creates a pending invitation and does NOT add them directly.
  - Verify accepting the invitation promotes the user to `leadId` and enrolls them into `project_members`.
  - Verify project creator can change the lead of the sub-project directly (if member) or via invitation (if non-member).

### Step 5: Frontend Updates
- Update `DashboardPage.tsx` to display only top-level projects.
- Update `CreateProjectModal.tsx` with clear invite indicators and options.
- Update `ProjectSettingsPage.tsx` with sub-project lead change capability.
- Update `ProjectPage.tsx` to show pending lead status.

### Step 6: Build & Verification (Rule 8)
- Run `/opt/maven/bin/mvn test` to verify all backend tests pass.
- Run `npm run build` in `frontend/` to verify frontend builds without errors.

---

## 4. Acceptance Criteria
- [x] Sub-projects are NOT visible as separate cards on the main dashboard for users with parent project access.
- [x] Main dashboard displays clean parent project cards with sub-project count badges.
- [x] Designating a user who is not a member of the project does NOT immediately add them to `project_members` or make them active lead.
- [x] Designating a non-member sends an invitation with a notification to that user.
- [x] Accepting the invitation adds the user to `project_members` and promotes them to the sub-project's `leadId`.
- [x] Declining or canceling the invitation leaves the creator as lead and clears `pendingLeadId`.
- [x] Project creator can change the lead of the sub-project directly (for parent members) or via invitation (for non-members).
- [x] All tests pass (`mvn test`) and frontend builds cleanly (`npm run build`).
