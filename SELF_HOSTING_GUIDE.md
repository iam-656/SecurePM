SecurePM Self-Hosting & Local Network Guide
Welcome to SecurePM! This guide will help you download, set up, and run SecurePM on your local machine or private network. SecurePM is designed to be entirely self-hosted, keeping your project data strictly within your control.
1. Prerequisites
Before you begin, ensure you have the following installed on your host machine:
Docker (v29.8.2 or later) & Docker Compose (v5.6.0 or later)
Git (to clone the repository)
mkcert (for generating locally trusted HTTPS certificates)
Note for Windows Users: You can install mkcert via Chocolatey: choco install mkcert
Note for macOS Users: You can install mkcert via Homebrew: brew install mkcert
Note for Linux Users: You can install mkcert via your package manager (e.g., sudo apt install mkcert or via Linuxbrew).
2. Quick Start (Single User / Localhost)
If you just want to run SecurePM on your own machine for personal use, follow these steps:
Step 2.1: Clone the Repository
bash

12
Step 2.2: Generate Local HTTPS Certificates
SecurePM requires HTTPS for secure session cookies. We use mkcert to create trusted local certificates.
Install the local Certificate Authority (CA):
bash

1
Generate a certificate for localhost and 127.0.0.1:
bash

12
Step 2.3: Configure Environment Variables
Create a .env file in the root directory to set your initial admin password:
env

1
⚠️ Security Warning: Change this default password immediately after your first login.
Step 2.4: Start the Application
Run the following command to build and start all services (PostgreSQL, Quarkus Backend, React Frontend, and Nginx):
bash

1
Step 2.5: Access the Application
Open your browser and navigate to:
👉 https://localhost or https://127.0.0.1
Log in with:
Username: admin
Password: The password you set in the .env file.
3. Local Network Setup (Sharing with Peers)
To allow colleagues, friends, or family on the same Wi-Fi or LAN to access your SecurePM instance, you need to expose it via your machine's local IP address (e.g., 192.168.1.50).
Step 3.1: Find Your Local IP Address
Windows: Open Command Prompt and run ipconfig. Look for "IPv4 Address" under your active network adapter.
macOS/Linux: Open Terminal and run ip addr show or ifconfig. Look for the inet address (usually starting with 192.168. or 10.).
Step 3.2: Regenerate Certificates for Your Local IP
You must include your local IP address in the mkcert generation so peer browsers trust the connection.
Replace 192.168.1.50 with your actual local IP:
bash

1
Restart the Nginx container to apply the new certificates:
bash

1
Step 3.3: Access from Peer Devices
On a peer device (e.g., a colleague's laptop or tablet), open a browser and navigate to:
👉 https://192.168.1.50 (replace with your host machine's actual IP).
⚠️ Handling Browser Security Warnings on Peer Devices
If the peer device has not installed the mkcert root CA, the browser will show a "Your connection is not private" warning. You have two options:
Option A: Install mkcert on Peer Devices (Recommended for Teams)
Copy the rootCA.pem file from your host machine. You can find its location by running mkcert -CAROOT on the host.
On the peer device, install mkcert and run mkcert -install.
Place the rootCA.pem file in the peer device's mkcert CAROOT directory (or manually install it into the OS's "Trusted Root Certification Authorities" store).
The browser will now trust https://192.168.1.50 without warnings.
Option B: Proceed Anyway (Quick & Dirty)
On Chrome/Edge: Click "Advanced" → "Proceed to 192.168.1.50 (unsafe)".
On Firefox: Click "Advanced" → "Accept the Risk and Continue".
(Note: Session cookies marked Secure will still function, but users will see a warning every time).
4. First-Time Administration
Once logged in as the default admin:
Change Your Password: Navigate to your profile settings and update your password to something unique.
Create Users: Go to the User Management section (Admin only) to create accounts for your peers.
Create a Project: Create your first project and invite your peers by adding them as project members.
5. Troubleshooting
Issue: Port 80 or 443 is already in use
Symptom: Docker Compose fails to start Nginx with a "port is already allocated" error.
Solution: Another service (like a local web server) is using the port. Change the host ports in docker-compose.yml:
yaml

123
Issue: "Session unavailable" or constant logouts
Symptom: You log in successfully but are immediately logged out, or API calls return 401 Unauthorized.
Solution: Ensure you are accessing the app via HTTPS (https://...), not HTTP. The session_id cookie is configured with the Secure flag, meaning browsers will reject it over plain HTTP.
Issue: File upload fails or attachments are missing
Symptom: Uploading a file returns a 500 error, or files disappear after restarting Docker.
Solution: Ensure the attachments Docker volume has the correct write permissions. On Linux, you may need to adjust the ownership of the mounted volume directory.
Issue: Database connection refused
Symptom: Quarkus backend logs show Connection refused to PostgreSQL.
Solution: The backend is trying to connect before PostgreSQL is fully ready. Restart the backend container: docker compose restart quarkus-app.
6. Stopping and Cleaning Up
To stop the application:
bash

1
To stop the application and delete all data (projects, users, attachments):
bash

1
⚠️ Warning: This will permanently delete the PostgreSQL database and all uploaded files. Use with caution!