package com.securepm.realtime;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;
import io.quarkus.websockets.next.Connection;
import jakarta.enterprise.context.ApplicationScoped;
import jakarta.inject.Inject;

import java.util.Set;
import java.util.concurrent.ConcurrentHashMap;

@ApplicationScoped
public class SessionManager {

    @Inject
    ObjectMapper objectMapper;

    private final ConcurrentHashMap<Long, Set<Connection>> projectSessions = new ConcurrentHashMap<>();
    private final ConcurrentHashMap<Long, Set<Connection>> userSessions = new ConcurrentHashMap<>();

    public void register(Long projectId, Connection connection) {
        projectSessions.computeIfAbsent(projectId, k -> ConcurrentHashMap.newKeySet()).add(connection);
    }

    public void unregister(Long projectId, Connection connection) {
        Set<Connection> sessions = projectSessions.get(projectId);
        if (sessions != null) {
            sessions.remove(connection);
            if (sessions.isEmpty()) {
                projectSessions.remove(projectId);
            }
        }
    }

    public void registerUser(Long userId, Connection connection) {
        userSessions.computeIfAbsent(userId, k -> ConcurrentHashMap.newKeySet()).add(connection);
    }

    public void unregisterUser(Long userId, Connection connection) {
        Set<Connection> sessions = userSessions.get(userId);
        if (sessions != null) {
            sessions.remove(connection);
            if (sessions.isEmpty()) {
                userSessions.remove(userId);
            }
        }
    }

    public void sendToUser(Long userId, Object event) {
        Set<Connection> sessions = userSessions.get(userId);
        if (sessions == null || sessions.isEmpty()) {
            return;
        }
        String json;
        try {
            json = objectMapper.writeValueAsString(event);
        } catch (JsonProcessingException e) {
            throw new RuntimeException("Failed to serialize user notification event", e);
        }
        sessions.forEach(conn -> {
            if (conn.isOpen()) {
                conn.sendTextAndAwait(json);
            }
        });
    }

    public void broadcast(Long projectId, ProjectEvent event) {
        Set<Connection> sessions = projectSessions.get(projectId);
        if (sessions == null || sessions.isEmpty()) {
            return;
        }
        String json;
        try {
            json = objectMapper.writeValueAsString(event);
        } catch (JsonProcessingException e) {
            throw new RuntimeException("Failed to serialize ProjectEvent", e);
        }
        sessions.forEach(conn -> {
            if (conn.isOpen()) {
                conn.sendTextAndAwait(json);
            }
        });
    }
}
