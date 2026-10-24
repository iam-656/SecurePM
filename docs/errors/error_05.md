# Error 05 — WebSocket Connection Closed Before Established (Code 4001: Authentication Required)

## Summary
When navigating to a project page in the browser (e.g. `/projects/4`), the project header renders the real-time status badge as `Offline`, and the browser developer console reports:
```
WebSocket connection to 'ws://localhost:5173/ws/projects/4' failed: WebSocket is closed before the connection is established. useWebSocket.ts:58
```

---

## Root Cause Analysis
1. In the browser, navigating to `/projects/:id` mounts the `ProjectPage` component which invokes `useWebSocket({ projectId: 4, ... })`.
2. The browser initiates a WebSocket upgrade handshake with the backend via `ws://localhost:5173/ws/projects/4` (proxied by Vite to `http://localhost:8080/ws/projects/4`).
3. While the HTTP upgrade request returns `101 Switching Protocols`, immediately after the upgrade the server's `ProjectWebSocket.onOpen` handler was failing authentication and closing the WebSocket with custom close code `4001` and reason `"Authentication required"`.
4. **Backend Cause**:
   - `ProjectWebSocket.java` attempted to inject and access `RoutingContext routingContext`.
   - In `quarkus-websockets-next`, the initial HTTP upgrade request finishes before WebSocket connection callbacks execute. Consequently, `CurrentVertxRequest.getCurrent()` returns `null`, causing `routingContext.session()` to throw:
     ```
     jakarta.enterprise.inject.IllegalProductException: Normal scoped producer method may not return null: io.quarkus.vertx.http.runtime.CurrentVertxRequest.getCurrent()
     ```
   - This caught exception caused `ProjectWebSocket.onOpen` to immediately invoke:
     ```java
     connection.closeAndAwait(new CloseReason(4001, "Authentication required"));
     ```
5. **Frontend Cause**:
   - In `frontend/src/hooks/useWebSocket.ts`, React development mode (`StrictMode`) mounts and immediately cleans up effects.
   - When calling `socket.close(1000)` while the WebSocket state was still `WebSocket.CONNECTING`, Chromium prints:
     `WebSocket connection to '...' failed: WebSocket is closed before the connection is established.`
   - In combination with the backend 4001 closure on reconnection, the WebSocket was never able to establish an `OPEN` state, permanently showing `Offline`.

---

## Resolution & Changes Made
1. **[ATTEMPT 1/3] Backend Session Store & Handshake Authentication**:
   - **`backend/src/main/java/com/securepm/auth/SessionConfig.java`**:
     - Produced `SessionStore` as a CDI `@Singleton` bean (`sessionStore(Vertx vertx)`).
     - Used this shared store in `SessionHandler.create(store)` so all HTTP and WebSocket layers share the exact same Vert.x session store.
   - **`backend/src/main/java/com/securepm/realtime/ProjectWebSocket.java`**:
     - Replaced `RoutingContext` with `@Inject SessionStore sessionStore`.
     - Annotated `@OnOpen` with `@Blocking` to safely execute blocking user checks (`User.findById`) off the Vert.x event loop.
     - Extracted session cookie (`session_id`) from `connection.handshakeRequest().header("cookie")` (with query parameter fallback).
     - Retrieved active session via `sessionStore.get(sessionId)` and verified `userId`, user active status, and project membership.
     - Renewed session access timestamp (`session.setAccessed()`).
2. **[ATTEMPT 1/3] Frontend WebSocket Hook Cleanup Refinement**:
   - **`frontend/src/hooks/useWebSocket.ts`**:
     - Updated `cleanup()` to handle `socket.readyState === WebSocket.CONNECTING` by awaiting `socket.onopen` before calling `socket.close(1000, 'Component unmounted')`.
     - Prevents premature client-side socket teardown warnings in React development mode.

---

## Verification
1. **Live Proxy WebSocket Connection Test**:
   - Authenticated as `admin` via `POST /api/auth/login` on `http://localhost:5173`.
   - Upgraded WebSocket connection to `ws://localhost:5173/ws/projects/4` with `Cookie: session_id=...`.
   - Verified that the server did not emit code 4001; the WebSocket upgraded with HTTP 101 and remained open and active.
2. **Backend Automated Tests**:
   - Ran `mvn test -Dtest=WebSocketTest`.
   - Tests run: 2, Failures: 0, Errors: 0, Skipped: 0 (`BUILD SUCCESS`).
3. **Frontend Code Quality**:
   - Ran `npm run lint` (`oxlint`): **0 errors, 0 warnings** across 51 files.
   - Ran `npm run build` (`tsc -b && vite build`): **0 errors, 0 warnings**.
