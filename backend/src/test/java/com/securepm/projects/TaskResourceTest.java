package com.securepm.projects;

import com.securepm.auth.dto.CreateUserRequest;
import com.securepm.auth.dto.LoginRequest;
import com.securepm.test.TestDatabaseCleaner;
import io.quarkus.test.junit.QuarkusTest;
import jakarta.inject.Inject;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

import static io.restassured.RestAssured.given;
import static org.hamcrest.Matchers.*;

@QuarkusTest
class TaskResourceTest {

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
                    name = "Task Test Project";
                    description = "desc";
                    projectKey = "TTP";
                }})
            .when()
                .post("/api/projects")
            .then()
                .statusCode(201)
                .extract()
                .jsonPath()
                .getLong("id");
    }

    @Test
    void createTaskReturns201() {
        String sessionId = loginAsAdmin();
        Long projectId = createProject(sessionId);

        CreateTaskRequest request = new CreateTaskRequest();
        request.title = "Test Task";
        request.description = "Task description";
        request.status = "TODO";
        request.priority = "MEDIUM";

        given()
                .cookie("session_id", sessionId)
                .contentType("application/json")
                .body(request)
            .when()
                .post("/api/projects/" + projectId + "/tasks")
            .then()
                .statusCode(201)
                .body("title", equalTo("Test Task"))
                .body("status", equalTo("TODO"))
                .body("version", equalTo(1));
    }

    @Test
    void createTaskWithoutAuthReturns401() {
        CreateTaskRequest request = new CreateTaskRequest();
        request.title = "No Auth Task";

        given()
                .contentType("application/json")
                .body(request)
            .when()
                .post("/api/projects/1/tasks")
            .then()
                .statusCode(401);
    }

    @Test
    void listTasksReturnsPaginatedResults() {
        String sessionId = loginAsAdmin();
        Long projectId = createProject(sessionId);

        given()
                .cookie("session_id", sessionId)
            .when()
                .get("/api/projects/" + projectId + "/tasks")
            .then()
                .statusCode(200)
                .body("items.size()", equalTo(0))
                .body("total", equalTo(0))
                .body("page", equalTo(0))
                .body("totalPages", equalTo(0));
    }

    @Test
    void getKanbanReturnsTasksGroupedByStatus() {
        String sessionId = loginAsAdmin();
        Long projectId = createProject(sessionId);

        given()
                .cookie("session_id", sessionId)
            .when()
                .get("/api/projects/" + projectId + "/tasks/kanban")
            .then()
                .statusCode(200);
    }

    @Test
    void getTaskReturnsDetails() {
        String sessionId = loginAsAdmin();
        Long projectId = createProject(sessionId);

        Long taskId = given()
                .cookie("session_id", sessionId)
                .contentType("application/json")
                .body(new CreateTaskRequest() {{
                    title = "Get Task";
                    description = "desc";
                    status = "TODO";
                    priority = "LOW";
                }})
            .when()
                .post("/api/projects/" + projectId + "/tasks")
            .then()
                .statusCode(201)
                .extract()
                .jsonPath()
                .getLong("id");

        given()
                .cookie("session_id", sessionId)
            .when()
                .get("/api/projects/" + projectId + "/tasks/" + taskId)
            .then()
                .statusCode(200)
                .body("title", equalTo("Get Task"))
                .body("version", equalTo(1));
    }

    @Test
    void updateTaskWithCorrectVersionReturns200() {
        String sessionId = loginAsAdmin();
        Long projectId = createProject(sessionId);

        Long taskId = given()
                .cookie("session_id", sessionId)
                .contentType("application/json")
                .body(new CreateTaskRequest() {{
                    title = "Update Task";
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

        UpdateTaskRequest update = new UpdateTaskRequest();
        update.title = "Updated Task";
        update.version = 1L;

        given()
                .cookie("session_id", sessionId)
                .contentType("application/json")
                .body(update)
            .when()
                .put("/api/projects/" + projectId + "/tasks/" + taskId)
            .then()
                .statusCode(200)
                .body("title", equalTo("Updated Task"))
                .body("version", equalTo(2));
    }

    @Test
    void updateTaskWithWrongVersionReturns409() {
        String sessionId = loginAsAdmin();
        Long projectId = createProject(sessionId);

        Long taskId = given()
                .cookie("session_id", sessionId)
                .contentType("application/json")
                .body(new CreateTaskRequest() {{
                    title = "Conflict Task";
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

        UpdateTaskRequest update = new UpdateTaskRequest();
        update.title = "Should Fail";
        update.version = 99L; // Wrong version

        given()
                .cookie("session_id", sessionId)
                .contentType("application/json")
                .body(update)
            .when()
                .put("/api/projects/" + projectId + "/tasks/" + taskId)
            .then()
                .statusCode(409);
    }

    @Test
    void deleteTaskReturns200() {
        String sessionId = loginAsAdmin();
        Long projectId = createProject(sessionId);

        Long taskId = given()
                .cookie("session_id", sessionId)
                .contentType("application/json")
                .body(new CreateTaskRequest() {{
                    title = "Delete Task";
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

        given()
                .cookie("session_id", sessionId)
            .when()
                .delete("/api/projects/" + projectId + "/tasks/" + taskId)
            .then()
                .statusCode(200);

        // Verify deleted
        given()
                .cookie("session_id", sessionId)
            .when()
                .get("/api/projects/" + projectId + "/tasks/" + taskId)
            .then()
                .statusCode(404);
    }
}