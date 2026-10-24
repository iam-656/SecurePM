package com.securepm.attachments;

import com.securepm.auth.dto.LoginRequest;
import com.securepm.projects.CreateProjectRequest;
import com.securepm.projects.CreateTaskRequest;
import com.securepm.test.TestDatabaseCleaner;
import io.quarkus.test.junit.QuarkusTest;
import jakarta.inject.Inject;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

import java.io.File;
import java.nio.file.Files;
import java.nio.file.Path;

import static io.restassured.RestAssured.given;
import static org.hamcrest.Matchers.*;

@QuarkusTest
class AttachmentResourceTest {

    @Inject
    TestDatabaseCleaner cleaner;

    @BeforeEach
    void setUp() {
        cleaner.wipeData();
    }

    private String loginAsAdmin() {
        return given()
                .contentType("application/json")
                .body(new LoginRequest() {{
                    username = "admin";
                    password = "ChangeMeNow123!";
                }})
            .when()
                .post("/api/auth/login")
            .then()
                .statusCode(200)
                .extract()
                .cookie("session_id");
    }

    private Long createProject(String sessionId) {
        return given()
                .cookie("session_id", sessionId)
                .contentType("application/json")
                .body(new CreateProjectRequest() {{
                    name = "Attachment Test Project";
                    description = "desc";
                    projectKey = "ATP";
                }})
            .when()
                .post("/api/projects")
            .then()
                .statusCode(201)
                .extract()
                .jsonPath()
                .getLong("id");
    }

    private Long createTask(String sessionId, Long projectId) {
        return given()
                .cookie("session_id", sessionId)
                .contentType("application/json")
                .body(new CreateTaskRequest() {{
                    title = "Attachment Task";
                    description = "desc";
                    status = "TODO";
                    priority = "MEDIUM";
                }})
            .when()
                .post("/api/projects/" + projectId + "/tasks")
            .then()
                .statusCode(201)
                .extract()
                .jsonPath()
                .getLong("id");
    }

    private File createTempFile() throws Exception {
        Path tempDir = Files.createTempDirectory("test-attach-dir");
        Path file = tempDir.resolve("test-attachment.txt");
        Files.writeString(file, "Test file content");
        return file.toFile();
    }

    @Test
    void uploadAttachmentReturns201() throws Exception {
        String sessionId = loginAsAdmin();
        Long projectId = createProject(sessionId);
        Long taskId = createTask(sessionId, projectId);
        File file = createTempFile();

        given()
                .cookie("session_id", sessionId)
                .queryParam("projectId", projectId)
                .multiPart("file", file, "text/plain")
            .when()
                .post("/api/tasks/" + taskId + "/attachments")
            .then()
                .statusCode(201)
                .body("originalName", equalTo("test-attachment.txt"))
                .body("fileSize", greaterThan(0));
    }

    @Test
    void uploadAttachmentWithoutAuthReturns401() throws Exception {
        File file = createTempFile();

        given()
                .queryParam("projectId", 1)
                .multiPart("file", file, "text/plain")
            .when()
                .post("/api/tasks/1/attachments")
            .then()
                .statusCode(401);
    }

    @Test
    void listAttachmentsReturnsAttachments() throws Exception {
        String sessionId = loginAsAdmin();
        Long projectId = createProject(sessionId);
        Long taskId = createTask(sessionId, projectId);
        File file = createTempFile();

        // Upload
        given()
                .cookie("session_id", sessionId)
                .queryParam("projectId", projectId)
                .multiPart("file", file, "text/plain")
            .when()
                .post("/api/tasks/" + taskId + "/attachments")
            .then()
                .statusCode(201);

        // List
        given()
                .cookie("session_id", sessionId)
                .queryParam("projectId", projectId)
            .when()
                .get("/api/tasks/" + taskId + "/attachments")
            .then()
                .statusCode(200)
                .body("size()", greaterThanOrEqualTo(1));
    }

    @Test
    void deleteAttachmentReturns200() throws Exception {
        String sessionId = loginAsAdmin();
        Long projectId = createProject(sessionId);
        Long taskId = createTask(sessionId, projectId);
        File file = createTempFile();

        Long attachmentId = given()
                .cookie("session_id", sessionId)
                .queryParam("projectId", projectId)
                .multiPart("file", file, "text/plain")
            .when()
                .post("/api/tasks/" + taskId + "/attachments")
            .then()
                .statusCode(201)
                .extract()
                .jsonPath()
                .getLong("id");

        given()
                .cookie("session_id", sessionId)
                .queryParam("projectId", projectId)
            .when()
                .delete("/api/tasks/" + taskId + "/attachments/" + attachmentId)
            .then()
                .statusCode(200);
    }
}