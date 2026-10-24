package com.securepm.notifications;

import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.securepm.notifications.dto.NotificationDTO;

import java.util.Map;

public class NotificationMapper {

    private static final ObjectMapper objectMapper = new ObjectMapper();

    public static NotificationDTO toDTO(Notification notification) {
        if (notification == null) {
            return null;
        }
        NotificationDTO dto = new NotificationDTO();
        dto.id = notification.id;
        dto.type = notification.type;
        dto.title = notification.title;
        dto.message = notification.message;
        dto.dataJson = notification.dataJson;
        dto.isRead = notification.isRead;
        dto.createdAt = notification.createdAt;

        if (notification.dataJson != null && !notification.dataJson.isBlank()) {
            try {
                dto.data = objectMapper.readValue(notification.dataJson, new TypeReference<Map<String, Object>>() {});
            } catch (Exception ignored) {
            }
        }
        return dto;
    }
}
