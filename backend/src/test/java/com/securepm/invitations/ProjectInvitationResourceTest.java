package com.securepm.invitations;

import com.securepm.auth.dto.CreateUserRequest;
import com.securepm.auth.dto.LoginRequest;
import com.securepm.invitations.dto.CreateInvitationRequest;
import com.securepm.projects.CreateProjectRequest;
import com.securepm.test.TestDatabaseCleaner;
import io.quarkus.narayana.jta.QuarkusTransaction;
import io.quarkus.test.junit.QuarkusTest;
import jakarta.inject.Inject;
import jakarta.persistence.EntityManager;
import jakarta.transaction.Transactional;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

import java.time.LocalDateTime;

import static io.restassured.RestAssured.given;
import static org.hamcrest.Matchers.*;

@QuarkusTest
class ProjectInvitationResourceTest {

    @Inject
    TestDatabaseCleaner cleaner;

    @Inject
    EntityManager em;

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

    private Long createUser(String adminSession, String username, String email) {
        CreateUserRequest req = new CreateUserRequest();
        req.username = username;
        req.email = email;
        req.password = "TestPass123!";
        req.fullName = "Test " + username;
        req.role = "USER";

        return given()
                .cookie("session_id", adminSession)
                .contentType("application/json")
                .body(req)
            .when()
                .post("/api/users")
            .then()
                .statusCode(201)
                .extract().jsonPath().getLong("id");
    }

    private String loginAs(String username) {
        LoginRequest req = new LoginRequest();
        req.username = username;
        req.password = "TestPass123!";

        return given()
                .contentType("application/json")
                .body(req)
            .when()
                .post("/api/auth/login")
            .then()
                .statusCode(200)
                .extract().cookie("session_id");
    }

    private Long createProject(String session, String name, String key) {
        CreateProjectRequest req = new CreateProjectRequest();
        req.name = name;
        req.projectKey = key;

        return given()
                .cookie("session_id", session)
                .contentType("application/json")
                .body(req)
            .when()
                .post("/api/projects")
            .then()
                .statusCode(201)
                .extract().jsonPath().getLong("id");
    }

    @Test
    void leadCanInviteUserAndUserCanAccept() {
        String adminSession = loginAsAdmin();
        Long aliceId = createUser(adminSession, "alice", "alice@example.com");
        Long bobId = createUser(adminSession, "bob", "bob@example.com");

        String aliceSession = loginAs("alice");
        String bobSession = loginAs("bob");

        Long projectId = createProject(aliceSession, "Alice Project", "AP");

        // Alice invites Bob
        CreateInvitationRequest req = new CreateInvitationRequest();
        req.userId = bobId;

        Long inviteId = given()
                .cookie("session_id", aliceSession)
                .contentType("application/json")
                .body(req)
            .when()
                .post("/api/projects/" + projectId + "/invitations")
            .then()
                .statusCode(201)
                .body("status", equalTo("PENDING"))
                .body("invitedUsername", equalTo("bob"))
                .body("invitedByUsername", equalTo("alice"))
                .extract().jsonPath().getLong("id");

        // Bob accepts invite
        given()
                .cookie("session_id", bobSession)
            .when()
                .post("/api/invitations/" + inviteId + "/accept")
            .then()
                .statusCode(200)
                .body("status", equalTo("ACCEPTED"));

        // Verify Bob can now access the project
        given()
                .cookie("session_id", bobSession)
            .when()
                .get("/api/projects/" + projectId)
            .then()
                .statusCode(200)
                .body("memberSummaries.username", hasItem("bob"));
    }

    @Test
    void userCanDeclineInvite() {
        String adminSession = loginAsAdmin();
        Long bobId = createUser(adminSession, "bob", "bob@example.com");
        String bobSession = loginAs("bob");

        Long projectId = createProject(adminSession, "Admin Project", "ADP");

        CreateInvitationRequest req = new CreateInvitationRequest();
        req.userId = bobId;

        Long inviteId = given()
                .cookie("session_id", adminSession)
                .contentType("application/json")
                .body(req)
            .when()
                .post("/api/projects/" + projectId + "/invitations")
            .then()
                .statusCode(201)
                .extract().jsonPath().getLong("id");

        // Bob declines
        given()
                .cookie("session_id", bobSession)
            .when()
                .post("/api/invitations/" + inviteId + "/decline")
            .then()
                .statusCode(200)
                .body("status", equalTo("DECLINED"));

        // Verify Bob is not in project members
        given()
                .cookie("session_id", adminSession)
            .when()
                .get("/api/projects/" + projectId)
            .then()
                .statusCode(200)
                .body("memberSummaries.username", not(hasItem("bob")));
    }

