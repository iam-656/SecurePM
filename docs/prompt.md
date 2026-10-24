# Read the non commented text only and it will always be at the top (just below this heading; once you see comments starting, stop reading)

## Prompt 4: 
To build a landing page that converts CISOs, IT Directors, and Engineering Leads, we need to blend the sleek, modern aesthetics of Linear, the enterprise trust signals of Stripe, and the security-first messaging of 1Password.
Here is a comprehensive blueprint for your SecurePM landing page, optimized for high conversion and maximum SEO impact.
1. SEO Foundation (Crucial for Organic Traffic)
Before writing the copy, we need the meta tags to rank for your niche keywords (on-premises project management, air-gapped task tracker, secure Jira alternative).
SEO Title: SecurePM | 100% On-Premises & Air-Gapped Project Management
Meta Description: SecurePM is a zero-cloud, air-gapped project management platform. Built for regulated industries with XSS-resistant auth, real-time WebSockets, and absolute data sovereignty.
Target Keywords: On-premises project management, air-gapped task management, secure self-hosted Jira alternative, zero cloud project tracker, enterprise task management.
OpenGraph Image: A sleek, dark-mode mockup of the SecurePM Kanban board with a "100% Air-Gapped" badge.
Schema Markup: Use SoftwareApplication and Product JSON-LD schema to help search engines understand it's a software product.
2. Page Structure & Copywriting
A. Navigation Bar (Sticky)
Left: SecurePM Logo (Clean, minimalist shield or geometric icon).
Center: Features | Security | Architecture | Docs
Right: [Sign In] (Ghost button) | [Get Started] (Solid, high-contrast primary button -> Links to /login)
B. Hero Section (The "Linear/Vercel" Vibe)
Design: Dark mode background, subtle grid pattern, glowing gradient accents.
Pre-headline (Small, glowing text): BUILT FOR REGULATED ENVIRONMENTS
H1 (Massive, bold): Project Management.

