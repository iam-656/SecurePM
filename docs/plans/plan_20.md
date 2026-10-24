# Plan 20 — Project & Sub-Project Library with Direct Upload, Forwarding & Filtering

## Status: COMPLETED
- Created At: 2026-10-23T19:25:00+05:00
- Completed At: 2026-10-23T21:21:00+05:00
- Plan ID: plan_20

---

## 1. Overview & Objectives

Based on [docs/prompt.md](file:///run/media/iamblitz/CODES/SecurePM/docs/prompt.md) (Prompt 2) and user decisions:
1. **Dedicated Library Tab**:
   - Every Main Project and Sub-Project contains an isolated **Library** module that stores and presents all attachments uploaded within its specific workspace.
2. **Hierarchy Isolation**:
   - A Main Project’s library displays **only direct Main Project attachments** (from direct tasks or direct library uploads).
   - Sub-project attachments do **not** automatically populate or pollute the parent project's library view.
   - A Sub-project’s library displays **only that Sub-project’s attachments**.
3. **Direct Library Uploads + Task Sync**:
   - Users can upload files directly into the Library tab (project-level attachments without requiring a task).
   - Files uploaded to tasks inside the project automatically appear in that project's Library.
4. **Access & Permissions**:
   - Members of a Main Project automatically inherit read, browse, and download access to all associated Sub-Projects and their respective libraries (using `ProjectService.isMember`).
5. **Attachment Forwarding Workflow**:
   - Every attachment across all libraries includes a **"Forward"** action button.
   - **Authority Restriction**: Forwarding is strictly restricted to **Project Leads and Admins** (`projectService.isLeadOrAdmin`).
   - **Forwarding Modal**: Clicking "Forward" opens a destination selector modal dialog displaying target projects with checkboxes (Main Project and active Sub-Projects in the hierarchy).
   - **Multi-Select Execution**: Confirming the forward duplicates the attachment record into selected targets' libraries without duplicating physical disk bytes (shared storage path).
6. **Provenance & Attribution Tracking**:
   - Forwarded files in the destination library display clear attribution metadata:
     `"Forwarded by [User Name] from [Source Project] • [Timestamp]"`.
7. **Comprehensive Filter & Search**:
   - Search by file name.
   - Type filter: `All`, `Documents` (PDF, DOC, DOCX, TXT), `Images` (PNG, JPG, SVG, WebP, GIF), `Archives` (ZIP, TAR, GZ), `Other`.
   - Source filter: `All`, `Direct Library Uploads`, `Task Attachments`, `Forwarded Files`.
   - Sorting: Date (Newest / Oldest), Name (A-Z / Z-A), File Size (Largest / Smallest).
8. **Completed Project View-Only Enforcement**:
   - If a project is completed (`project.completed == true`), uploading new library files or forwarding into/from it is blocked. Downloading remains enabled.

---

## 2. Technical Scope & Architecture

### 2.1 Database Schema (Flyway Migration `V11__project_library_and_forwarding.sql`)

1. Update `attachments` table:
   - Add column `project_id BIGINT REFERENCES projects(id) ON DELETE CASCADE`.
   - Populate `project_id` for existing records:
     ```sql
     UPDATE attachments a SET project_id = t.project_id FROM tasks t WHERE a.task_id = t.id AND a.project_id IS NULL;
     ```
   - Alter `task_id` to allow `NULL` (for direct library uploads and forwarded files):
     ```sql
     ALTER TABLE attachments ALTER COLUMN task_id DROP NOT NULL;
     ALTER TABLE attachments ALTER COLUMN project_id SET NOT NULL;
     ```
   - Add provenance columns:
     ```sql
     ALTER TABLE attachments ADD COLUMN uploaded_by BIGINT REFERENCES users(id) ON DELETE SET NULL;
     ALTER TABLE attachments ADD COLUMN forwarded_by BIGINT REFERENCES users(id) ON DELETE SET NULL;
     ALTER TABLE attachments ADD COLUMN forwarded_at TIMESTAMP WITH TIME ZONE NULL;
     ALTER TABLE attachments ADD COLUMN source_project_id BIGINT REFERENCES projects(id) ON DELETE SET NULL;
     ALTER TABLE attachments ADD COLUMN source_attachment_id BIGINT REFERENCES attachments(id) ON DELETE SET NULL;
     ```
   - Add performance indexes:
     ```sql
     CREATE INDEX idx_attachments_project_id ON attachments(project_id);
     CREATE INDEX idx_attachments_forwarded_by ON attachments(forwarded_by);
     ```

---

### 2.2 Backend Architecture

1. **Entity & DTO Updates (`Attachment.java`, `AttachmentDTO.java`)**:
   - `Attachment.java`:
     - `@Column(name = "project_id", nullable = false) public Long projectId;`
     - `@Column(name = "task_id") public Long taskId;` (nullable)
     - `@Column(name = "uploaded_by") public Long uploadedBy;`
     - `@Column(name = "forwarded_by") public Long forwardedBy;`
     - `@Column(name = "forwarded_at") public LocalDateTime forwardedAt;`
     - `@Column(name = "source_project_id") public Long sourceProjectId;`
     - `@Column(name = "source_attachment_id") public Long sourceAttachmentId;`
   - `AttachmentDTO.java`:
     - Add `projectId`, `taskTitle`, `uploadedBy`, `uploadedByName`, `forwardedBy`, `forwardedByName`, `forwardedAt`, `sourceProjectId`, `sourceProjectName`, `isForwarded`.

2. **Service Layer (`AttachmentService.java`)**:
   - Inject `ProjectService` for centralized `isMember` and `isLeadOrAdmin` checks.
   - `listProjectLibrary(Long projectId, String search, String fileType, String source, String sortBy, User currentUser)`:
     - Check user is member of project (inherits parent access for subprojects).
     - Query attachments where `project_id = :projectId` (strictly isolated; excludes subproject files).
     - Apply search filter, file type filter, source filter, and ordering.
     - Return enriched `List<AttachmentDTO>`.
   - `uploadLibraryAttachment(Long projectId, String originalName, File file, User currentUser)`:
     - Check user is member of project.
     - Reject if project is completed (400 Bad Request).
     - Store file under `{storageBase}/{projectId}/library/{uniqueFilename}`.
     - Persist `Attachment` with `taskId = null`, `uploadedBy = currentUser.id`.
     - Broadcast WebSocket `LIBRARY_ATTACHMENT_CREATED`.
   - `getForwardTargets(Long projectId, Long attachmentId, User currentUser)`:
     - Check `isLeadOrAdmin(projectId, currentUser)`.
     - If subproject: return parent Main Project + sibling subprojects.
     - If main project: return all child subprojects.
     - Return list of destination project DTOs with `alreadyForwarded` boolean flag.
   - `forwardAttachment(Long sourceProjectId, Long attachmentId, List<Long> targetProjectIds, User currentUser)`:
     - Check `isLeadOrAdmin(sourceProjectId, currentUser)`.
     - Reject if source project is completed.
     - For each target project:
       - Verify target project exists and is not archived/completed.
       - Verify target project is within the hierarchy and user has lead/admin authority.
       - Create new `Attachment` record:
         - Same `filePath`, `originalName`, `fileSize`.
         - `projectId = targetProjectId`, `taskId = null`.
         - `forwardedBy = currentUser.id`, `forwardedAt = LocalDateTime.now()`.
         - `sourceProjectId = sourceProjectId`, `sourceAttachmentId = sourceAttachment.id`.
       - Broadcast WebSocket event to each target project.
   - `deleteAttachment`:
     - Safe deletion: Check reference count of `filePath` before deleting from filesystem. If other records share the file path, only remove the attachment row.

3. **REST Endpoints (`AttachmentResource.java` & `ProjectLibraryResource.java`)**:
   - `GET /api/projects/{projectId}/library` - List and filter library files.
   - `POST /api/projects/{projectId}/library` - Direct file upload to library.
   - `GET /api/projects/{projectId}/library/{attachmentId}/download` - Download library file.
   - `GET /api/projects/{projectId}/library/{attachmentId}/targets` - List forward destinations.
   - `POST /api/projects/{projectId}/library/{attachmentId}/forward` - Execute forward to targets.
   - `DELETE /api/projects/{projectId}/library/{attachmentId}` - Delete file from library.

---

### 2.3 Frontend Architecture

1. **Types & API Client**:
   - Update [types/attachment.ts](file:///run/media/iamblitz/CODES/SecurePM/frontend/src/types/attachment.ts) or `project.ts` with library fields and forward request/response models.
   - Create [api/library.ts](file:///run/media/iamblitz/CODES/SecurePM/frontend/src/api/library.ts) with methods: `getLibraryFiles`, `uploadLibraryFile`, `getForwardTargets`, `forwardAttachment`, `deleteLibraryFile`, `downloadLibraryFile`.

2. **Project Page Navigation & View Switcher**:
   - In [ProjectPage.tsx](file:///run/media/iamblitz/CODES/SecurePM/frontend/src/pages/ProjectPage.tsx):
     - Add `Library` tab to the view mode switcher (`'kanban' | 'list' | 'subprojects' | 'library'`).
     - Render `ProjectLibrary` component when `viewMode === 'library'`.

3. **Components**:
   - `ProjectLibrary.tsx`:
     - Header with total files, total storage count, and "Upload File" button (disabled if completed).
     - Filter Bar (`LibraryFilter.tsx`):
       - Search input (real-time debounce).
       - File type badges/dropdown (All, Documents, Images, Archives, Other).
       - Source selector (All, Direct Uploads, Tasks, Forwarded).
       - Sort dropdown (Newest, Oldest, Name, Size).
     - Grid/List file cards:
       - File icon based on extension (PDF, image preview, code, archive, default).
       - File name & formatted size.
       - Associated task badge (if originated from a task).
       - Provenance attribution badge:
         `"↪ Forwarded by John Doe from Project Alpha • Oct 23, 2026"`.
       - Action buttons: Download, Forward (leads/admins only), Delete (uploader or lead/admin).
   - `ForwardAttachmentModal.tsx`:
     - Multi-select modal showing destination list with checkboxes:
       - Displays Project Name, parent/child tag, and "Already Forwarded" badge if applicable.
     - "Select All" / "Clear" buttons.
     - Action button: `"Forward to (N) Projects"`.

---

## 3. Step-by-Step Implementation Steps

### Step 1: Database Migration
- Create `V11__project_library_and_forwarding.sql`.

### Step 2: Backend Entities, DTOs & Service
- Update `Attachment.java` and `AttachmentDTO.java`.
- Enhance `AttachmentService.java` with library listing, filtering, direct uploading, forward target querying, forwarding, and reference-counted file deletion.
- Create `ProjectLibraryResource.java` for `/api/projects/{projectId}/library` endpoints.

### Step 3: API Documentation (Rule 4)
- Update `docs/endpoints.md` with full documentation of library endpoints, parameter filters, authority matrices, and forward payloads.

### Step 4: Backend Automated Tests (Rule 8)
- Create `ProjectLibraryResourceTest.java`:
  - Test direct file upload to library.
  - Test task attachments appear in the project library.
  - Test hierarchy isolation (subproject files do not appear in parent library).
  - Test parent member inherited access to subproject library.
  - Test forwarding authority: regular member cannot forward (403), lead/admin can forward (200).
  - Test multi-select forward creates records in selected destinations with proper metadata.
  - Test library filtering by search, file type, and source.
  - Test completed project read-only enforcement on library upload and forwarding.
  - Test reference-counted deletion preserves file for other forwarded instances.

### Step 5: Frontend Implementation
- Implement API client in `frontend/src/api/library.ts`.
- Create `ProjectLibrary.tsx`, `LibraryFilter.tsx`, and `ForwardAttachmentModal.tsx`.
- Integrate `Library` tab into `ProjectPage.tsx`.

### Step 6: Verification (Rule 8)
- Run `/opt/maven/bin/mvn test` to ensure all tests pass.
- Run `npm run build` in `frontend/` to ensure zero compilation or type errors.

---

## 4. Acceptance Criteria

- [x] Every Main Project and Sub-Project has a dedicated **Library** tab.
- [x] Direct library uploads allow uploading files without attaching them to a task.
- [x] Task attachments in a project automatically appear in that project's library.
- [x] Hierarchy Isolation: A Main Project's library displays **only** direct Main Project attachments and does not show sub-project attachments.
- [x] Sub-project library displays only attachments from that sub-project.
- [x] Members of a Main Project inherit access to browse and download files in all child sub-projects' libraries.
- [x] Every attachment in the library has a "Forward" button.
- [x] Forwarding is strictly restricted to Project Leads and Admins (regular members receive 403 / button hidden).
- [x] Forwarding modal presents checkboxes for the Main Project and relevant Sub-Projects.
- [x] Confirming forward creates duplicates in selected targets' libraries with provenance metadata: `"Forwarded by [Name] from [Source Project]"`.
- [x] Filter bar enables filtering by file name search, file type (images, docs, archives, etc.), source (direct, task, forwarded), and sorting.
- [x] Completed projects freeze library uploads and forwarding into/from the project, while downloads remain enabled.
- [x] File deletion uses reference counting so deleting a forwarded file does not corrupt the source file.
- [x] All automated tests pass (`mvn test`) and frontend builds without error (`npm run build`).
