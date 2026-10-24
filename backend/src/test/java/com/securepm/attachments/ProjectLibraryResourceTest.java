package com.securepm.attachments;

import com.securepm.auth.dto.CreateUserRequest;
import com.securepm.auth.dto.LoginRequest;
import com.securepm.projects.CreateProjectRequest;
import com.securepm.projects.CreateTaskRequest;
import com.securepm.projects.ProjectDTO;
import com.securepm.test.TestDatabaseCleaner;
import io.quarkus.test.junit.QuarkusTest;
import jakarta.inject.Inject;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

import java.io.File;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.List;

import static io.restassured.RestAssured.given;
import static org.hamcrest.Matchers.*;
import static org.junit.jupiter.api.Assertions.*;

@QuarkusTest
class ProjectLibraryResourceTest {

    @Inject
    TestDatabaseCleaner cleaner;

    @BeforeEach
    void setUp() {
        cleaner.wipeData();
    }

    private String login(String username, String password) {
        LoginRequest req = new LoginRequest();
        req.username = username;
        req.password = password;
        return given()
                .contentType("application/json")
                .body(req)
            .when()
                .post("/api/auth/login")
            .then()
                .statusCode(200)
                .extract()
                .cookie("session_id");
    }

    private String loginAsAdmin() {
        return login("admin", "ChangeMeNow123!");
    }

    private Long createUser(String sessionId, String username, String role) {
        CreateUserRequest req = new CreateUserRequest();
        req.username = username;
        req.email = username + "@pm.local";
        req.fullName = username.toUpperCase() + " Full";
        req.password = "UserPass123!";
        req.role = role;

        return given()
                .cookie("session_id", sessionId)
                .contentType("application/json")
                .body(req)
            .when()
                .post("/api/users")
            .then()
                .statusCode(201)
                .extract()
                .jsonPath()
                .getLong("id");
    }

    private static int keyCounter = 100;

    private Long createProject(String sessionId, String name, Long parentProjectId, Long leadId) {
        CreateProjectRequest req = new CreateProjectRequest();
        req.name = name;
        req.description = "Test Description";
        req.projectKey = "K" + (keyCounter++);
        req.parentProjectId = parentProjectId;
        req.leadId = leadId;

        return given()
                .cookie("session_id", sessionId)
                .contentType("application/json")
                .body(req)
            .when()
                .post("/api/projects")
            .then()
                .statusCode(201)
                .extract()
                .jsonPath()
                .getLong("id");
    }

    private Long createTask(String sessionId, Long projectId, String title) {
        CreateTaskRequest req = new CreateTaskRequest();
        req.title = title;
        req.description = "desc";
        req.status = "TODO";
        req.priority = "MEDIUM";

        return given()
                .cookie("session_id", sessionId)
                .contentType("application/json")
                .body(req)
            .when()
                .post("/api/projects/" + projectId + "/tasks")
            .then()
                .statusCode(201)
                .extract()
                .jsonPath()
                .getLong("id");
    }

    private File createTempFile(String fileName, String content) throws Exception {
        Path tempDir = Files.createTempDirectory("test-library-dir");
        Path file = tempDir.resolve(fileName);
        Files.writeString(file, content);
        return file.toFile();
    }

    @Test
    void directLibraryUploadAndListTest() throws Exception {
        String adminSession = loginAsAdmin();
        Long projectId = createProject(adminSession, "Library Main", null, null);

        File testFile = createTempFile("specs.pdf", "Project Specifications Content");

        // 1. Direct upload to library
        Integer fileId = given()
                .cookie("session_id", adminSession)
                .multiPart("file", testFile, "application/pdf")
            .when()
                .post("/api/projects/" + projectId + "/library")
            .then()
                .statusCode(201)
                .body("originalName", equalTo("specs.pdf"))
                .body("projectId", equalTo(projectId.intValue()))
                .body("taskId", nullValue())
                .body("uploadedByName", notNullValue())
                .extract()
                .jsonPath()
                .getInt("id");

        // 2. List library files
        given()
                .cookie("session_id", adminSession)
            .when()
                .get("/api/projects/" + projectId + "/library")
            .then()
                .statusCode(200)
                .body("size()", equalTo(1))
                .body("[0].id", equalTo(fileId))
                .body("[0].originalName", equalTo("specs.pdf"));

        // 3. Download/metadata check
        given()
                .cookie("session_id", adminSession)
            .when()
                .get("/api/projects/" + projectId + "/library/" + fileId + "/download")
            .then()
                .statusCode(200)
                .body("originalName", equalTo("specs.pdf"));
    }

