package com.securepm.comments;

import com.securepm.auth.dto.CreateUserRequest;
import com.securepm.auth.dto.LoginRequest;
import com.securepm.projects.CreateProjectRequest;
import com.securepm.projects.CreateTaskRequest;
import com.securepm.test.TestDatabaseCleaner;
import io.quarkus.test.junit.QuarkusTest;
import jakarta.inject.Inject;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

import static io.restassured.RestAssured.given;
import static org.hamcrest.Matchers.*;

@QuarkusTest
class CommentResourceTest {

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
                    name = "Comment Test Project";
                    description = "desc";
                    projectKey = "CTP";
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
                    title = "Comment Task";
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

    @Test
    void createCommentReturns201() {
        String sessionId = loginAsAdmin();
        Long projectId = createProject(sessionId);
        Long taskId = createTask(sessionId, projectId);

        CreateCommentRequest request = new CreateCommentRequest();
        request.content = "Test comment";

        given()
                .cookie("session_id", sessionId)
                .queryParam("projectId", projectId)
                .contentType("application/json")
                .body(request)
            .when()
                .post("/api/tasks/" + taskId + "/comments")
            .then()
                .statusCode(201)
                .body("content", equalTo("Test comment"))
                .body("authorName", equalTo("System Administrator"));
    }

    @Test
    void createCommentWithoutAuthReturns401() {
        CreateCommentRequest request = new CreateCommentRequest();
        request.content = "No auth";

        given()
                .queryParam("projectId", 1)
                .contentType("application/json")
                .body(request)
            .when()
                .post("/api/tasks/1/comments")
            .then()
                .statusCode(401);
    }

    @Test
    void listCommentsReturnsComments() {
        String sessionId = loginAsAdmin();
        Long projectId = createProject(sessionId);
        Long taskId = createTask(sessionId, projectId);

        // Create a comment first
        CreateCommentRequest request = new CreateCommentRequest();
        request.content = "List test";

        given()
                .cookie("session_id", sessionId)
                .queryParam("projectId", projectId)
                .contentType("application/json")
                .body(request)
            .when()
                .post("/api/tasks/" + taskId + "/comments")
            .then()
                .statusCode(201);

        // List comments
        given()
                .cookie("session_id", sessionId)
                .queryParam("projectId", projectId)
            .when()
                .get("/api/tasks/" + taskId + "/comments")
            .then()
                .statusCode(200)
                .body("size()", greaterThanOrEqualTo(1))
                .body("[0].content", equalTo("List test"));
    }

    @Test
    void updateCommentReturns200() {
        String sessionId = loginAsAdmin();
        Long projectId = createProject(sessionId);
        Long taskId = createTask(sessionId, projectId);

        Long commentId = given()
                .cookie("session_id", sessionId)
                .queryParam("projectId", projectId)
                .contentType("application/json")
                .body(new CreateCommentRequest() {{
                    content = "Original";
                }})
            .when()
                .post("/api/tasks/" + taskId + "/comments")
            .then()
                .statusCode(201)
                .extract()
                .jsonPath()
                .getLong("id");

        UpdateCommentRequest update = new UpdateCommentRequest();
        update.content = "Updated comment";

        given()
                .cookie("session_id", sessionId)
                .queryParam("projectId", projectId)
                .contentType("application/json")
                .body(update)
            .when()
                .put("/api/tasks/" + taskId + "/comments/" + commentId)
            .then()
                .statusCode(200)
                .body("content", equalTo("Updated comment"));
    }

    @Test
    void deleteCommentReturns200() {
        String sessionId = loginAsAdmin();
        Long projectId = createProject(sessionId);
        Long taskId = createTask(sessionId, projectId);

        Long commentId = given()
                .cookie("session_id", sessionId)
                .queryParam("projectId", projectId)
                .contentType("application/json")
                .body(new CreateCommentRequest() {{
                    content = "To delete";
                }})
            .when()
                .post("/api/tasks/" + taskId + "/comments")
            .then()
                .statusCode(201)
                .extract()
                .jsonPath()
                .getLong("id");

        given()
                .cookie("session_id", sessionId)
                .queryParam("projectId", projectId)
            .when()
                .delete("/api/tasks/" + taskId + "/comments/" + commentId)
            .then()
                .statusCode(200);
    }
}