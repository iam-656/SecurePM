package com.securepm.auth;

import com.securepm.auth.dto.CreateUserRequest;
import com.securepm.auth.dto.LoginRequest;
import com.securepm.auth.dto.UpdateProfileRequest;
import com.securepm.auth.dto.UpdateUserRequest;
import com.securepm.test.TestDatabaseCleaner;
import io.quarkus.test.junit.QuarkusTest;
import jakarta.inject.Inject;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

import static io.restassured.RestAssured.given;
import static org.hamcrest.Matchers.*;

@QuarkusTest
class UserResourceTest {

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

    @Test
    void createUserReturns201() {
        String sessionId = loginAsAdmin();

        CreateUserRequest request = new CreateUserRequest();
        request.username = "testuser";
        request.email = "testuser@securepm.local";
        request.password = "TestPass123!";
        request.fullName = "Test User";
        request.role = "USER";

        given()
                .cookie("session_id", sessionId)
                .contentType("application/json")
                .body(request)
            .when()
                .post("/api/users")
            .then()
                .statusCode(201)
                .body("username", equalTo("testuser"))
                .body("email", equalTo("testuser@securepm.local"))
                .body("fullName", equalTo("Test User"))
                .body("role", equalTo("USER"))
                .body("active", equalTo(true));
    }

    @Test
    void createUserWithoutAuthReturns401() {
        CreateUserRequest request = new CreateUserRequest();
        request.username = "testuser";
        request.email = "testuser@securepm.local";
        request.password = "TestPass123!";
        request.fullName = "Test User";
        request.role = "USER";

        given()
                .contentType("application/json")
                .body(request)
            .when()
                .post("/api/users")
            .then()
                .statusCode(401);
    }

    @Test
    void createUserWithDuplicateUsernameReturns409() {
        String sessionId = loginAsAdmin();

        CreateUserRequest request = new CreateUserRequest();
        request.username = "admin";
        request.email = "unique@securepm.local";
        request.password = "TestPass123!";
        request.fullName = "Duplicate";
        request.role = "USER";

        given()
                .cookie("session_id", sessionId)
                .contentType("application/json")
                .body(request)
            .when()
                .post("/api/users")
            .then()
                .statusCode(409)
                .body("error", containsString("Username already exists"));
    }

    @Test
    void createUserWithDuplicateEmailReturns409() {
        String sessionId = loginAsAdmin();

        CreateUserRequest request = new CreateUserRequest();
        request.username = "uniqueuser";
        request.email = "superadmin@pm.local"; // Already used by admin
        request.password = "TestPass123!";
        request.fullName = "Duplicate Email";
        request.role = "USER";

        given()
                .cookie("session_id", sessionId)
                .contentType("application/json")
                .body(request)
            .when()
                .post("/api/users")
            .then()
                .statusCode(409)
                .body("error", containsString("Email already exists"));
    }

    @Test
    void checkUsernameAvailability() {
        String sessionId = loginAsAdmin();

        // 1. "admin" is taken
        given()
                .cookie("session_id", sessionId)
                .queryParam("username", "admin")
            .when()
                .get("/api/users/check-username")
            .then()
                .statusCode(200)
                .body("available", equalTo(false))
                .body("message", equalTo("Username is already taken"));

        // 2. "brandnewuser" is available
        given()
                .cookie("session_id", sessionId)
                .queryParam("username", "brandnewuser")
            .when()
                .get("/api/users/check-username")
            .then()
                .statusCode(200)
                .body("available", equalTo(true))
                .body("message", equalTo("Username is available"));

        // 3. Short username is invalid
        given()
                .cookie("session_id", sessionId)
                .queryParam("username", "ab")
            .when()
                .get("/api/users/check-username")
            .then()
                .statusCode(200)
                .body("available", equalTo(false))
                .body("message", equalTo("Username must be at least 3 characters"));
    }

    @Test
    void deactivatedUsernameBecomesAvailableForReuse() {
        String sessionId = loginAsAdmin();

        CreateUserRequest createRequest = new CreateUserRequest();
        createRequest.username = "recyclable";
        createRequest.email = "recyclable@securepm.local";
        createRequest.password = "TestPass123!";
        createRequest.fullName = "Recyclable User";
        createRequest.role = "USER";

        Long userId = given()
                .cookie("session_id", sessionId)
                .contentType("application/json")
                .body(createRequest)
            .when()
                .post("/api/users")
            .then()
                .statusCode(201)
                .extract().jsonPath().getLong("id");

        // Deactivate user
        given()
                .cookie("session_id", sessionId)
            .when()
                .delete("/api/users/" + userId)
            .then()
                .statusCode(200);

        // Username should now be available again
        given()
                .cookie("session_id", sessionId)
                .queryParam("username", "recyclable")
            .when()
                .get("/api/users/check-username")
            .then()
                .statusCode(200)
                .body("available", equalTo(true));
    }