    @Test
    void taskAttachmentsAppearInLibraryTest() throws Exception {
        String adminSession = loginAsAdmin();
        Long projectId = createProject(adminSession, "Task Attachment Project", null, null);
        Long taskId = createTask(adminSession, projectId, "Initial Requirements");

        File file = createTempFile("requirements.docx", "Requirements Document");

        // Upload to task
        given()
                .cookie("session_id", adminSession)
                .queryParam("projectId", projectId)
                .multiPart("file", file, "application/vnd.openxmlformats-officedocument.wordprocessingml.document")
            .when()
                .post("/api/tasks/" + taskId + "/attachments")
            .then()
                .statusCode(201)
                .body("originalName", equalTo("requirements.docx"));

        // Verify it automatically appears in the project library with taskTitle
        given()
                .cookie("session_id", adminSession)
            .when()
                .get("/api/projects/" + projectId + "/library")
            .then()
                .statusCode(200)
                .body("size()", equalTo(1))
                .body("[0].originalName", equalTo("requirements.docx"))
                .body("[0].taskId", equalTo(taskId.intValue()))
                .body("[0].taskTitle", equalTo("Initial Requirements"));
    }

    @Test
    void hierarchyIsolationTest() throws Exception {
        String adminSession = loginAsAdmin();
        Long parentId = createProject(adminSession, "Parent Project", null, null);
        Long subId = createProject(adminSession, "Child Subproject", parentId, null);

        File parentFile = createTempFile("parent-roadmap.pdf", "Parent Roadmap");
        File subFile = createTempFile("subproject-notes.txt", "Subproject notes");

        // Upload in parent library
        given()
                .cookie("session_id", adminSession)
                .multiPart("file", parentFile, "application/pdf")
            .when()
                .post("/api/projects/" + parentId + "/library")
            .then()
                .statusCode(201);

        // Upload in subproject library
        given()
                .cookie("session_id", adminSession)
                .multiPart("file", subFile, "text/plain")
            .when()
                .post("/api/projects/" + subId + "/library")
            .then()
                .statusCode(201);

        // Parent library should ONLY have parent file
        given()
                .cookie("session_id", adminSession)
            .when()
                .get("/api/projects/" + parentId + "/library")
            .then()
                .statusCode(200)
                .body("size()", equalTo(1))
                .body("[0].originalName", equalTo("parent-roadmap.pdf"));

        // Subproject library should ONLY have subproject file
        given()
                .cookie("session_id", adminSession)
            .when()
                .get("/api/projects/" + subId + "/library")
            .then()
                .statusCode(200)
                .body("size()", equalTo(1))
                .body("[0].originalName", equalTo("subproject-notes.txt"));
    }

