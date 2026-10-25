# 🛡️ SecurePM

> **100% On-Premises, Air-Gapped Project & Task Management for Regulated Environments.**
>
> Zero Cloud. Zero Telemetry. Complete Data Sovereignty.

---

## 📖 Overview

**SecurePM** is a secure, high-performance, self-hosted project and task management platform engineered for environments where privacy, compliance, and reliability are non-negotiable — including **Defense & Aerospace**, **Healthcare (HIPAA)**, **Finance & Banking**, and **Government**.

Unlike conventional SaaS project management tools, SecurePM runs entirely within your infrastructure with **zero outbound internet calls**, **XSS-resistant HTTP-only session authentication**, and real-time multi-user synchronization.

---

## ✨ Key Capabilities

- **🔒 Absolute Data Sovereignty**: All databases, file attachments, and audit logs remain strictly on your local infrastructure or air-gapped server.
- **🛡️ XSS-Resistant Authentication**: Uses strict Vert.x HTTP-only `SameSite=STRICT` session cookies. Tokens are never exposed to browser `localStorage` or JavaScript execution.
- **⚡ Real-Time Collaboration**: Sub-millisecond bi-directional updates via WebSockets (`/ws/projects/{projectId}`) for Kanban cards, task edits, comments, and file attachments.
- **🧩 Agile & Plan-Driven Sub-Projects**: Support for main projects and hierarchical sub-projects with phase-gate completion and task status dependency locking.
- **📁 Integrated Project & Sub-Project Library**: Direct document uploads, task-attachment aggregation, cross-project asset forwarding, and multi-criteria filtering.
- **📋 Dual Kanban & List Views**: Drag-and-drop workflow (`@dnd-kit`), priority tags, task search, column filtering, and paginated table views.
- **⚔️ Optimistic Concurrency Control**: Hibernate `@Version` locking prevents silent data overwrites, notifying users immediately of concurrent edits.
- **👥 Role-Based Access Control (RBAC)**: Fine-grained permissions separating System Admins, Project Leads, and Members with complete audit logging.

---

## 🛠️ Technology Stack

| Layer | Technologies |
| :--- | :--- |
| **Frontend** | React 19, TypeScript, Vite, Tailwind CSS, `@dnd-kit`, Lucide React |
| **Backend** | Quarkus 3.40 (Java 25), Hibernate ORM with Panache, Elytron Security (bcrypt), Flyway |
| **Real-Time** | Vert.x HTTP Session, Quarkus WebSockets Next |
| **Database** | PostgreSQL 16 |
| **Reverse Proxy** | Nginx (SSL/TLS termination, API & WebSocket reverse proxy) |
| **Orchestration** | Docker & Docker Compose |

---

## 🚀 Quick Start (Docker Deployment)

The fastest and recommended way to run SecurePM is via Docker Compose.

### 1. Prerequisites
- [Docker](https://docs.docker.com/get-docker/) (v24+)
- [Docker Compose](https://docs.docker.com/compose/) (v2+)

### 2. Configure Environment

Clone the repository and prepare your environment file:

```bash
cp .env.example .env
```

Review or modify `.env` if you want custom database passwords or admin credentials:

```ini
POSTGRES_USER=securepm
POSTGRES_PASSWORD=your_secure_password
POSTGRES_DB=securepm
APP_BOOTSTRAP_ADMIN_PASSWORD=YourStrongPasswordHere!
```

### 3. Launch Services

Start all containers in detached mode:

```bash
docker compose up -d --build
```

### 4. Access the Application

1. Map `pm.local` to your local host (if accessing locally) in `/etc/hosts` (Linux/macOS) or `C:\Windows\System32\drivers\etc\hosts` (Windows):
   ```text
   127.0.0.1 pm.local
   ```
2. Open your browser and navigate to:
   - **Production URL**: [https://pm.local](https://pm.local)
   - Or directly: [http://localhost](http://localhost) (redirects to HTTPS)

### 5. Default Credentials

On first run, the system automatically bootstraps the administrator account:
- **Username**: `admin`
- **Password**: `ChangeMeNow123!` *(or the value defined in `APP_BOOTSTRAP_ADMIN_PASSWORD`)*

> [!TIP]
> After your first login, visit **Admin Panel (`/admin/users`)** to provision team members or update your administrative credentials.

---

## 💻 Local Development Workflow

If you are developing or testing components individually:

### 1. Start PostgreSQL
```bash
docker compose up -d postgres
```

### 2. Run Quarkus Backend
Make sure you have Java 21+ (Java 25 supported) and Maven installed:
```bash
cd backend
mvn quarkus:dev
```
The backend API starts on `http://localhost:8080`.

### 3. Run React Frontend
Make sure you have Node.js 20+ installed:
```bash
cd frontend
npm install
npm run dev
```
The frontend dev server starts on `http://localhost:5173` with automatic API and WebSocket proxying to `http://localhost:8080`.

---

## 🧪 Verification & Testing

SecurePM maintains a comprehensive automated testing suite across both backend and frontend layers:

### Run Backend Integration Tests
```bash
cd backend
mvn test
```
*Executes all 86 unit and integration tests (Auth, Projects, Subprojects, Attachments, Library, WebSockets).*

### Run Frontend Linting & Build
```bash
cd frontend
npm run lint    # oxlint: 0 errors
npm run build   # TypeScript type-checking & Vite bundle build
```

---

## 📁 Project Directory Structure

```text
SecurePM/
├── backend/                  # Quarkus Java 25 REST & WebSocket service
│   ├── src/main/java/        # Application source (Auth, Projects, Library, Realtime)
│   ├── src/main/resources/   # Flyway migrations & application config
│   └── src/test/java/        # 86 automated integration tests
├── frontend/                 # React 19 + TypeScript SPA
│   ├── src/pages/            # Landing page, Dashboard, Project, Settings, Admin
│   ├── src/components/       # Kanban board, Task list, Sidebar, Library modal
│   └── src/stores/           # Session authentication store
├── nginx/                    # Local reverse proxy & SSL configuration
│   ├── certs/                # Local SSL certificates
│   └── nginx.conf            # Proxy routing for REST, WebSockets, and SPA
├── .env.example              # Environment configuration template
├── docker-compose.yml        # Multi-container orchestration
├── SELF_HOSTING_GUIDE.md     # Step-by-step self-hosting & local network guide
└── README.md                 # User documentation
```

---

## 📚 Guides & Deployment

- 📖 [Self-Hosting & Local Network Setup Guide](SELF_HOSTING_GUIDE.md)


---

## 📄 License & Compliance

SecurePM is built for internal, self-hosted deployment. Designed to meet strict air-gap compliance requirements with zero external telemetry.