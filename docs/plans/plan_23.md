# Plan 23 — SecurePM Landing Page (Enterprise Conversion & SEO Foundation)

## Status: COMPLETED
- Created At: 2026-10-24T14:40:00+05:00
- Completed At: 2026-10-24T15:15:00+05:00
- Plan ID: plan_23

---

## 1. Overview & Objectives

Based on [docs/prompt.md](file:///run/media/iamblitz/CODES/SecurePM/docs/prompt.md) (Prompt 4):
Implement an enterprise-grade landing page for **SecurePM** designed to convert CISOs, IT Directors, and Engineering Leads. The page blends the modern dark aesthetic of **Linear/Vercel**, the enterprise trust signals and architectural breakdowns of **Stripe**, and the uncompromising security posture of **1Password**.

### Core Requirements
1. **SEO Foundation**:
   - Primary Title: `SecurePM | 100% On-Premises & Air-Gapped Project Management`
   - Meta description, keywords, OpenGraph, Twitter card tags, and JSON-LD schema (`SoftwareApplication` / `Product`).
2. **Page Architecture & Structure**:
   - **Sticky Navigation Bar**: SecurePM shield logo, anchor links (`#features`, `#security`, `#architecture`, `#deployment`, `#docs`), dynamic auth CTA (`[Open Workspace →]` if logged in, `[Sign In]` + `[Get Started]` if logged out).
   - **Hero Section**: Deep charcoal styling, grid pattern, glowing badge (`BUILT FOR REGULATED ENVIRONMENTS`), bold headline (`Project Management. Zero Cloud. Zero Compromise.`), CTAs, and 3D Kanban board mockup with air-gapped zero outbound network monitor.
   - **Anti-SaaS Trust Bar**: Target sectors (Defense & Aerospace, Healthcare & HIPAA, Finance & Banking, Government).
   - **Core Value Proposition (Stripe alternating layout)**:
     - Block 1: *Absolute Data Sovereignty* (Container firewall boundary diagram).
     - Block 2: *XSS-Resistant by Design* (HttpOnly session cookie vs. localStorage JWT side-by-side comparison).
     - Block 3: *Real-Time, Conflict-Free Collaboration* (WebSocket instant updates + optimistic locking conflict preview).
   - **Zero-Config Deployment Section**: Syntax-highlighted interactive terminal box with 1-click copy (`docker compose up -d`) and tech stack badges.
   - **Security & Compliance Deep Dive**: 4-point CISO matrix (Vert.x HTTP sessions, WebSocket cookie verification, local disk storage, zero telemetry).
   - **Final High-Contrast CTA**: Centered conversion section.
   - **Footer**: Multi-column links and air-gapped copyright disclaimer.
3. **Routing Integration**:
   - `/` serves the public Landing Page.
   - `/projects` serves the protected Projects Dashboard.
   - Seamless redirects between public/protected routes based on authentication state.

---

## 2. Technical Scope & Architecture

### 2.1 File Changes
1. **`frontend/index.html`**:
   - SEO metadata, OpenGraph, Twitter cards, and JSON-LD schema markup.
2. **`frontend/src/pages/LandingPage.tsx`**:
   - Full self-contained landing page component with all 8 blueprint sections.
3. **`frontend/src/App.tsx`**:
   - Configure public `/` route for `LandingPage` and authenticated `/projects` route for `DashboardPage`.
4. **`frontend/src/components/Sidebar.tsx`**:
   - Update navigation and brand links to point to `/projects`.
5. **`frontend/src/components/ProtectedRoute.tsx`**:
   - Update `PublicRoute` redirect target to `/projects`.

---

## 3. Step-by-Step Implementation Steps

### Step 1: SEO Foundation in `index.html`
- Update title, description, keywords, OpenGraph tags, and JSON-LD schema script.

### Step 2: Implement `LandingPage.tsx`
- Build sticky navigation bar with session awareness.
- Build hero section with glow gradients, badge, and mock Kanban board visual.
- Build trust bar for defense, healthcare, finance, and government.
- Build alternating value prop blocks (data sovereignty, auth comparison, real-time collaboration).
- Build deployment section with interactive copyable terminal command.
- Build security & compliance matrix for CISOs.
- Build final CTA and comprehensive footer.

### Step 3: Integrate Routing in `App.tsx`, `Sidebar.tsx`, and `ProtectedRoute.tsx`
- Wire `/` to `LandingPage`, redirect authenticated visitors when appropriate.
- Ensure workspace internal navigation remains smooth.

### Step 4: Verification (Rule 8)
- Run `npm run build` in `frontend/`.
- Run `/opt/maven/bin/mvn test` in `backend/`.

---

## 4. Acceptance Criteria

- [x] `index.html` contains full SEO metadata, keywords, OpenGraph tags, and JSON-LD structured schema.
- [x] Sticky navbar renders with smooth anchor navigation and dynamic CTA based on user authentication state.
- [x] Hero section renders with glowing pre-headline badge, bold title, and air-gapped Kanban visualization.
- [x] Regulated industries trust bar renders with defense, healthcare, finance, and government badges.
- [x] Alternating value blocks render with container firewall diagram, auth comparison card, and real-time conflict preview.
- [x] Deployment section renders syntax-highlighted terminal box with working 1-click clipboard copy.
- [x] Security & compliance matrix covers HTTP sessions, WebSocket cookie auth, local disk storage, and zero telemetry.
- [x] Final CTA and multi-column footer render properly.
- [x] Route `/` is accessible publicly without login, while `/projects` requires authentication.
- [x] Frontend builds cleanly with zero errors (`npm run build`).
- [x] Backend test suite passes (`mvn test`).
