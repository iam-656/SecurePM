# Plan 04 — Phase 8 Test Suite Completion

## Overview
Complete Phase 8 by fixing all failing tests and errors across the test suite (`mvn test`), ensuring clean execution of all 55 tests against the PostgreSQL database.

## Root Cause Analysis
1. **Database Isolation across Tests (409 Conflict)**:
   Integration tests (`ProjectResourceTest`, `TaskResourceTest`, `CommentResourceTest`, `AttachmentResourceTest`) share a single PostgreSQL database instance and use hardcoded project keys (`TP`, `TTP`, `CTP`, `ATP`, `DUP`, etc.). Without database cleanup between tests, subsequent test executions or test methods fail with `409 Conflict` ("Project key already exists").
2. **Missing Transaction in User Creation (500 Internal Server Error)**:
   `UserResource.createUser` lacks `@Transactional`, causing `user.persist()` to throw `TransactionRequiredException` and return HTTP 500 in `UserResourceTest`.
3. **Hardcoded WebSocket Port (Connection Refused)**:
   `WebSocketTest` connects to `http://localhost:8080`, but the Quarkus test runner assigns a random or configured test port (`RestAssured.port`, default 8081).
4. **Project Authorization & Hibernate Native Query Casts**:
   - `ProjectService.isMember`, `TaskService.isProjectMember`, `CommentService`, and `AttachmentService` cast native query results directly to `(BigInteger)`, which can cause `ClassCastException` with PostgreSQL (which returns `Long`).
   - Project creators and `ADMIN` users must be recognized as authorized members for task, comment, and attachment management, matching project creation flows in tests.

## Step-by-Step Implementation

### Step 1: Update TestDatabaseCleaner
Enhance `TestDatabaseCleaner` to:
- Truncate `attachments, comments, tasks, project_members, projects RESTART IDENTITY CASCADE`.
- Remove non-admin users: `DELETE FROM users WHERE username != 'admin'`.

### Step 2: Inject and Execute Cleanup in Test Classes
Add `@Inject TestDatabaseCleaner cleaner;` with `@BeforeEach` to:
- `ProjectResourceTest`
- `TaskResourceTest`
- `CommentResourceTest`
- `AttachmentResourceTest`
- `UserResourceTest`
- `WebSocketTest`

### Step 3: Fix UserResource.createUser
Add `@Transactional` to `UserResource.createUser` method to enable Panache entity persistence.

### Step 4: Fix WebSocketTest Port
Replace hardcoded `http://localhost:8080` with dynamic test URI using `URI.create("http://localhost:" + io.restassured.RestAssured.port)`.

### Step 5: Fix Native Query Result Casts and Project Authorization
- In `ProjectService`, `TaskService`, `CommentService`, and `AttachmentService`, cast `em.createNativeQuery("SELECT COUNT(*)...").getSingleResult()` to `Number` (`((Number) ...).longValue() > 0`).
- Ensure `isProjectMember` grants access to `ADMIN` and the project creator (`project.createdBy`).

### Step 6: Verification
Run `/opt/apache-maven-3.10.0/bin/mvn test` to verify all 55 tests pass cleanly.
Update `docs/plans/phase8-testing-plan.md` and error tracking documentation.
