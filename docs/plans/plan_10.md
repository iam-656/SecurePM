# Plan 10 — Phase 14: Frontend WebSocket Real-Time Updates

## Status: COMPLETED
- Created At: 2026-10-18T16:21:00+05:00
- Completed At: 2026-10-18T16:28:40+05:00

## Overview
Implement Phase 14 (Frontend — WebSocket Real-Time Updates) according to `docs/plans/securepm-mvp-plan.md` and repository rules. This establishes a bidirectional, session-authenticated WebSocket connection per project (`/ws/projects/{projectId}`) and enables seamless real-time state synchronization for tasks, comments, and attachments without intrusive full-page reloads or UI flickering.

---

## Deliverables & Architecture

### 14.1 Types & Definitions (`src/types/websocket.ts`)
- Define `WebSocketEventType`:
  - `TASK_CREATED`, `TASK_UPDATED`, `TASK_DELETED`
  - `COMMENT_CREATED`, `COMMENT_UPDATED`, `COMMENT_DELETED`
  - `ATTACHMENT_CREATED`, `ATTACHMENT_DELETED`
- Define `WebSocketMessage` structure:
  - `type`: `WebSocketEventType`
  - `projectId`: `number`
  - `taskId`: `number`
  - `payload`: `Record<string, unknown>` (e.g. `{ task: Task }`, `{ comment: Comment }`, `{ attachment: Attachment }`, `{ commentId: number }`, `{ attachmentId: number }`)
- Export in `src/types/index.ts`.

### 14.2 WebSocket Hook (`src/hooks/useWebSocket.ts`)
- Connects automatically to `ws(s)://${window.location.host}/ws/projects/${projectId}` using existing Vert.x session cookie.
- Connection Lifecycle:
  - Tracks status: `'CONNECTING' | 'OPEN' | 'CLOSING' | 'CLOSED'`.
  - Exponential backoff reconnection strategy (1s initial, 1.5x multiplier, 15s max).
  - Tracks disconnect duration: triggers full data refetch via `onReconnect` callback when reconnecting after disconnection.
  - Exposes `isConnected`, `status`, `lastMessage`, and `sendMessage`.
  - Dispatches parsed `WebSocketMessage` to registered `onMessage` handler.
- Cleanly closes WebSocket on unmount or projectId change.

### 14.3 State Patching in Hooks (`src/hooks/`)
1. **`useTasks.ts`**:
   - Expose patch methods:
     - `patchTaskCreated(task: Task)`: Adds new task to local array and increments total.
     - `patchTaskUpdated(task: Task)`: In-place update of matching task by id.
     - `patchTaskDeleted(taskId: number)`: Removes task by id and decrements total.
2. **`useKanban.ts`**:
   - Expose patch methods:
     - `patchTaskCreated(task: Task)`: Adds task into `board[task.status]`.
     - `patchTaskUpdated(task: Task)`: Moves task to new column if status changed, or updates in-place.
     - `patchTaskDeleted(taskId: number)`: Removes task from whichever column contains it.
3. **`useComments.ts`**:
   - Expose patch methods:
     - `patchCommentCreated(comment: Comment)`: Appends comment if not already present.
     - `patchCommentUpdated(comment: Comment)`: Updates matching comment.
     - `patchCommentDeleted(commentId: number)`: Removes comment.
4. **`useAttachments.ts`**:
   - Expose patch methods:
     - `patchAttachmentCreated(attachment: Attachment)`: Appends attachment.
     - `patchAttachmentDeleted(attachmentId: number)`: Removes attachment.

### 14.4 Page & Modal Integration (`ProjectPage.tsx` & `TaskDetailModal.tsx`)
1. **Real-time Event Routing in `ProjectPage.tsx`**:
   - Subscribes `useWebSocket` to project events.
   - On `TASK_CREATED`: patches both `tasksState` and `kanbanState`.
   - On `TASK_UPDATED`:
     - Patches both `tasksState` and `kanbanState`.
     - Conflict handling: If the updated task is currently being edited in `TaskForm`, display a prominent warning banner: *"Task was updated by another user."*
     - If the task is open in `TaskDetailModal`, sync the selected task state.
   - On `TASK_DELETED`:
     - Patches both `tasksState` and `kanbanState`.
     - Conflict handling: If the deleted task is currently being edited or viewed in detail modal, auto-close the modal and alert the user: *"The task was deleted by another user."*
   - On Reconnect: Executes full REST refetch (`tasksState.loadTasks()` and `kanbanState.loadKanban()`).
2. **Real-time Comments and Attachments**:
   - Route `COMMENT_*` and `ATTACHMENT_*` events to `TaskDetailModal` or reload task detail items if modal is open for the matching `taskId`.
3. **Live Indicator**:
   - Add a subtle live status indicator (pulse dot: "Live" / "Connecting..." / "Offline") in the project header.

### 14.5 Backend Enhancement (payload IDs for delete events)
- Ensure `CommentService.deleteComment` includes `commentId` in `payload`.
- Ensure `AttachmentService.deleteAttachment` includes `attachmentId` in `payload`.

---

## Verification Results
1. **Frontend Linting (`npm run lint`)**:
   - `oxlint`: **0 errors, 0 warnings** across all 51 files with 116 rules.
2. **Frontend Production Build (`npm run build`)**:
   - `tsc -b && vite build`: Success in 2.54s, 2022 modules transformed, **0 errors, 0 warnings**.
3. **Dev Server (`http://localhost:5173/`)**:
   - Active and proxying `/api` and `/ws` to Quarkus backend.

