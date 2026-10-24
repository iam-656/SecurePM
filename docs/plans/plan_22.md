# Plan 22 — Global Collapsible Sidebar Navigation

## Status: COMPLETED
- Created At: 2026-10-24T00:41:00+05:00
- Completed At: 2026-10-24T00:56:00+05:00
- Plan ID: plan_22

---

## 1. Overview & Objectives

Replace the horizontal top navbar with a sleek, modern, collapsible **Global Sidebar Navigation** that provides effortless navigation while maximizing horizontal and vertical space for Kanban boards and project views.

### Key Requirements
1. **Collapsible State**:
   - Toggles between **Expanded** (~240px width) and an **Icon Rail** (~68px width).
   - Collapse/expand state toggled via button and persisted in `localStorage` (`securepm_sidebar_collapsed`).
2. **Global Navigation Items**:
   - **Brand Header**: Logo (`Shield` icon) + "SecurePM" title + collapse/expand toggle button (`ChevronLeft` / `ChevronRight` or `PanelLeftClose` / `PanelLeftOpen`).
   - **Main Navigation**:
     - **Projects** (`/projects` or `/`): `LayoutDashboard` or `FolderKanban` icon with active route detection.
     - **Team Management** (`/admin/users`): `Users` icon, visible **only** to users with `ADMIN` role.
     - **Notifications**: Integrated notification bell (`NotificationBell`), showing real-time unread badge counter in both expanded and rail modes.
   - **Footer / Account**:
     - **Profile & Settings** (`/profile`): User avatar badge + full name/username (when expanded).
     - **Logout**: Dedicated action button with confirmation/direct logout to `/login`.
3. **UX & Tooltips**:
   - In collapsed (icon rail) mode, hovering any item reveals a crisp, floating tooltip (`Projects`, `Team`, `Notifications`, `Profile`, `Logout`).
   - Active routes highlighted with sleek dark glassmorphism styling consistent with SecurePM theme (`emerald` accents, slate backgrounds).
   - Smooth layout transitions for main content (`transition-all duration-200`).
4. **App Layout Shell**:
   - Create an `AppLayout` component that wraps all authenticated pages consistently (`DashboardPage`, `ProjectPage`, `ProjectSettingsPage`, `AdminUsersPage`, `ProfilePage`).
   - Remove redundant individual `<Navbar />` calls across page components.

---

## 2. Technical Scope & Architecture

### 2.1 Component Structure
1. `frontend/src/components/Sidebar.tsx`:
   - Renders the global sidebar.
   - Manages or receives collapsed state.
   - Renders tooltips for collapsed mode.
   - Renders `NotificationBell` adapted for sidebar layout.
2. `frontend/src/components/AppLayout.tsx`:
   - Wraps protected routes or pages.
   - Provides consistent flex layout: `<Sidebar />` on left + `<main className="flex-1 overflow-y-auto">` on right.
   - Adjusts content padding or margins according to sidebar expanded/collapsed state.
3. Page Updates:
   - Clean up `<Navbar />` from `DashboardPage.tsx`, `ProjectPage.tsx`, `ProjectSettingsPage.tsx`, `AdminUsersPage.tsx`, `ProfilePage.tsx`.
   - Update `App.tsx` or wrap routes in `AppLayout`.

---

## 3. Step-by-Step Implementation Steps

### Step 1: Create `Sidebar.tsx`
- Implement collapsible logic with `localStorage` persistence.
- Implement brand header with toggle button.
- Implement navigation links with active state highlighting and hover tooltips.
- Integrate `NotificationBell` with badge.
- Implement user profile summary and logout in footer.

### Step 2: Create `AppLayout.tsx`
- Build reusable shell layout combining `Sidebar` with page content.

### Step 3: Integrate with App Routing & Pages
- Wrap protected routes in `AppLayout` or update pages to use `AppLayout`.
- Clean up old `<Navbar />` references.

### Step 4: Verification (Rule 8)
- Run `npm run build` in `frontend/` to ensure zero TypeScript or build errors.
- Run `/opt/maven/bin/mvn test` to ensure backend test suite remains unaffected and passes.

---

## 4. Acceptance Criteria

- [x] Sidebar renders on the left of all authenticated pages.
- [x] Sidebar toggles smoothly between expanded view (~240px) and icon rail (~68px).
- [x] Collapsed/expanded state persists across page refreshes via `localStorage`.
- [x] Projects link navigates to `/projects` and highlights when active.
- [x] Team Management link is visible only to `ADMIN` users and navigates to `/admin/users`.
- [x] Notifications bell is accessible and displays unread count badge in both expanded and rail modes.
- [x] Profile link navigates to `/profile` with user avatar/info.
- [x] Logout button logs user out and redirects to `/login`.
- [x] Collapsed icon rail displays floating tooltips on hover.
- [x] Redundant horizontal top navbar is removed in favor of the new sidebar layout.
- [x] Frontend builds cleanly with zero errors (`npm run build`).
- [x] Backend tests pass (`mvn test`).
