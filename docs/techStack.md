# 1. Backend (Runs Natively)
- JDK: Java 25
- Build Tool: Apache Maven Version: 3.10.0
- Framework: Quarkus 3.40 LTS
- Quarkus CLI (Optional but recommended): A command-line tool to easily generate Quarkus projects and add extensions.

# 2. Frontend (Runs Natively)
- Runtime: Node.js  Version: v22.23.1
- Package Manager: npm  Version: 10.9.8
- Build Tool: Vite 5.x or 6.x.
- Core Library: React 18 or 19 with TypeScript 5.x.

# 3. Infrastructure & Local Networking (Runs in Docker)
- Container Engine: Docker Engine + Docker Compose V2 plugin. Docker version: 29.8.2, Docker compose version: v5.6.0
- Local HTTPS Tool: mkcert. This is a crucial zero-config tool to create locally trusted development certificates. It will allow your tablet to connect to https://pm.local without throwing browser security warnings.
- Database: PostgreSQL 16 (Will run inside a Docker container).
- Reverse Proxy: Nginx Alpine (Will run inside a Docker container to handle routing and WebSockets).