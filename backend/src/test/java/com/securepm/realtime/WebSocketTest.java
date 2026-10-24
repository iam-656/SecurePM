package com.securepm.realtime;

import com.securepm.auth.dto.LoginRequest;
import com.securepm.test.TestDatabaseCleaner;
import io.quarkus.test.junit.QuarkusTest;
import io.quarkus.websockets.next.BasicWebSocketConnector;
import io.quarkus.websockets.next.CloseReason;
import io.quarkus.websockets.next.WebSocketClientConnection;
import jakarta.inject.Inject;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

import java.net.URI;
import java.time.Duration;
import java.util.concurrent.atomic.AtomicReference;

import static io.restassured.RestAssured.given;
import static org.junit.jupiter.api.Assertions.*;

@QuarkusTest
class WebSocketTest {

    @Inject
    TestDatabaseCleaner cleaner;

    @BeforeEach
    void setUp() {
        cleaner.wipeData();
    }

    @Test
    void connectWithValidSessionEstablishesConnection() throws Exception {
        // Login to get session cookie
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

        Long projectId = given()
                .cookie("session_id", sessionId)
                .contentType("application/json")
                .body("{\"name\":\"WS Project\",\"description\":\"desc\",\"projectKey\":\"WSP\"}")
            .when()
                .post("/api/projects")
            .then()
                .statusCode(201)
                .extract()
                .jsonPath()
                .getLong("id");

        // Connect WebSocket with session cookie via Cookie header
        AtomicReference<WebSocketClientConnection> connRef = new AtomicReference<>();
        AtomicReference<CloseReason> closeRef = new AtomicReference<>();

        BasicWebSocketConnector connector = BasicWebSocketConnector.create()
                .baseUri(URI.create("http://localhost:" + io.restassured.RestAssured.port))
                .path("/ws/projects/" + projectId)
                .addHeader("Cookie", "session_id=" + sessionId)
                .onOpen(conn -> connRef.set(conn))
                .onClose((conn, reason) -> closeRef.set(reason));

        WebSocketClientConnection conn = connector.connect()
                .await()
                .atMost(Duration.ofSeconds(5));

        assertNotNull(conn);
        conn.close();
    }

    @Test
    void connectWithoutSessionClosesConnection() throws Exception {
        AtomicReference<CloseReason> closeRef = new AtomicReference<>();

        BasicWebSocketConnector connector = BasicWebSocketConnector.create()
                .baseUri(URI.create("http://localhost:" + io.restassured.RestAssured.port))
                .path("/ws/projects/1")
                .onClose((conn, reason) -> closeRef.set(reason));

        WebSocketClientConnection conn = connector.connect()
                .await()
                .atMost(Duration.ofSeconds(5));

        assertNotNull(conn);
        // Wait for close reason (server should close with 4001)
        Thread.sleep(1000);
        assertNotNull(closeRef.get(), "Connection without session should be closed by server");
        assertEquals(4001, closeRef.get().getCode());
    }
}