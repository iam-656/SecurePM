package com.securepm.notifications.dto;

import java.util.List;

public class NotificationsResponseDTO {
    public List<NotificationDTO> notifications;
    public long unreadCount;

    public NotificationsResponseDTO() {
    }

    public NotificationsResponseDTO(List<NotificationDTO> notifications, long unreadCount) {
        this.notifications = notifications;
        this.unreadCount = unreadCount;
    }
}