    @Test
    void nonLeadNonAdminCannotInvite() {
        String adminSession = loginAsAdmin();
        Long aliceId = createUser(adminSession, "alice", "alice@example.com");
        Long bobId = createUser(adminSession, "bob", "bob@example.com");

        String aliceSession = loginAs("alice");
        String bobSession = loginAs("bob");

        Long projectId = createProject(aliceSession, "Alice Project", "AP2");

        // Bob tries to invite someone to Alice's project
        CreateInvitationRequest req = new CreateInvitationRequest();
        req.userId = 1L; // admin

        given()
                .cookie("session_id", bobSession)
                .contentType("application/json")
                .body(req)
            .when()
                .post("/api/projects/" + projectId + "/invitations")
            .then()
                .statusCode(403);
    }

    @Test
    void duplicatePendingInviteReturns409() {
        String adminSession = loginAsAdmin();
        Long bobId = createUser(adminSession, "bob", "bob@example.com");

        Long projectId = createProject(adminSession, "Admin Project", "ADP3");

        CreateInvitationRequest req = new CreateInvitationRequest();
        req.userId = bobId;

        given()
                .cookie("session_id", adminSession)
                .contentType("application/json")
                .body(req)
            .when()
                .post("/api/projects/" + projectId + "/invitations")
            .then()
                .statusCode(201);

        // Second invite returns 409
        given()
                .cookie("session_id", adminSession)
                .contentType("application/json")
                .body(req)
            .when()
                .post("/api/projects/" + projectId + "/invitations")
            .then()
                .statusCode(409);
    }

    @Test
    void leadCanCancelInvite() {
        String adminSession = loginAsAdmin();
        Long bobId = createUser(adminSession, "bob", "bob@example.com");

        Long projectId = createProject(adminSession, "Admin Project", "ADP4");

        CreateInvitationRequest req = new CreateInvitationRequest();
        req.userId = bobId;

        Long inviteId = given()
                .cookie("session_id", adminSession)
                .contentType("application/json")
                .body(req)
            .when()
                .post("/api/projects/" + projectId + "/invitations")
            .then()
                .statusCode(201)
                .extract().jsonPath().getLong("id");

        // Admin cancels invite
        given()
                .cookie("session_id", adminSession)
            .when()
                .delete("/api/projects/" + projectId + "/invitations/" + inviteId)
            .then()
                .statusCode(200)
                .body("status", equalTo("CANCELED"));
    }

    @Test
    void expiredInviteCannotBeAccepted() {
        String adminSession = loginAsAdmin();
        Long bobId = createUser(adminSession, "bob", "bob@example.com");
        String bobSession = loginAs("bob");

        Long projectId = createProject(adminSession, "Admin Project", "ADP5");

        CreateInvitationRequest req = new CreateInvitationRequest();
        req.userId = bobId;

        Long inviteId = given()
                .cookie("session_id", adminSession)
                .contentType("application/json")
                .body(req)
            .when()
                .post("/api/projects/" + projectId + "/invitations")
            .then()
                .statusCode(201)
                .extract().jsonPath().getLong("id");

        // Manually expire the invitation in DB and commit immediately
        QuarkusTransaction.requiringNew().run(() -> {
            em.createNativeQuery("UPDATE project_invitations SET expires_at = NOW() - INTERVAL '1 day' WHERE id = ?")
                    .setParameter(1, inviteId)
                    .executeUpdate();
        });

        // Bob attempts to accept expired invite
        given()
                .cookie("session_id", bobSession)
            .when()
                .post("/api/invitations/" + inviteId + "/accept")
            .then()
                .statusCode(400)
                .body("error", containsString("expired"));
    }
}
