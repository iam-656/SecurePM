package com.securepm.notifications;

import com.securepm.notifications.dto.NotificationDTO;
import com.securepm.notifications.dto.NotificationsResponseDTO;
import com.securepm.realtime.SessionManager;
import jakarta.enterprise.context.ApplicationScoped;
import jakarta.inject.Inject;
import jakarta.transaction.Transactional;

import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

@ApplicationScoped
public class NotificationService {

    @Inject
    SessionManager sessionManager;

    public NotificationsResponseDTO getNotificationsForUser(Long userId) {
        List<Notification> list = Notification.find("recipientId = ?1 ORDER BY createdAt DESC", userId).list();
        long unreadCount = Notification.count("recipientId = ?1 AND isRead = false", userId);
        List<NotificationDTO> dtos = list.stream().map(NotificationMapper::toDTO).collect(Collectors.toList());
        return new NotificationsResponseDTO(dtos, unreadCount);
    }

    public long getUnreadCount(Long userId) {
        return Notification.count("recipientId = ?1 AND isRead = false", userId);
    }

    @Transactional
    public NotificationDTO markAsRead(Long notificationId, Long userId) {
        Notification notification = Notification.findById(notificationId);
        if (notification == null || !notification.recipientId.equals(userId)) {
            throw new IllegalStateException("Notification not found");
        }
        if (!notification.isRead) {
            notification.isRead = true;
            notification.persist();
        }
        long unreadCount = getUnreadCount(userId);
        NotificationDTO dto = NotificationMapper.toDTO(notification);

        Map<String, Object> wsPayload = new HashMap<>();
        wsPayload.put("type", "NOTIFICATION_UPDATED");
        wsPayload.put("notification", dto);
        wsPayload.put("unreadCount", unreadCount);
        sessionManager.sendToUser(userId, wsPayload);

        return dto;
    }

    @Transactional
    public long markAllAsRead(Long userId) {
        Notification.update("isRead = true WHERE recipientId = ?1 AND isRead = false", userId);

        Map<String, Object> wsPayload = new HashMap<>();
        wsPayload.put("type", "ALL_NOTIFICATIONS_READ");
        wsPayload.put("unreadCount", 0L);
        sessionManager.sendToUser(userId, wsPayload);

        return 0L;
    }

    @Transactional
    public Notification createNotification(Long recipientId, NotificationType type, String title, String message, String dataJson) {
        Notification notification = new Notification();
        notification.recipientId = recipientId;
        notification.type = type;
        notification.title = title;
        notification.message = message;
        notification.dataJson = dataJson;
        notification.isRead = false;
        notification.persist();

        long unreadCount = getUnreadCount(recipientId);
        NotificationDTO dto = NotificationMapper.toDTO(notification);

        Map<String, Object> wsPayload = new HashMap<>();
        wsPayload.put("type", "NOTIFICATION_CREATED");
        wsPayload.put("notification", dto);
        wsPayload.put("unreadCount", unreadCount);
        sessionManager.sendToUser(recipientId, wsPayload);

        return notification;
    }
}