    @Test
    void forwardingAuthorityAndProvenanceTest() throws Exception {
        String adminSession = loginAsAdmin();
        Long memberUserId = createUser(adminSession, "reguser", "USER");
        String memberSession = login("reguser", "UserPass123!");

        Long parentId = createProject(adminSession, "Alpha Parent", null, null);
        Long subId1 = createProject(adminSession, "Beta Sub1", parentId, null);
        Long subId2 = createProject(adminSession, "Gamma Sub2", parentId, null);

        // Enroll reguser in parent project as member via direct native query to simulate accepted invite
        cleaner.wipeProjectData();
        // recreate
        adminSession = loginAsAdmin();
        memberUserId = createUser(adminSession, "reguser", "USER");
        memberSession = login("reguser", "UserPass123!");
        parentId = createProject(adminSession, "Alpha Parent", null, null);
        subId1 = createProject(adminSession, "Beta Sub1", parentId, null);
        subId2 = createProject(adminSession, "Gamma Sub2", parentId, null);

        File file = createTempFile("architecture.png", "Image bytes");
        Integer fileId = given()
                .cookie("session_id", adminSession)
                .multiPart("file", file, "image/png")
            .when()
                .post("/api/projects/" + parentId + "/library")
            .then()
                .statusCode(201)
                .extract()
                .jsonPath()
                .getInt("id");

        // 1. Regular user (not member of project) cannot forward
        given()
                .cookie("session_id", memberSession)
                .contentType("application/json")
                .body(new ForwardAttachmentRequest(List.of(subId1)))
            .when()
                .post("/api/projects/" + parentId + "/library/" + fileId + "/forward")
            .then()
                .statusCode(403);

        // 2. Admin checks forward targets
        given()
                .cookie("session_id", adminSession)
            .when()
                .get("/api/projects/" + parentId + "/library/" + fileId + "/targets")
            .then()
                .statusCode(200)
                .body("size()", equalTo(2))
                .body("find { it.id == " + subId1 + " }.alreadyForwarded", equalTo(false));

        // 3. Admin forwards file to both subprojects
        given()
                .cookie("session_id", adminSession)
                .contentType("application/json")
                .body(new ForwardAttachmentRequest(List.of(subId1, subId2)))
            .when()
                .post("/api/projects/" + parentId + "/library/" + fileId + "/forward")
            .then()
                .statusCode(200)
                .body("size()", equalTo(2))
                .body("[0].isForwarded", equalTo(true))
                .body("[0].sourceProjectId", equalTo(parentId.intValue()))
                .body("[0].sourceProjectName", equalTo("Alpha Parent"))
                .body("[0].forwardedByName", notNullValue());

        // 4. Verify subproject 1 has the forwarded file with provenance
        given()
                .cookie("session_id", adminSession)
            .when()
                .get("/api/projects/" + subId1 + "/library")
            .then()
                .statusCode(200)
                .body("size()", equalTo(1))
                .body("[0].originalName", equalTo("architecture.png"))
                .body("[0].isForwarded", equalTo(true))
                .body("[0].sourceProjectName", equalTo("Alpha Parent"));

        // 5. Check targets again -> now both subprojects show alreadyForwarded == true
        given()
                .cookie("session_id", adminSession)
            .when()
                .get("/api/projects/" + parentId + "/library/" + fileId + "/targets")
            .then()
                .statusCode(200)
                .body("find { it.id == " + subId1 + " }.alreadyForwarded", equalTo(true))
                .body("find { it.id == " + subId2 + " }.alreadyForwarded", equalTo(true));
    }

    @Test
    void filteringAndSortingTest() throws Exception {
        String adminSession = loginAsAdmin();
        Long projectId = createProject(adminSession, "Filter Project", null, null);

        File f1 = createTempFile("diagram.png", "PNG Content");
        File f2 = createTempFile("manual.pdf", "PDF Manual");
        File f3 = createTempFile("backup.zip", "ZIP Archive");

        given().cookie("session_id", adminSession).multiPart("file", f1, "image/png")
                .post("/api/projects/" + projectId + "/library").then().statusCode(201);
        given().cookie("session_id", adminSession).multiPart("file", f2, "application/pdf")
                .post("/api/projects/" + projectId + "/library").then().statusCode(201);
        given().cookie("session_id", adminSession).multiPart("file", f3, "application/zip")
                .post("/api/projects/" + projectId + "/library").then().statusCode(201);

        // Search filter
        given()
                .cookie("session_id", adminSession)
                .queryParam("search", "diagram")
            .when()
                .get("/api/projects/" + projectId + "/library")
            .then()
                .statusCode(200)
                .body("size()", equalTo(1))
                .body("[0].originalName", equalTo("diagram.png"));

        // FileType filter: document
        given()
                .cookie("session_id", adminSession)
                .queryParam("fileType", "document")
            .when()
                .get("/api/projects/" + projectId + "/library")
            .then()
                .statusCode(200)
                .body("size()", equalTo(1))
                .body("[0].originalName", equalTo("manual.pdf"));

        // FileType filter: archive
        given()
                .cookie("session_id", adminSession)
                .queryParam("fileType", "archive")
            .when()
                .get("/api/projects/" + projectId + "/library")
            .then()
                .statusCode(200)
                .body("size()", equalTo(1))
                .body("[0].originalName", equalTo("backup.zip"));

        // Sort by name_asc
        given()
                .cookie("session_id", adminSession)
                .queryParam("sortBy", "name_asc")
            .when()
                .get("/api/projects/" + projectId + "/library")
            .then()
                .statusCode(200)
                .body("size()", equalTo(3))
                .body("[0].originalName", equalTo("backup.zip"))
                .body("[1].originalName", equalTo("diagram.png"))
                .body("[2].originalName", equalTo("manual.pdf"));
    }

