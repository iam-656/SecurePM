# Error 07 — WebSocket Closed Before Connection Established in useNotifications

## Error ID
`error_07`

## Date Encountered
2026-10-22

## Error Description
When opening the application or navigating while authenticated, the browser console logs the following warning/error:
```
useNotifications.ts:69 WebSocket connection to 'ws://localhost:5173/ws/notifications' failed: WebSocket is closed before the connection is established.
```

---

## Root Cause Analysis
1. **Calling `socket.close()` on Connecting Sockets**:
   - In `useNotifications.ts`, `cleanupSocket()` directly called `socket.close(1000, 'Cleanup')` without inspecting `socket.readyState`.
   - When a WebSocket is still in `WebSocket.CONNECTING` state (readyState 0), invoking `socket.close()` causes the browser to abort the TCP/HTTP upgrade handshake before it completes. The browser treats this as an aborted connection and emits an error in DevTools: `WebSocket is closed before the connection is established`, pointing directly to the invocation line (`useNotifications.ts:69`).
2. **React StrictMode / Lifecycle Effect Mounting**:
   - In Vite dev mode with React StrictMode, effects mount, unmount, and remount in rapid succession.
   - When `NotificationBell` mounts, `connectSocket()` creates `new WebSocket(...)`. The cleanup function runs almost immediately before the handshake completes.
   - Additionally, `connectSocket` was calling `cleanupSocket()` at the top of its execution without checking if an existing connection was already in progress or open.

---

## Required Resolution
1. **Safely Handle Connecting Sockets in `cleanupSocket`**:
   - Mirror the robust pattern from `useWebSocket.ts`:
     - If `socket.readyState === WebSocket.CONNECTING`: clear `onclose`, `onerror`, `onmessage`, and defer `socket.close(1000, 'Component unmounted')` until `socket.onopen` fires.
     - If `socket.readyState === WebSocket.OPEN`: close cleanly with code 1000.
     - If `socket.readyState === WebSocket.CLOSING` or `WebSocket.CLOSED`: do not attempt to close again.
2. **Prevent Redundant Reconnections**:
   - In `connectSocket()`, check if `wsRef.current` is already in `WebSocket.OPEN` or `WebSocket.CONNECTING` state; if so, skip re-opening to avoid tearing down healthy connections.
3. **Verify Build and Tests**:
   - Run `npm run lint && npm run build` and backend test suite `mvn test`.

---

## Status
- Documented: 2026-10-22T10:08:00+05:00
- Resolution: RESOLVED
- Updated At: 2026-10-22T10:10:00+05:00

---

## Resolution & Changes Made
1. **[ATTEMPT 1/3] Safe Socket State Handling in `cleanupSocket` (`useNotifications.ts`)**:
   - Replaced unconditional `socket.close(1000, 'Cleanup')` with readyState-guarded logic:
     - When `socket.readyState === WebSocket.CONNECTING`: removed `onclose` handler and deferred closing with code 1000 inside `socket.onopen = () => { socket.close(1000, 'Cleanup'); }`.
     - When `socket.readyState === WebSocket.OPEN`: closed cleanly with code 1000.
     - When in `CLOSING` or `CLOSED` state: ignored without re-triggering close.
   - Cleared error and message listeners to prevent spurious callbacks during teardown.
2. **[ATTEMPT 1/3] Connection De-duplication in `connectSocket` (`useNotifications.ts`)**:
   - Added guard checking `wsRef.current && (wsRef.current.readyState === WebSocket.OPEN || wsRef.current.readyState === WebSocket.CONNECTING)`.
   - Avoids tearing down and re-instantiating active or connecting WebSocket sessions during rapid re-renders or StrictMode cycles.
3. **Automated Verification**:
   - Frontend linting (`oxlint`): passed with 0 errors.
   - Frontend production build (`tsc -b && vite build`): passed with code 0 (`dist/assets/index-Ch5pA0TQ.js`).
   - Backend automated tests (`mvn test`): 72/72 tests passed (100% success).
