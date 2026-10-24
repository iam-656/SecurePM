package com.securepm.projects;

import com.securepm.auth.dto.CreateUserRequest;
import com.securepm.auth.dto.LoginRequest;
import com.securepm.test.TestDatabaseCleaner;
import io.quarkus.test.junit.QuarkusTest;
import jakarta.inject.Inject;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

import java.util.Arrays;
import java.util.Collections;

import static io.restassured.RestAssured.given;
import static org.hamcrest.Matchers.*;

@QuarkusTest
class SubprojectDependencyTest {

    @Inject
    TestDatabaseCleaner cleaner;

    @BeforeEach
    void setUp() {
        cleaner.wipeData();
    }

    private String loginAsAdmin() {
        LoginRequest req = new LoginRequest();
        req.username = "admin";
        req.password = "ChangeMeNow123!";
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

    private String createUserAndLogin(String username, String adminSession) {
        CreateUserRequest req = new CreateUserRequest();
        req.username = username;
        req.email = username + "@securepm.local";
        req.password = "TestPass123!";
        req.fullName = "User " + username;
        req.role = "USER";

        given()
                .cookie("session_id", adminSession)
                .contentType("application/json")
                .body(req)
            .when()
                .post("/api/users")
            .then()
                .statusCode(201);

        LoginRequest loginReq = new LoginRequest();
        loginReq.username = username;
        loginReq.password = "TestPass123!";

        return given()
                .contentType("application/json")
                .body(loginReq)
            .when()
                .post("/api/auth/login")
            .then()
                .statusCode(200)
                .extract().cookie("session_id");
    }

    @Test
    void testFirstSubprojectDefaultsToNoDependency() {
        String adminSession = loginAsAdmin();

        // Create root project
        CreateProjectRequest rootReq = new CreateProjectRequest();
        rootReq.name = "Root Alpha";
        rootReq.projectKey = "RA";
        Long rootId = given()
                .cookie("session_id", adminSession)
                .contentType("application/json")
                .body(rootReq)
            .when()
                .post("/api/projects")
            .then()
                .statusCode(201)
                .extract().jsonPath().getLong("id");

        // Attempt to create first subproject with START_AFTER and arbitrary prereq
        CreateProjectRequest sub1Req = new CreateProjectRequest();
        sub1Req.name = "First Subproject";
        sub1Req.projectKey = "RA-S1";
        sub1Req.parentProjectId = rootId;
        sub1Req.dependencyType = "START_AFTER";
        sub1Req.prerequisiteIds = Collections.singletonList(9999L);

        given()
                .cookie("session_id", adminSession)
                .contentType("application/json")
                .body(sub1Req)
            .when()
                .post("/api/projects")
            .then()
                .statusCode(201)
                .body("dependencyType", equalTo("NO_DEPENDENCY"))
                .body("isBlocked", equalTo(false))
                .body("prerequisiteIds", empty());
    }

    @Test
    void testSequentialWorkflowExecutionGatingAndReopening() {
        String adminSession = loginAsAdmin();
        String mainCreatorSession = createUserAndLogin("maincreator", adminSession);

        // 1. Main creator creates root project
        CreateProjectRequest rootReq = new CreateProjectRequest();
        rootReq.name = "E-Commerce Suite";
        rootReq.projectKey = "ECS";
        Long rootId = given()
                .cookie("session_id", mainCreatorSession)
                .contentType("application/json")
                .body(rootReq)
            .when()
                .post("/api/projects")
            .then()
                .statusCode(201)
                .extract().jsonPath().getLong("id");

        // 2. Main creator creates Phase 1 (Foundation)
        CreateProjectRequest sub1Req = new CreateProjectRequest();
        sub1Req.name = "Phase 1 Backend";
        sub1Req.projectKey = "ECS-P1";
        sub1Req.parentProjectId = rootId;
        Long sub1Id = given()
                .cookie("session_id", mainCreatorSession)
                .contentType("application/json")
                .body(sub1Req)
            .when()
                .post("/api/projects")
            .then()
                .statusCode(201)
                .body("dependencyType", equalTo("NO_DEPENDENCY"))
                .body("isBlocked", equalTo(false))
                .extract().jsonPath().getLong("id");

        // 3. Main creator creates Phase 2 (Frontend) with START_AFTER Phase 1
        CreateProjectRequest sub2Req = new CreateProjectRequest();
        sub2Req.name = "Phase 2 Frontend";
        sub2Req.projectKey = "ECS-P2";
        sub2Req.parentProjectId = rootId;
        sub2Req.dependencyType = "START_AFTER";
        sub2Req.prerequisiteIds = Collections.singletonList(sub1Id);

        Long sub2Id = given()
                .cookie("session_id", mainCreatorSession)
                .contentType("application/json")
                .body(sub2Req)
            .when()
                .post("/api/projects")
            .then()
                .statusCode(201)
                .body("dependencyType", equalTo("START_AFTER"))
                .body("isBlocked", equalTo(true))
                .body("prerequisiteNames", hasItem("Phase 1 Backend"))
                .body("blockingPrerequisiteNames", hasItem("Phase 1 Backend"))
                .extract().jsonPath().getLong("id");

        // 4. Verify Task Creation is BLOCKED in Phase 2
        CreateTaskRequest taskReq = new CreateTaskRequest();
        taskReq.title = "Build UI components";
        given()
                .cookie("session_id", mainCreatorSession)
                .contentType("application/json")
                .body(taskReq)
            .when()
                .post("/api/projects/" + sub2Id + "/tasks")
            .then()
                .statusCode(400)
                .body("error", containsString("Prerequisite sub-projects have not been completed yet"));

        // 5. Verify Sub-project Completion is BLOCKED in Phase 2
        given()
                .cookie("session_id", mainCreatorSession)
            .when()
                .post("/api/projects/" + sub2Id + "/complete")
            .then()
                .statusCode(400)
                .body("error", containsString("Prerequisite sub-projects have not been completed yet"));

        // 6. Create and complete a task in Phase 1
        CreateTaskRequest taskP1Req = new CreateTaskRequest();
        taskP1Req.title = "Setup API";
        Long taskP1Id = given()
                .cookie("session_id", mainCreatorSession)
                .contentType("application/json")
                .body(taskP1Req)
            .when()
                .post("/api/projects/" + sub1Id + "/tasks")
            .then()
                .statusCode(201)
                .extract().jsonPath().getLong("id");

        // Mark task as DONE
        UpdateTaskRequest updateTaskP1 = new UpdateTaskRequest();
        updateTaskP1.status = "DONE";
        updateTaskP1.version = 1L;
        given()
                .cookie("session_id", mainCreatorSession)
                .contentType("application/json")
                .body(updateTaskP1)
            .when()
                .put("/api/projects/" + sub1Id + "/tasks/" + taskP1Id)
            .then()
                .statusCode(200);

        // 7. Complete Phase 1
        given()
                .cookie("session_id", mainCreatorSession)
            .when()
                .post("/api/projects/" + sub1Id + "/complete")
            .then()
                .statusCode(200)
                .body("completed", equalTo(true));

        // 8. Phase 2 should now be UNBLOCKED
        given()
                .cookie("session_id", mainCreatorSession)
            .when()
                .get("/api/projects/" + sub2Id)
            .then()
                .statusCode(200)
                .body("isBlocked", equalTo(false))
                .body("blockingPrerequisiteNames", empty());

        // 9. Task creation in Phase 2 now SUCCEEDS
        Long taskP2Id = given()
                .cookie("session_id", mainCreatorSession)
                .contentType("application/json")
                .body(taskReq)
            .when()
                .post("/api/projects/" + sub2Id + "/tasks")
            .then()
                .statusCode(201)
                .extract().jsonPath().getLong("id");

        // 10. Reopening Phase 1 RE-BLOCKS Phase 2
        given()
                .cookie("session_id", mainCreatorSession)
            .when()
                .post("/api/projects/" + sub1Id + "/reopen")
            .then()
                .statusCode(200)
                .body("completed", equalTo(false));

        // Check Phase 2 is blocked again
        given()
                .cookie("session_id", mainCreatorSession)
            .when()
                .get("/api/projects/" + sub2Id)
            .then()
                .statusCode(200)
                .body("isBlocked", equalTo(true))
                .body("blockingPrerequisiteNames", hasItem("Phase 1 Backend"));

        // Task status change in Phase 2 is now BLOCKED
        UpdateTaskRequest updateTaskP2 = new UpdateTaskRequest();
        updateTaskP2.status = "IN_PROGRESS";
        updateTaskP2.version = 1L;
        given()
                .cookie("session_id", mainCreatorSession)
                .contentType("application/json")
                .body(updateTaskP2)
            .when()
                .put("/api/projects/" + sub2Id + "/tasks/" + taskP2Id)
            .then()
                .statusCode(400)
                .body("error", containsString("Prerequisite sub-projects have not been completed yet"));
    }

    @Test
    void testDependencyAuthorityAndCycleDetection() {
        String adminSession = loginAsAdmin();
        String mainCreatorSession = createUserAndLogin("creator2", adminSession);
        String subLeadSession = createUserAndLogin("sublead", adminSession);

        // Root project by creator2
        CreateProjectRequest rootReq = new CreateProjectRequest();
        rootReq.name = "Mobile App";
        rootReq.projectKey = "MOB";
        Long rootId = given()
                .cookie("session_id", mainCreatorSession)
                .contentType("application/json")
                .body(rootReq)
            .when()
                .post("/api/projects")
            .then()
                .statusCode(201)
                .extract().jsonPath().getLong("id");

        // Subproject A
        CreateProjectRequest subAReq = new CreateProjectRequest();
        subAReq.name = "Sub A";
        subAReq.projectKey = "MOB-A";
        subAReq.parentProjectId = rootId;
        Long subAId = given()
                .cookie("session_id", mainCreatorSession)
                .contentType("application/json")
                .body(subAReq)
            .when()
                .post("/api/projects")
            .then()
                .statusCode(201)
                .extract().jsonPath().getLong("id");

        // Subproject B (led by sublead)
        CreateProjectRequest subBReq = new CreateProjectRequest();
        subBReq.name = "Sub B";
        subBReq.projectKey = "MOB-B";
        subBReq.parentProjectId = rootId;
        Long subLeadId = given()
                .cookie("session_id", subLeadSession)
            .when()
                .get("/api/auth/me")
            .then()
                .extract().jsonPath().getLong("id");

        subBReq.leadId = subLeadId;

        Long subBId = given()
                .cookie("session_id", mainCreatorSession)
                .contentType("application/json")
                .body(subBReq)
            .when()
                .post("/api/projects")
            .then()
                .statusCode(201)
                .extract().jsonPath().getLong("id");

        // Sublead accepts invitation to become active lead of Sub B
        Long inviteId = given()
                .cookie("session_id", mainCreatorSession)
            .when()
                .get("/api/projects/" + subBId + "/invitations")
            .then()
                .statusCode(200)
                .extract().jsonPath().getLong("[0].id");

        given()
                .cookie("session_id", subLeadSession)
            .when()
                .post("/api/invitations/" + inviteId + "/accept")
            .then()
                .statusCode(200);

        // 1. Subproject lead tries to change dependencies -> 403 Forbidden
        UpdateProjectRequest leadAttempt = new UpdateProjectRequest();
        leadAttempt.dependencyType = "START_AFTER";
        leadAttempt.prerequisiteIds = Collections.singletonList(subAId);

        given()
                .cookie("session_id", subLeadSession)
                .contentType("application/json")
                .body(leadAttempt)
            .when()
                .put("/api/projects/" + subBId)
            .then()
                .statusCode(403)
                .body("error", containsString("Only main project creator or ADMIN can modify sub-project dependencies"));

        // 2. Main creator sets Sub B START_AFTER Sub A -> 200 OK
        given()
                .cookie("session_id", mainCreatorSession)
                .contentType("application/json")
                .body(leadAttempt)
            .when()
                .put("/api/projects/" + subBId)
            .then()
                .statusCode(200)
                .body("dependencyType", equalTo("START_AFTER"))
                .body("prerequisiteIds", hasItem(subAId.intValue()));

        // 3. Attempting to make Sub A START_AFTER Sub B creates cycle -> 400 Bad Request
        UpdateProjectRequest cycleAttempt = new UpdateProjectRequest();
        cycleAttempt.dependencyType = "START_AFTER";
        cycleAttempt.prerequisiteIds = Collections.singletonList(subBId);

        given()
                .cookie("session_id", mainCreatorSession)
                .contentType("application/json")
                .body(cycleAttempt)
            .when()
                .put("/api/projects/" + subAId)
            .then()
                .statusCode(400)
                .body("error", containsString("Circular dependency detected"));

        // 4. Main creator removes dependencies on Sub B -> switches to NO_DEPENDENCY
        UpdateProjectRequest removeDep = new UpdateProjectRequest();
        removeDep.dependencyType = "NO_DEPENDENCY";

        given()
                .cookie("session_id", mainCreatorSession)
                .contentType("application/json")
                .body(removeDep)
            .when()
                .put("/api/projects/" + subBId)
            .then()
                .statusCode(200)
                .body("dependencyType", equalTo("NO_DEPENDENCY"))
                .body("isBlocked", equalTo(false))
                .body("prerequisiteIds", empty());
    }
}
