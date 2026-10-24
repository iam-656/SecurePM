package com.securepm.auth;

import com.securepm.auth.dto.LoginRequest;
import io.quarkus.test.junit.QuarkusTest;
import jakarta.inject.Inject;
import org.junit.jupiter.api.Disabled;
import org.junit.jupiter.api.Test;

import static io.restassured.RestAssured.given;
import static org.hamcrest.Matchers.*;

@QuarkusTest
class AuthResourceTest {

    @Test
    void loginWithValidCredentialsReturns200AndSetsCookie() {
        LoginRequest request = new LoginRequest();
        request.username = "admin";
        request.password = "ChangeMeNow123!";

        given()
                .contentType("application/json")
                .body(request)
            .when()
                .post("/api/auth/login")
            .then()
                .statusCode(200)
                .body("username", equalTo("admin"))
                .body("fullName", equalTo("System Administrator"))
                .body("role", equalTo("ADMIN"))
                .body("active", equalTo(true))
                .header("Set-Cookie", containsString("session_id="));
    }

    @Test
    void loginWithInvalidPasswordReturns401() {
        LoginRequest request = new LoginRequest();
        request.username = "admin";
        request.password = "WrongPassword!";

        given()
                .contentType("application/json")
                .body(request)
            .when()
                .post("/api/auth/login")
            .then()
                .statusCode(401);
    }

    @Test
    void loginWithNonexistentUserReturns401() {
        LoginRequest request = new LoginRequest();
        request.username = "nonexistent";
        request.password = "anything";

        given()
                .contentType("application/json")
                .body(request)
            .when()
                .post("/api/auth/login")
            .then()
                .statusCode(401);
    }

    @Test
    void meWithoutSessionReturns401() {
        given()
            .when()
                .get("/api/auth/me")
            .then()
                .statusCode(401);
    }

    @Test
    void loginThenMeReturnsUserInfo() {
        // Login and capture session cookie
        String sessionId = given()
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

        // Use session cookie to call /me
        given()
                .cookie("session_id", sessionId)
            .when()
                .get("/api/auth/me")
            .then()
                .statusCode(200)
                .body("username", equalTo("admin"))
                .body("role", equalTo("ADMIN"));
    }

    @Test
    void loginThenLogoutThenMeReturns401() {
        String sessionId = given()
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

        given()
                .cookie("session_id", sessionId)
            .when()
                .post("/api/auth/logout")
            .then()
                .statusCode(200);

        given()
                .cookie("session_id", sessionId)
            .when()
                .get("/api/auth/me")
            .then()
                .statusCode(401);
    }
}