    @Test
    void completedProjectReadOnlyGuardsTest() throws Exception {
        String adminSession = loginAsAdmin();
        Long projectId = createProject(adminSession, "Completion Test", null, null);

        File f = createTempFile("doc.txt", "text");
        Integer fileId = given().cookie("session_id", adminSession).multiPart("file", f, "text/plain")
                .post("/api/projects/" + projectId + "/library").then().statusCode(201)
                .extract().jsonPath().getInt("id");

        // Complete project
        given()
                .cookie("session_id", adminSession)
            .when()
                .post("/api/projects/" + projectId + "/complete")
            .then()
                .statusCode(200);

        // 1. Direct upload is rejected
        given()
                .cookie("session_id", adminSession)
                .multiPart("file", f, "text/plain")
            .when()
                .post("/api/projects/" + projectId + "/library")
            .then()
                .statusCode(400)
                .body("error", containsString("completed"));

        // 2. Delete is rejected
        given()
                .cookie("session_id", adminSession)
            .when()
                .delete("/api/projects/" + projectId + "/library/" + fileId)
            .then()
                .statusCode(400)
                .body("error", containsString("completed"));

        // 3. Download continues to work!
        given()
                .cookie("session_id", adminSession)
            .when()
                .get("/api/projects/" + projectId + "/library/" + fileId + "/download")
            .then()
                .statusCode(200)
                .body("originalName", equalTo("doc.txt"));
    }

    @Test
    void referenceCountedDeletionPreservesSharedFileTest() throws Exception {
        String adminSession = loginAsAdmin();
        Long parentId = createProject(adminSession, "Ref Parent", null, null);
        Long subId = createProject(adminSession, "Ref Sub", parentId, null);

        File f = createTempFile("shared.txt", "Shared content");
        Integer parentFileId = given().cookie("session_id", adminSession).multiPart("file", f, "text/plain")
                .post("/api/projects/" + parentId + "/library").then().statusCode(201)
                .extract().jsonPath().getInt("id");

        // Forward to subproject
        List<Integer> forwarded = given()
                .cookie("session_id", adminSession)
                .contentType("application/json")
                .body(new ForwardAttachmentRequest(List.of(subId)))
            .when()
                .post("/api/projects/" + parentId + "/library/" + parentFileId + "/forward")
            .then()
                .statusCode(200)
                .extract()
                .jsonPath()
                .getList("id");

        Integer subFileId = forwarded.get(0);

        // Delete subproject's copy
        given()
                .cookie("session_id", adminSession)
            .when()
                .delete("/api/projects/" + subId + "/library/" + subFileId)
            .then()
                .statusCode(200);

        // Parent file should still exist and be downloadable
        given()
                .cookie("session_id", adminSession)
            .when()
                .get("/api/projects/" + parentId + "/library/" + parentFileId + "/download")
            .then()
                .statusCode(200)
                .body("originalName", equalTo("shared.txt"));

        // Now delete parent copy
        given()
                .cookie("session_id", adminSession)
            .when()
                .delete("/api/projects/" + parentId + "/library/" + parentFileId)
            .then()
                .statusCode(200);
    }
}
