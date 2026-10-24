# Plan 09 — Phase 13: Frontend Comments & Attachments UI

## Status: COMPLETED
- Created At: 2026-10-18T11:29:30+05:00
- Completed At: 2026-10-18T15:26:37+05:00

## Overview
Implement Phase 13 (Frontend — Comments & Attachments UI) according to `docs/plans/securepm-mvp-plan.md` and repository standards. This enables project collaborators to engage in contextual discussions on tasks and attach/download relevant project assets (with multipart upload and blob downloads).

---

## Deliverables

### 13.1 Hooks (`src/hooks/`)
1. **`useComments.ts`**:
   - Manages task comments state: `comments`, `loading`, `error`.
   - Actions: `loadComments`, `addComment`, `editComment`, `deleteComment`.
2. **`useAttachments.ts`**:
   - Manages task attachments state: `attachments`, `loading`, `uploading`, `error`.
   - Actions: `loadAttachments`, `uploadAttachment`, `downloadAttachment`, `deleteAttachment`.

### 13.2 Comment Components (`src/components/`)
1. **`CommentForm.tsx`**:
   - Resizable textarea with submit action and loading spinner.
   - Supports both creation and inline edit modes (`initialContent`, `onCancel`).
2. **`CommentList.tsx`**:
   - Chronological list of task comments.
   - Displays author avatar, author full name / username, relative timestamp, and formatted content.
   - Edit and delete actions restricted to the author or system administrator.

### 13.3 Attachment Components (`src/components/`)
1. **`AttachmentUpload.tsx`**:
   - Interactive dropzone and file input picker.
   - File size validation and upload progress spinner.
2. **`AttachmentList.tsx`**:
   - File cards displaying file type icon, original name, formatted size (`KB`/`MB`), and upload date.
   - Direct download action utilizing blob URL triggers.
   - Delete action with confirmation prompt.

### 13.4 Task Detail Integration (`src/components/TaskDetailModal.tsx` & `ProjectPage.tsx`)
1. **`TaskDetailModal.tsx`**:
   - Unified modal combining task overview metadata, Comment section, and Attachment section.
   - Tab switching between "Comments" and "Attachments" with item counts.
   - Quick edit action opening `TaskForm`.
2. **Integration in `ProjectPage.tsx`**:
   - Clicking a task card or list row opens `TaskDetailModal`.
   - Direct access to comments and attachments for any task.

---

## Verification Results
1. **Frontend Linting (`npm run lint`)**:
   - `oxlint`: **0 errors, 0 warnings** across 49 files with 116 rules.
2. **Frontend Production Build (`npm run build`)**:
   - `tsc -b && vite build`: Success in 8.40s, 2021 modules transformed, **0 errors, 0 warnings**.
3. **Dev Server (`http://localhost:5173/`)**:
   - Dev server active and serving the application.

