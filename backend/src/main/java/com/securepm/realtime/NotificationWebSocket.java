package com.securepm.realtime;

import com.securepm.auth.User;
import io.quarkus.websockets.next.CloseReason;
import io.quarkus.websockets.next.Connection;
import io.quarkus.websockets.next.HandshakeRequest;
import io.quarkus.websockets.next.OnClose;
import io.quarkus.websockets.next.OnError;
import io.quarkus.websockets.next.OnOpen;
import io.quarkus.websockets.next.WebSocket;
import io.smallrye.common.annotation.Blocking;
import io.vertx.core.Future;
import io.vertx.ext.web.Session;
import io.vertx.ext.web.sstore.SessionStore;
import jakarta.enterprise.context.ApplicationScoped;
import jakarta.enterprise.context.control.ActivateRequestContext;
import jakarta.inject.Inject;
import jakarta.transaction.Transactional;
import org.eclipse.microprofile.config.ConfigProvider;

import java.util.List;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.TimeUnit;

@WebSocket(path = "/ws/notifications")
@ApplicationScoped
public class NotificationWebSocket {

    @Inject
    SessionStore sessionStore;

    @Inject
    SessionManager sessionManager;

    private final ConcurrentHashMap<String, Long> connectionUserMap = new ConcurrentHashMap<>();

    @OnOpen
    @Blocking
    @ActivateRequestContext
    @Transactional
    void onOpen(Connection connection) {
        String sessionId = extractSessionId(connection.handshakeRequest());
        if (sessionId == null || sessionId.isBlank()) {
            connection.closeAndAwait(new CloseReason(4001, "Authentication required"));
            return;
        }

        Session session = null;
        try {
            Future<Session> future = sessionStore.get(sessionId);
            if (future.isComplete()) {
                session = future.result();
            } else {
                session = future.toCompletionStage().toCompletableFuture().get(2, TimeUnit.SECONDS);
            }
        } catch (Throwable t) {
            connection.closeAndAwait(new CloseReason(4001, "Authentication required"));
            return;
        }

        if (session == null || session.isDestroyed()) {
            connection.closeAndAwait(new CloseReason(4001, "Authentication required"));
            return;
        }

        Long userId = session.get("userId");
        if (userId == null) {
            connection.closeAndAwait(new CloseReason(4001, "Authentication required"));
            return;
        }

        session.setAccessed();

        User user = User.findById(userId);
        if (user == null || !user.active) {
            connection.closeAndAwait(new CloseReason(4001, "Authentication required"));
            return;
        }

        connectionUserMap.put(connection.id(), userId);
        sessionManager.registerUser(userId, connection);
    }

    @OnClose
    void onClose(Connection connection) {
        Long userId = connectionUserMap.remove(connection.id());
        if (userId != null) {
            sessionManager.unregisterUser(userId, connection);
        }
    }

    @OnError
    void onError(Throwable error) {
        error.printStackTrace();
    }

    private String extractSessionId(HandshakeRequest handshakeRequest) {
        if (handshakeRequest == null) {
            return null;
        }

        String cookieHeader = handshakeRequest.header("cookie");
        if (cookieHeader == null) {
            cookieHeader = handshakeRequest.header("Cookie");
        }
        if (cookieHeader == null && handshakeRequest.headers() != null) {
            for (Map.Entry<String, List<String>> entry : handshakeRequest.headers().entrySet()) {
                if ("cookie".equalsIgnoreCase(entry.getKey()) && !entry.getValue().isEmpty()) {
                    cookieHeader = entry.getValue().get(0);
                    break;
                }
            }
        }

        String cookieName = ConfigProvider.getConfig()
                .getOptionalValue("quarkus.http.session.cookie.name", String.class)
                .orElse("session_id");

        if (cookieHeader != null && !cookieHeader.isBlank()) {
            String prefix = cookieName + "=";
            String[] parts = cookieHeader.split(";");
            for (String part : parts) {
                String trimmed = part.trim();
                if (trimmed.startsWith(prefix)) {
                    return trimmed.substring(prefix.length()).trim();
                }
            }
        }

        String query = handshakeRequest.query();
        if (query != null && !query.isBlank()) {
            String[] params = query.split("&");
            for (String param : params) {
                String[] kv = param.split("=", 2);
                if (kv.length == 2 && (kv[0].equalsIgnoreCase(cookieName) || kv[0].equalsIgnoreCase("sessionId"))) {
                    return kv[1].trim();
                }
            }
        }

        return null;
    }
}
