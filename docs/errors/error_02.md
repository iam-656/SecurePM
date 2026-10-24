# Error Report: Quarkus Multipart Extension and API Mismatch

## Error ID
`error_02`

## Date Encountered
2026-10-17

## Error Description
When implementing Phase 6 (Comments & Attachments), the `AttachmentResource.java` failed to compile due to two issues:

1. **Maven dependency**: `quarkus-resteasy-reactive-multipart:jar:3.40.0` not found in Maven Central
2. **Import/API mismatch**: `io.quarkus.resteasy.reactive.multipart.FileUpload` and `@RestFormParam` do not exist in Quarkus 3.40.0

### Compilation errors:
```
[ERROR] .../AttachmentResource.java:[5,46] package io.quarkus.resteasy.reactive.multipart does not exist
[ERROR] .../AttachmentResource.java:[32,61] cannot find symbol: class FileUpload
[ERROR] .../AttachmentResource.java:[32,39] cannot find symbol: class RestFormParam
```

## Root Cause

### Issue 1: Dependency name mismatch
In Quarkus 3.40.0, the extension `quarkus-resteasy-reactive-multipart` does not exist in Maven Central. The Quarkus BOM 3.40.0 manages `quarkus-resteasy-multipart` (without "reactive" in the name) at version 3.40.0. However, inspection of the `quarkus-resteasy-multipart:3.40.0` jar reveals it only provides `io/quarkus/resteasy/multipart/runtime/` classes (classic RESTEasy multipart), not the RESTEasy Reactive multipart classes.

The `FileUpload` class from `org.jboss.resteasy.reactive.multipart` is actually provided transitively by `resteasy-reactive-common` (through the dependency chain: `quarkus-rest-jackson` → `quarkus-rest` → `resteasy-reactive-vertx` → `resteasy-reactive` → `resteasy-reactive-common`).

### Issue 2: Wrong package and method names
The code used the package `io.quarkus.resteasy.reactive.multipart.FileUpload`, but the actual class is `org.jboss.resteasy.reactive.multipart.FileUpload`. Additionally:
- The annotation `@RestFormParam` does not exist; the correct annotation is `@RestForm` from `org.jboss.resteasy.reactive.RestForm`
- The `FileUpload` interface methods are `fileName()` and `uploadedFile()` (returning `Path`), not `getFileName()` and `getUploadFile()`

## Resolution (Final — corrected)

### Attempt 1/3
Changed `quarkus-resteasy-reactive-multipart` to `quarkus-resteasy-multipart` (BOM-managed at 3.40.0). Compiled successfully, but the user identified this as the **Classic RESTEasy** stack — it depends on `quarkus-resteasy` (classic) and would conflict with the reactive stack (`quarkus-rest-jackson`). This was the wrong fix.

### Attempt 2/3
Changed to `quarkus-rest-multipart` (the reactive extension name). Maven failed: the artifact does not exist in Maven Central (HTTP 404) and is not managed by the Quarkus BOM 3.40.0. This name does not exist in Quarkus 3.x.

### Attempt 3/3 — Correct Fix
**Removed the multipart dependency entirely from `pom.xml`.** In Quarkus 3.x, multipart support for the reactive stack is built directly into `quarkus-rest-jackson` (transitively via `quarkus-rest` → `resteasy-reactive-vertx` → `resteasy-reactive` → `resteasy-reactive-common`, which provides `org.jboss.resteasy.reactive.multipart.FileUpload` and `org.jboss.resteasy.reactive.RestForm`). No separate extension is needed.

1. **pom.xml**: Deleted the multipart dependency block entirely.
2. **AttachmentResource.java imports**: 
   - `io.quarkus.resteasy.reactive.multipart.FileUpload` → `org.jboss.resteasy.reactive.multipart.FileUpload`
   - Added `import org.jboss.resteasy.reactive.RestForm`
3. **AttachmentResource.java API calls**:
   - `@RestFormParam("file")` → `@RestForm("file")`
   - `file.getFileName()` → `file.fileName()`
   - `file.getUploadFile()` → `file.uploadedFile().toFile()`

## Files Changed
- `backend/pom.xml` — removed multipart extension entirely (not needed)
- `backend/src/main/java/com/securepm/attachments/AttachmentResource.java` — fixed imports and API calls

## Verification
- `mvn compile` → BUILD SUCCESS (45 source files)
- `mvn test` → 5 pass, 12 skipped, BUILD SUCCESS
