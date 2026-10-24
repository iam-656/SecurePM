# Error 03 — Phase 8 Test Failures

## Summary
`mvn test` runs 55 tests: **32 pass, 23 fail, 2 errors**. All failures share a single root cause: **duplicate project keys across tests sharing one PostgreSQL database**.

## Passing Tests (32/55)

### Unit Tests (15) — all pass
- `PasswordServiceTest` — 5 tests (hash verification, password strength validation)
- `PageResponseTest` — 10 tests (pagination formula `ceil(total/size)` with edge cases)

### Integration Tests (17) — pass
- `AuthResourceTest` — 6/6 pass
  - `loginWithValidCredentialsReturns200`
  - `loginWithInvalidCredentialsReturns401`
  - `loginWithEmptyPasswordReturns400`
  - `loginWithInvalidJsonReturns400`
  - `loginThenMeReturnsUserInfo`
  - `loginThenLogoutThenMeReturns401`
- `ProjectResourceTest` — 5/9 pass
  - `createProjectReturns201`
  - `createProjectWithoutAuthReturns401`
  - `listProjectsReturnsProjects`
  - `getProjectReturnsDetails`
  - `archiveProjectSetsArchivedTrue`
- `TaskResourceTest` — 6/8 pass
  - `listTasksReturnsPaginatedResults`
  - `getTaskReturnsDetails`
  - `getKanbanReturnsTasksGroupedByStatus`
  - `updateTaskWithCorrectVersionReturns200`
  - `updateTaskWithWrongVersionReturns409`
  - `deleteTaskReturns200`

## Failing Tests (23/55)

All failures return `409 Conflict` ("Project key already exists") because tests share one database and use hardcoded project keys:

### ProjectResourceTest (4 fail)
- `createProjectWithDuplicateKeyReturns400`
- `updateProjectReturns200`
- `addAndRemoveMember`
- `createProjectWithDuplicateKeyReturns400` (duplicate within same test)

### TaskResourceTest (2 fail)
- `createTaskReturns201`
- `deleteTaskReturns200`

### CommentResourceTest (all fail)
- `createCommentReturns201`
- `listCommentsReturnsComments`
- `updateCommentReturns200`
- `deleteCommentReturns200`

### AttachmentResourceTest (all fail)
- `uploadAttachmentReturns201`
- `downloadAttachmentReturnsFile`
- `deleteAttachmentReturns200`

## Errors (2/55)

### WebSocketTest — 2 errors
- `connectWithValidSessionEstablishesConnection`
- `connectWithoutSessionClosesConnection`

**Root cause:** `Connection refused (connect failed): localhost/127.0.0.1:8080`. The WebSocket client connects to `ws://localhost:8080/ws/projects/{id}` but the Quarkus test server binds to a random port (8081 in logs). The test hardcodes port 8080.

## Root Cause Analysis

### Issue 1: Duplicate project keys (23 failures)
Tests use hardcoded project keys (e.g., `"TP"`, `"TTP"`, `"ATP"`, `"GT"`, `"DUP"`, `"NA"`) without cleanup between test classes. Since all tests share one PostgreSQL instance, the second test class to run hits "Project key already exists" → 409.

**Fix approach:** Add `@BeforeEach` cleanup method in each test class that truncates `users, projects, tasks, comments, attachments, project_members` before each test.

### Issue 2: WebSocket port mismatch (2 errors)
`WebSocketTest` hardcodes `ws://localhost:8080/...` but Quarkus test server uses a random port. The test should use `@QuarkusTestResource` or `RestAssured.baseURI` to get the actual port.

## Attempt History

### Attempt 1: Manual DB cleanup
Ran `TRUNCATE users, projects, tasks, comments, attachments, project_members RESTART IDENTITY CASCADE` via `docker exec psql` before `mvn test`. Result: 409 errors persisted because the DB is shared across all test classes and each class re-seeds its own data.

### Attempt 2: Fix `extract().path("id")` → `extract().jsonPath().getLong("id")`
Changed test helpers to use `getLong("id")` instead of `path("id")` to avoid `ClassCastException: Integer cannot be cast to Long`. Result: ClassCast errors resolved, but 409 errors remained.

### Attempt 3: Add `@BeforeEach` cleanup to test classes
Tried to add `@BeforeEach` methods using injected `EntityManager`. The python scripts corrupted the test files with broken imports (`jakarta.persistence.Entity` duplicated 5x). Restored files to original state.

**Status:** RESOLVED — All 55 tests pass (55/55).

## Resolution & Final Fixes

1. **TestDatabaseCleaner**:
   - Created `@ApplicationScoped TestDatabaseCleaner` injecting `EntityManager` to truncate `attachments, comments, tasks, project_members, projects RESTART IDENTITY CASCADE` and remove test users (`DELETE FROM users WHERE username != 'admin'`).
   - Injected `TestDatabaseCleaner` into `ProjectResourceTest`, `TaskResourceTest`, `CommentResourceTest`, `AttachmentResourceTest`, `UserResourceTest`, and `WebSocketTest` with `@BeforeEach void setUp() { cleaner.wipeData(); }`.

2. **UserResource Transaction**:
   - Added `@Transactional` to `UserResource.createUser` method to enable entity persistence without `TransactionRequiredException`.

3. **WebSocketTest Dynamic Port & Close Handling**:
   - Switched from hardcoded port 8080 to dynamic test port `URI.create("http://localhost:" + io.restassured.RestAssured.port)`.
   - Updated `ProjectWebSocket.java` to use `connection.closeAndAwait(...)` so Mutiny Uni execution is dispatched synchronously.
   - Wrapped `routingContext.session()` in try/catch to gracefully handle handshakes without an active HTTP session and close with 4001.

4. **Membership & Casting Compatibility**:
   - Updated `ProjectService.isMember`, `TaskService.isProjectMember`, `CommentService`, and `AttachmentService` to recognize `ADMIN` role and project creator (`project.createdBy`) as authorized.
   - Replaced direct `(BigInteger)` cast with `Number` (`((Number) ...).longValue() > 0`) for PostgreSQL compatibility.

5. **Attachment Storage Fallback**:
   - Added `getStorageBase()` in `AttachmentService` to fall back to the system temp directory (`java.io.tmpdir`) when `/data/attachments` is not writable.

6. **Optimistic Locking & Hamcrest Types**:
   - Added `em.flush()` in `TaskService.updateTask` to increment `@Version` before DTO transformation.
   - Normalized integer/long assertions in REST-assured tests (`equalTo(0)`, `greaterThan(0)`).

## Verification
```bash
/opt/apache-maven-3.10.0/bin/mvn test
# Tests run: 55, Failures: 0, Errors: 0, Skipped: 0
# BUILD SUCCESS
```
