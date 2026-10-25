# 🛡️ SecurePM Self-Hosting & Local Network Guide

Welcome to **SecurePM**! This comprehensive guide walks you through downloading, setting up, and deploying SecurePM on your local workstation, home lab, or private organization network.

SecurePM is built for **100% on-premises, air-gapped operation** with **zero external telemetry**, keeping your project management data entirely under your sovereignty.

---

## 📋 Table of Contents
1. [Prerequisites](#1-prerequisites)
2. [Quick Start (Single User / Localhost)](#2-quick-start-single-user--localhost)
3. [Local Network Setup (Sharing with Peers / LAN)](#3-local-network-setup-sharing-with-peers--lan)
4. [First-Time Administration](#4-first-time-administration)
5. [Troubleshooting & Common Issues](#5-troubleshooting--common-issues)
6. [Stopping and Cleaning Up](#6-stopping-and-cleaning-up)

---

## 1. Prerequisites

Before getting started, ensure you have the following tools installed on your host machine:

- **Docker & Docker Compose**:
  - Docker v24.0+ (or v29+)
  - Docker Compose v2.20+ (or v5+)
- **Git**: For cloning the repository
- **mkcert**: A simple zero-config tool for generating locally trusted SSL/TLS certificates (required for secure session cookies)

### Installing `mkcert`

| Operating System | Command |
| :--- | :--- |
| **Windows** | `choco install mkcert` *(via Chocolatey)* or `scoop install mkcert` |
| **macOS** | `brew install mkcert` *(via Homebrew)* |
| **Linux (Ubuntu/Debian)** | `sudo apt update && sudo apt install libnss3-tools -y && brew install mkcert` (or download from [GitHub releases](https://github.com/FiloSottile/mkcert/releases)) |
| **Linux (Arch/Manjaro)** | `sudo pacman -S mkcert` |
| **Linux (Fedora/RHEL)** | `sudo dnf install mkcert` |

---

## 2. Quick Start (Single User / Localhost)

If you want to run SecurePM on your machine for personal use or local testing, follow these 5 steps:

### Step 2.1: Clone the Repository
```bash
git clone https://github.com/iam-656/SecurePM.git
cd SecurePM
```

### Step 2.2: Generate Local HTTPS Certificates
SecurePM requires HTTPS to protect its strict `HttpOnly`, `SameSite=STRICT`, and `Secure` session cookies.

1. Install the local Certificate Authority (CA):
   ```bash
   mkcert -install
   ```

2. Generate a trusted certificate for `localhost`, `127.0.0.1`, and `pm.local`:
   ```bash
   mkdir -p nginx/certs
   mkcert -key-file nginx/certs/pm.local-key.pem -cert-file nginx/certs/pm.local.pem localhost 127.0.0.1 ::1 pm.local
   ```

### Step 2.3: Configure Environment Variables
Create your local `.env` configuration file from the provided template:
```bash
cp .env.example .env
```

Review or edit `.env` with your desired database credentials and bootstrap administrator password:
```ini
POSTGRES_USER=securepm
POSTGRES_PASSWORD=securepm
POSTGRES_DB=securepm
POSTGRES_PORT=5432

# Bootstrap Administrator initial credentials
APP_BOOTSTRAP_ADMIN_PASSWORD=ChangeMeNow123!

APP_DOMAIN=pm.local
HTTP_PORT=80
HTTPS_PORT=443
```

> [!WARNING]
> Always change `APP_BOOTSTRAP_ADMIN_PASSWORD` before exposing the instance to any shared network.

### Step 2.4: Start the Application
Build and start all services in detached mode:
```bash
docker compose up -d --build
```

Docker will build and launch 4 interconnected containers:
- `securepm-postgres` (Database)
- `securepm-app` (Quarkus REST & WebSocket API)
- `securepm-frontend` (React SPA static build)
- `securepm-nginx` (SSL/TLS reverse proxy)

### Step 2.5: Access the Application
Open your web browser and navigate to:
- 👉 **[https://localhost](https://localhost)** or **[https://127.0.0.1](https://127.0.0.1)**

Log in using the bootstrap credentials:
- **Username**: `admin`
- **Password**: The password configured in your `.env` file (Default: `ChangeMeNow123!`)

---

## 3. Local Network Setup (Sharing with Peers / LAN)

Want your teammates, colleagues, or peers on the same office Wi-Fi or LAN to collaborate in real-time? Follow these steps:

### Step 3.1: Find Your Machine's Local IP Address
- **Windows**: Open Command Prompt / PowerShell and run:
  ```powershell
  ipconfig
  ```
  Look for **IPv4 Address** (e.g., `192.168.1.50` or `10.0.0.15`).
- **macOS / Linux**: Open Terminal and run:
  ```bash
  ip -br addr show   # or ifconfig
  ```
  Note your local network interface IP (usually starting with `192.168.` or `10.`).

### Step 3.2: Regenerate Certificates Including Your Local IP
Generate a new certificate that includes your local IP so peers' browsers can connect securely:

```bash
# Replace 192.168.1.50 with your host machine's actual local IP address
mkcert -key-file nginx/certs/pm.local-key.pem -cert-file nginx/certs/pm.local.pem localhost 127.0.0.1 ::1 pm.local 192.168.1.50
```

Restart the Nginx container to apply the updated certificate:
```bash
docker compose restart nginx
```

### Step 3.3: Accessing from Peer Devices
From any laptop, phone, or tablet connected to the same network, open a browser and go to:
- 👉 **`https://192.168.1.50`** *(replace with your host's actual IP)*

#### Handling Browser Security Warnings on Peer Devices
Because the `mkcert` Certificate Authority was generated on your host machine, peer devices will see an initial SSL warning unless trusted:

- **Option A: Install mkcert CA on Peer Devices (Recommended for Teams)**:
  1. On your host machine, find the root CA path:
     ```bash
     mkcert -CAROOT
     ```
  2. Copy the `rootCA.pem` file to the peer device.
  3. On the peer device, install `mkcert` and run `mkcert -install`, or import `rootCA.pem` directly into the operating system / browser's "Trusted Root Certification Authorities" store.
  4. The peer browser will now establish a 100% green trusted HTTPS connection without any warnings.

- **Option B: Proceed Anyway (Quick Testing)**:
  - **Chrome / Edge / Brave**: Click **Advanced** → **Proceed to 192.168.1.50 (unsafe)**.
  - **Firefox**: Click **Advanced** → **Accept the Risk and Continue**.

---

## 4. First-Time Administration

Once you log in as the default administrator:

1. **Change Your Administrator Password**:
   - Click your user profile avatar in the sidebar.
   - Navigate to **Profile Settings** and update your password immediately.
2. **Provision User Accounts**:
   - Go to **User Management (`/admin/users`)** from the left navigation rail.
   - Create accounts for your team members (`MEMBER` or `ADMIN` roles).
3. **Create Projects & Kanban Workspaces**:
   - Go to **Projects (`/projects`)** and create your first project.
   - Assign members, define sub-projects, manage task workflows, or upload shared assets in the project library.

---

## 5. Troubleshooting & Common Issues

### Issue 1: Port 80 or 443 is already in use
- **Symptom**: Docker Compose fails to start Nginx with: `bind: address already in use` or `port is already allocated`.
- **Solution**: Another service (such as Apache, Nginx, or another container) is occupying port 80 or 443.
  Adjust the external ports in `docker-compose.yml`:
  ```yaml
  nginx:
    ports:
      - "8080:80"
      - "8443:443"
  ```
  You can then access SecurePM via `https://localhost:8443`.

---

### Issue 2: "Session unavailable" or Immediate Logout
- **Symptom**: You enter valid credentials, but are immediately returned to the login screen or receive HTTP 401 Unauthorized errors.
- **Solution**: Ensure you are visiting via **`https://`**, NOT plain `http://`. SecurePM cookies are marked with `Secure` and `SameSite=STRICT`. Modern browsers reject cookies marked `Secure` when transmitted over unencrypted HTTP.

---

### Issue 3: File Upload Fails or Attachments Disappear
- **Symptom**: Uploading an attachment returns a 500 status code, or files disappear after restarting Docker.
- **Solution**: Ensure Docker has permission to write to the persistent `attachments` volume. On Linux, grant appropriate permissions:
  ```bash
  docker volume inspect securepm_attachments
  ```

---

### Issue 4: Database Connection Refused on Startup
- **Symptom**: Backend logs indicate: `Connection refused to PostgreSQL on port 5432`.
- **Solution**: PostgreSQL might take a few seconds longer on its initial initialization. Simply restart the backend:
  ```bash
  docker compose restart quarkus-app
  ```

---

## 6. Stopping and Cleaning Up

### Stop the Application (Preserving Data)
To stop all containers while preserving your database and uploaded attachments:
```bash
docker compose down
```

### Stop and Wipe All Data (Complete Factory Reset)
To stop all containers and permanently delete the database and all uploaded files:
```bash
docker compose down -v
```

> [!CAUTION]
> Running `docker compose down -v` permanently removes the `pg_data` and `attachments` Docker volumes. Only use this if you want a complete reset.