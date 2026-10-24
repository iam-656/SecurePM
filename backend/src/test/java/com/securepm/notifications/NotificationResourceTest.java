package com.securepm.notifications;

import com.securepm.auth.dto.CreateUserRequest;
import com.securepm.auth.dto.LoginRequest;
import com.securepm.invitations.dto.CreateInvitationRequest;
import com.securepm.projects.CreateProjectRequest;
import com.securepm.test.TestDatabaseCleaner;
import io.quarkus.test.junit.QuarkusTest;
import jakarta.inject.Inject;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

import static io.restassured.RestAssured.given;
import static org.hamcrest.Matchers.*;

@QuarkusTest
class NotificationResourceTest {

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

    @Test
    void notificationLifecycle() {
        String adminSession = loginAsAdmin();
        Long bobId = createUser(adminSession, "bob", "bob@example.com");
        String bobSession = loginAs("bob");

        // Admin creates project
        CreateProjectRequest createProj = new CreateProjectRequest();
        createProj.name = "Notification Test";
        createProj.projectKey = "NT";

        Long projectId = given()
                .cookie("session_id", adminSession)
                .contentType("application/json")
                .body(createProj)
            .when()
                .post("/api/projects")
            .then()
                .statusCode(201)
                .extract().jsonPath().getLong("id");

        // Admin invites Bob
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

        // Bob checks notifications
        Long notifId = given()
                .cookie("session_id", bobSession)
            .when()
                .get("/api/notifications")
            .then()
                .statusCode(200)
                .body("unreadCount", equalTo(1))
                .body("notifications.size()", equalTo(1))
                .body("notifications[0].type", equalTo("PROJECT_INVITE"))
                .body("notifications[0].isRead", equalTo(false))
                .body("notifications[0].data.projectKey", equalTo("NT"))
                .extract().jsonPath().getLong("notifications[0].id");

        // Bob marks notification as read
        given()
                .cookie("session_id", bobSession)
            .when()
                .put("/api/notifications/" + notifId + "/read")
            .then()
                .statusCode(200)
                .body("isRead", equalTo(true));

        // Verify unread count is now 0
        given()
                .cookie("session_id", bobSession)
            .when()
                .get("/api/notifications")
            .then()
                .statusCode(200)
                .body("unreadCount", equalTo(0));

        // Mark all as read works cleanly
        given()
                .cookie("session_id", bobSession)
            .when()
                .put("/api/notifications/read-all")
            .then()
                .statusCode(200)
                .body("unreadCount", equalTo(0));
    }

    @Test
    void unauthenticatedReturns401() {
        given()
            .when()
                .get("/api/notifications")
            .then()
                .statusCode(401);
    }
}
