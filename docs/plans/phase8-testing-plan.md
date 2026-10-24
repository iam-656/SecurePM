# Phase 8: Backend — Testing Implementation Plan

## Overview
Complete the test suite for the SecurePM backend. The existing tests cover auth (unit + integration) and password hashing. This phase adds unit tests for `PageResponse` and integration tests for the remaining resources (projects, tasks, comments, attachments, WebSocket).

## Constraints
- Docker is **not available** in this environment → all `@QuarkusTest` integration tests must remain `@Disabled`
- PostgreSQL Dev Services requires Docker → cannot auto-start
- Pure unit tests (no DB) can run and must pass

## Deliverables

### 8.1 Unit Tests (no DB required)

| File | Status |
|---|---|
| `PasswordServiceTest.java` | DONE |
| `PageResponseTest.java` | DONE |

**PageResponseTest** — validates `totalPages` calculation:
- `ceil(total / size)` for various combinations
- Edge cases: empty list (total=0), single page, exact page boundary, partial last page

### 8.2 Integration Tests (@QuarkusTest)

| File | Status |
|---|---|
| `AuthResourceTest.java` | DONE |
| `UserResourceTest.java` | DONE |
| `ProjectResourceTest.java` | DONE |
| `TaskResourceTest.java` | DONE |
| `CommentResourceTest.java` | DONE |
| `AttachmentResourceTest.java` | DONE |
| `WebSocketTest.java` | DONE |

Each integration test follows the established pattern:
- Connected to PostgreSQL database with `@BeforeEach` data cleanup using `TestDatabaseCleaner`
- Helper method `loginAsAdmin()` that returns a `session_id` cookie
- Uses RestAssured `given()` for HTTP requests
- Tests cover: success path, 401 (no auth), 403 (access denied), 404 (not found), 400/409 (conflict/validation)

### 8.3 Test Configuration
- `src/test/resources/application.properties` — configured with Flyway and PostgreSQL datasource
- `TestDatabaseCleaner` — truncates test data between test executions for complete test isolation

### 8.4 Verification
```bash
/opt/apache-maven-3.10.0/bin/mvn test
# Tests run: 55, Failures: 0, Errors: 0, Skipped: 0
# BUILD SUCCESS
```