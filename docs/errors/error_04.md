# Error 04 — Session Prematurely Expired During Project Creation (1.8s Timeout Bug)

## Summary
When logging in as `admin` in the browser, opening the "New Project" modal, filling out project fields, and clicking "Create Project", the user was immediately logged out and redirected to `/login`.

---

## Root Cause Analysis
1. In `frontend/src/api/client.ts`, an Axios response interceptor is configured to redirect any unauthorized request (`HTTP 401`) to `/login`.
2. When creating a project via `POST /api/projects`, the backend's `SessionAuthFilter` inspects the active Vert.x HTTP Session. If the session has expired or `userId` is missing, it returns `401 Unauthorized` with `{"error":"Invalid or expired session"}`.
3. In `backend/src/main/resources/application.properties`, the session timeout is configured as:
   ```properties
   quarkus.http.session.timeout=1800
   ```
   This configuration was designed to specify 1,800 seconds (30 minutes).
4. In `backend/src/main/java/com/securepm/auth/SessionConfig.java`:
   ```java
   handler.setSessionTimeout(
           ConfigProvider.getConfig().getValue("quarkus.http.session.timeout", Long.class));
   ```
   **The Bug**: Vert.x `SessionHandler.setSessionTimeout(long timeout)` expects the timeout in **milliseconds**, not seconds. Passing `1800` directly set the session lifetime to **1,800 milliseconds (1.8 seconds)**.
5. In automated integration tests (`mvn test`), test assertions run in under 50ms, so the 1.8s timeout was never exceeded in tests. But for human interaction in the browser, filling in form fields naturally took more than 1.8 seconds, causing Vert.x to expire the session before the form was submitted.

---

## Resolution & Changes Made
1. **[ATTEMPT 1/3] Backend Session Timeout Fix**:
   - Modified `backend/src/main/java/com/securepm/auth/SessionConfig.java`:
     ```java
     Long timeoutSeconds = ConfigProvider.getConfig().getOptionalValue("quarkus.http.session.timeout", Long.class).orElse(1800L);
     handler.setSessionTimeout(timeoutSeconds * 1000L);
     ```
     Converted timeout from seconds (`1800`) to milliseconds (`1,800,000L`), setting the true session lifetime to 30 minutes.
2. **Path Normalization**:
   - Updated `backend/src/main/java/com/securepm/auth/SessionAuthFilter.java` to check `path.startsWith("/api/auth/") || path.startsWith("api/auth/")` to avoid any leading-slash discrepancy.

---

## Verification
1. **Delayed Request Verification**:
   - Authenticated as `admin` via `POST /api/auth/login`.
   - Introduced a 3-second sleep (`sleep 3`) to simulate user form filling (surpassing the previous 1.8s timeout).
   - Executed `POST /api/projects` both directly on `http://localhost:8080` and through the Vite dev proxy on `http://localhost:5173`.
   - Result: Both requests returned `HTTP 201 Created` with valid project payloads (`id: 2`, `id: 3`).
2. **Frontend Quality**:
   - Ran `npm run lint` (`oxlint`): **0 errors, 0 warnings** across all 51 files.
   - Ran `npm run build` (`tsc -b && vite build`): **0 errors, 0 warnings**.

