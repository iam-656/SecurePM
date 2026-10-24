# Plan 05 — Phase 9: Frontend Setup

## Context
Phase 8 (Backend Testing) is 100% complete with all 55 tests passing.
This plan addresses Phase 9 (Frontend Setup) as specified in `docs/plans/securepm-mvp-plan.md` and `docs/techStack.md`.

## Deliverables

### 9.1 Scaffold Vite + React Project
- Use `npm create vite@latest frontend -- --template react-ts`
- Install dependencies:
  - Runtime: `react`, `react-dom`, `axios`
  - Dev dependencies: `tailwindcss@3`, `postcss`, `autoprefixer`, `@types/react`, `@types/react-dom`

### 9.2 Configure Tailwind CSS v3 (Pinned)
- Create `frontend/tailwind.config.cjs` targeting `./index.html` and `./src/**/*.{ts,tsx}`
- Create `frontend/postcss.config.cjs` with `tailwindcss` and `autoprefixer`
- Set up `frontend/src/index.css` with `@tailwind base; @tailwind components; @tailwind utilities;` plus modern typography and styling tokens.

### 9.3 Configure Vite (`vite.config.ts`)
- Proxy `/api` to `http://localhost:8080` (`changeOrigin: true`)
- Proxy `/ws` to `http://localhost:8080` (`ws: true`)
- Port: 5173

### 9.4 TypeScript Type Definitions (`src/types/`)
- `auth.ts`: `Role`, `User`, `LoginRequest`, `LoginResponse`, `CreateUserRequest`, `UpdateUserRequest`
- `project.ts`: `UserSummary`, `Project`, `CreateProjectRequest`, `UpdateProjectRequest`
- `task.ts`: `TaskStatus`, `TaskPriority`, `Task`, `CreateTaskRequest`, `UpdateTaskRequest`, `KanbanBoard`, `PageResponse<T>`
- `comment.ts`: `Comment`, `CreateCommentRequest`, `UpdateCommentRequest`
- `attachment.ts`: `Attachment`
- `index.ts`: Unified export of all models

### 9.5 Verification
- Run `npm run build` in `frontend/` to ensure clean TypeScript compilation and asset bundling.
- Verify `index.html` renders and connects styles properly.

## Status: COMPLETED
- Project scaffolded with Vite + React 19 + TypeScript.
- Tailwind CSS v3 pinned (`tailwindcss@3.4.19`, `postcss@8.5.30`, `autoprefixer@10.6.1`) with `tailwind.config.cjs` and `postcss.config.cjs`.
- Vite proxy configured for `/api` and `/ws` to `http://localhost:8080`.
- TypeScript models established in `src/types/` (`auth.ts`, `project.ts`, `task.ts`, `comment.ts`, `attachment.ts`, `index.ts`).
- Verification `npm run build` passed with zero errors (`tsc -b && vite build` built in 6.77s).