    @Test
    void listUsersReturnsAdminOnly() {
        String sessionId = loginAsAdmin();

        given()
                .cookie("session_id", sessionId)
            .when()
                .get("/api/users")
            .then()
                .statusCode(200)
                .body("size()", greaterThanOrEqualTo(1));
    }

    @Test
    void updateUserReturns200() {
        String sessionId = loginAsAdmin();

        CreateUserRequest createRequest = new CreateUserRequest();
        createRequest.username = "updatetest";
        createRequest.email = "original@securepm.local";
        createRequest.password = "TestPass123!";
        createRequest.fullName = "Original Name";
        createRequest.role = "USER";

        Long userId = given()
                .cookie("session_id", sessionId)
                .contentType("application/json")
                .body(createRequest)
            .when()
                .post("/api/users")
            .then()
                .statusCode(201)
                .extract().jsonPath().getLong("id");

        UpdateUserRequest updateRequest = new UpdateUserRequest();
        updateRequest.fullName = "Updated Name";
        updateRequest.email = "updated@securepm.local";
        updateRequest.role = "ADMIN";

        given()
                .cookie("session_id", sessionId)
                .contentType("application/json")
                .body(updateRequest)
            .when()
                .put("/api/users/" + userId)
            .then()
                .statusCode(200)
                .body("fullName", equalTo("Updated Name"))
                .body("email", equalTo("updated@securepm.local"))
                .body("role", equalTo("ADMIN"));
    }

    @Test
    void superAdminCannotBeDeletedOrDeactivated() {
        String sessionId = loginAsAdmin();

        User admin = User.find("username", "admin").firstResult();

        // 1. Cannot delete self
        given()
                .cookie("session_id", sessionId)
            .when()
                .delete("/api/users/" + admin.id)
            .then()
                .statusCode(400)
                .body("error", equalTo("You cannot delete your own account"));

        // 2. Cannot deactivate super admin
        UpdateUserRequest deactReq = new UpdateUserRequest();
        deactReq.active = false;

        given()
                .cookie("session_id", sessionId)
                .contentType("application/json")
                .body(deactReq)
            .when()
                .put("/api/users/" + admin.id)
            .then()
                .statusCode(400)
                .body("error", equalTo("Super administrator cannot be deactivated"));
    }

    @Test
    void userProfileUpdateAndChangePassword() {
        String sessionId = loginAsAdmin();

        UpdateProfileRequest profileReq = new UpdateProfileRequest();
        profileReq.fullName = "Super Administrator Updated";

        given()
                .cookie("session_id", sessionId)
                .contentType("application/json")
                .body(profileReq)
            .when()
                .put("/api/auth/profile")
            .then()
                .statusCode(200)
                .body("fullName", equalTo("Super Administrator Updated"));
    }

    @Test
    void superAdminEmailCannotBeModified() {
        String sessionId = loginAsAdmin();
        User admin = User.find("username", "admin").firstResult();

        UpdateUserRequest updateReq = new UpdateUserRequest();
        updateReq.email = "hackedadmin@pm.local";

        given()
                .cookie("session_id", sessionId)
                .contentType("application/json")
                .body(updateReq)
            .when()
                .put("/api/users/" + admin.id)
            .then()
                .statusCode(400)
                .body("error", equalTo("Super administrator email cannot be modified"));
    }

    @Test
    void adminCannotModifyOwnEmailOrRole() {
        String sessionId = loginAsAdmin();
        User admin = User.find("username", "admin").firstResult();

        UpdateUserRequest updateRole = new UpdateUserRequest();
        updateRole.role = "USER";

        given()
                .cookie("session_id", sessionId)
                .contentType("application/json")
                .body(updateRole)
            .when()
                .put("/api/users/" + admin.id)
            .then()
                .statusCode(400);
    }

    @Test
    void regularUserCanListActiveUsersForMemberAssignment() {
        String adminSession = loginAsAdmin();

        // Create standard user
        CreateUserRequest createReq = new CreateUserRequest();
        createReq.username = "standardmember";
        createReq.email = "standardmember@securepm.local";
        createReq.password = "TestPass123!";
        createReq.fullName = "Standard Member";
        createReq.role = "USER";

        given()
                .cookie("session_id", adminSession)
                .contentType("application/json")
                .body(createReq)
            .when()
                .post("/api/users")
            .then()
                .statusCode(201);

        // Login as standard user
        String userSession = given()
                .contentType("application/json")
                .body(new LoginRequest() {{
                    username = "standardmember";
                    password = "TestPass123!";
                }})
            .when()
                .post("/api/auth/login")
            .then()
                .statusCode(200)
                .extract().cookie("session_id");

        // List users as standard user (should succeed and return active users)
        given()
                .cookie("session_id", userSession)
            .when()
                .get("/api/users")
            .then()
                .statusCode(200)
                .body("size()", greaterThanOrEqualTo(2));
    }
}