Zero Cloud. Zero Compromise.
H2 (Subheadline, lighter text): The 100% on-premises, air-gapped alternative to bloated SaaS tools. Keep your data, your network, and your workflows entirely in your control.
CTAs:
[Get Started] (Primary -> /login)
[View Architecture] (Secondary -> #security)
Hero Image: A high-fidelity, slightly angled 3D mockup of the SecurePM Kanban board. Crucial detail: Add a subtle "No External Network Calls" network-graph animation next to it to visually prove the air-gapped nature.
C. The "Anti-SaaS" Trust Bar
Design: Minimalist, grayscale logos or icons.
Text: "Engineered for teams who cannot risk data leaving their network."
Icons/Text: [Defense & Aerospace] | [Healthcare & HIPAA] | [Finance & Banking] | [Government]
D. Core Value Proposition (The "Stripe" Layout)
Design: Alternating left/right layout. Text on one side, beautiful UI animation on the other.
Block 1: Absolute Data Sovereignty
Headline: Your Network. Your Rules.
Copy: No telemetry. No external SMTP. No cloud storage. SecurePM runs entirely within your private infrastructure. If your network is air-gapped, SecurePM works flawlessly.
Visual: A diagram showing the Docker containers (Postgres, Quarkus, Nginx) completely enclosed in a "firewall" boundary.
Block 2: Enterprise-Grade Security (Not an afterthought)
Headline: XSS-Resistant by Design.
Copy: While others store fragile JWTs in localStorage, SecurePM uses strict HttpOnly, SameSite=STRICT session cookies. Malicious scripts can't touch your auth tokens. Ever.
Visual: A side-by-side comparison. Left: "Standard SPA" (Red X, localStorage exposed). Right: "SecurePM" (Green Check, HttpOnly Cookie locked).
Block 3: Real-Time, Conflict-Free Collaboration
Headline: Collaborate in Real-Time. Never Lose Data.
Copy: Smart WebSockets patch the UI instantly without flickering. And with built-in Optimistic Locking, simultaneous edits result in a polite conflict warning, not silent data overwrites.
Visual: A screen recording of two cursors moving tasks on the Kanban board in real-time, followed by a sleek "Task updated by another user" toast notification.
E. The "Zero-Config" Deployment Section (The "Vercel" Vibe)
Design: Dark terminal/code block aesthetic.
Headline: Deploy in Minutes, Not Months.
Subhead: No complex Kubernetes clusters required. Just Docker Compose.
Visual: A sleek, syntax-highlighted terminal window showing:
bash

123
Badges below: [Docker Ready] | [PostgreSQL 16] | [Nginx SSL] | [mkcert Local HTTPS]
F. Security & Compliance Deep Dive (For the CISO)
Design: Clean, light-mode section to break up the dark theme, using checkmarks and shields.
Headline: Security isn't a feature. It's the foundation.
Grid of 4 points:
Session-Based Auth: Quarkus Vert.x HTTP sessions. No JWTs. No local storage.
WebSocket Security: Upgrades validate the exact same HttpOnly session cookie. No URL token leakage.
Local File Storage: Attachments stored on your local disk (/data/attachments), never uploaded to AWS S3.
Zero External Dependencies: No phone-home telemetry. No mandatory external identity providers for MVP.
G. Final Call to Action
Design: Large, centered, high contrast.
Headline: Take back control of your project data.
Subhead: Join the teams who refuse to put their internal roadmaps on the public cloud.
Button: [Get Started / Deploy Now] -> Links to /login
H. Footer
Columns: Product (Features, Security, Changelog), Developers (Docs, API, Architecture), Company (About, Contact).
Bottom: © 2026 SecurePM. 100% On-Premises. Zero Cloud.
3. Design & UX Guidelines for the Developer
To make it look like a top-tier SaaS (Linear/Stripe level), follow these rules:
Color Palette:
Background: Deep charcoal/off-black (#0A0A0B or #09090B).
Text: Crisp white and soft gray (#F4F4F5, #A1A1AA).
Accent: A vibrant, trustworthy color. Electric Blue (#3B82F6) or Emerald Green (#10B981) to signify security and "go".
Typography: Use a modern, geometric sans-serif. Inter or Geist (by Vercel) are perfect. They are highly legible and look incredibly professional.
Animations: Use subtle fade-ins on scroll (Framer Motion in React). Do not overdo it. The UI should feel fast and precise.
Borders & Glows: Use very subtle borders (border-white/10) and subtle background glows (radial gradients) to give depth without making it look cluttered.
4. Technical SEO Checklist for your React/Vite Frontend
Since you are using React 19 + Vite, ensure you do the following to make it SEO friendly (React SPAs are notoriously bad for SEO if not handled correctly):
Use Vite Plugin for SSR or Prerendering: Since the landing page is mostly static, use vite-plugin-ssr or @prerenderer/rollup-plugin to generate static HTML for the landing page. Search engines need to see the <h1> and <p> tags in the initial HTML payload.
Dynamic Meta Tags: Use react-helmet-async to dynamically inject the Title, Description, and OpenGraph tags into the <head> of the document.
Semantic HTML: Strictly use <header>, <main>, <section>, <article>, and <footer>. Do not just use <div> for everything.
Image Optimization: Use Vite's built-in asset handling or a plugin to serve WebP/AVIF images. Add descriptive alt tags to all UI mockups (e.g., alt="SecurePM Kanban board showing air-gapped task management").
Fast Load Times: Keep the initial JS bundle small. The landing page should load in under 1.5 seconds.
Summary of the "Get Started" Flow
When the user clicks [Get Started] in the top right:
They are routed to /login.
The ProtectedRoute logic checks if they already have a valid session_id cookie.
If yes -> redirect to /dashboard.
If no -> show the sleek, secure login form.
This approach positions SecurePM not just as "another Jira clone," but as a premium, security-first infrastructure tool for serious organizations.

<!-- ## Prompt 3: 
Core Concept
A project can be managed using either an **Agile** or a **Plan-Driven** approach. The primary distinction between the two lies in how dependencies are enforced. We support two dependency types at the sub-project level:
1. **Start After (Sequential / Dependent):** Requires prerequisite sub-projects to finish first.
2. **No Dependency (Independent / Parallel):** Operates standalone without upstream blockers.

### Functional Requirements

#### 1. First Sub-Project Exception
- The very first sub-project created within a project cannot have dependencies; the dependency selection inputs must be hidden or disabled by default.

#### 2. Sub-Project Creation UI & Flow
When creating subsequent sub-projects, provide two related dropdowns:
- **Dependency Type Dropdown:** Options are `"No Dependency"` and `"Start After"`.
- **Target Sub-Project Dropdown:**
  - **If `"No Dependency"` is selected:** The target dropdown is disabled/cleared. The sub-project operates independently in parallel with others.
  - **If `"Start After"` is selected:** The target dropdown becomes active, allowing the user to select one or multiple existing sub-projects as prerequisites.

#### 3. Execution Rules & Validation Logic
- **"Start After" Enforcement:**
  - If a sub-project has a `"Start After"` dependency, **task creation must be strictly blocked/disabled** until **all** selected prerequisite sub-projects are marked as `"Completed"`.
  - **Allowed actions during blocked state:** Users can still assign/add team members, upload attachments, and attachments can be forwarded into this sub-project. Only task creation is restricted.
- **Independence & Downstream Integrity:**
  - Selecting `"No Dependency"` for Sub-Project A means it has no *upstream* prerequisites.
  - However, Sub-Project A can still serve as a prerequisite for other sub-projects (i.e., downstream sub-projects can set their `"Start After"` dependency targeting Sub-Project A without affecting Sub-Project A's independent execution). -->

<!-- ## Prompt 2:
1. Library Scope & Visibility
- **Dedicated Library Tab:** Every Main Project and Sub-Project must contain an isolated **Library** module that stores all attachments uploaded within its specific workspace.
- **Hierarchy Isolation:** A Main Project’s library must display **only direct Main Project attachments**. Sub-project attachments must not automatically populate the parent project's library view.

2. Access & Permissions
- **Inherited Access:** Members of a Main Project automatically inherit read and access permissions for all associated Sub-Projects and their respective libraries.

3. Attachment Forwarding Workflow
Each attachment across all libraries must include a **"Forward"** action button.

- **Modal Trigger:** Clicking "Forward" opens a destination selector modal dialog (similar to a multi-select chat forwarding interface).
- **Multi-Select Targets:** The modal must list the Main Project and all relevant Sub-Projects with checkboxes, allowing users to select single or multiple destinations simultaneously.
- **Action Execution:** Confirming the forward duplicates into the selected targets' libraries.

4. Metadata & Provenance Tracking
- Forwarded files must appear in the destination library with clear attribution metadata:  
  `"Forwarded by [User Name]"` (including an optional timestamp).

5. Filter
- After clicking on Library, there should also be a filter for easiness.  -->

<!-- ## Prompt 1:
- Whenever someone creates a project, there should be also a bottom line "created by xyz".
- Now I am thinking that in the sub projects lead, and main project creator can mark the whole sub project as completed, after that no task will be created or updated or deleted in the sub project.
- If the lead marks sub projects as completed, only main project creator can revert this action. But if project creator mark sub project as completed, then lead can't revert this.
- Before marking any sub project completed, all tasks in that sub project should also be completed first. If there is any task in any state other than completed such as Todo, review, pending, etc, then sub project can't be marked as completed. 
- Similarly, the main project creator can mark the main project as completed. But before doing this, all sub projects in the main project should also be completed first. If there is any sub project not completed yet, then main project can't be marked as completed. 
- If the main project creator marks main project as completed, only main project creator can revert this action.
- If the lead marks a sub project as completed, then a notification will be sent to all the members of the sub project that the sub project xyz has been marked as completed by the lead. And similarly for the main project, when creator marks the main project as completed, a notification will be sent to all the members of main and sub projects that the project xyz has been marked as completed.   -->

