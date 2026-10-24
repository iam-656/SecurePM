package com.securepm.notifications.dto;

import com.securepm.notifications.NotificationType;
import java.time.LocalDateTime;
import java.util.Map;

public class NotificationDTO {
    public Long id;
    public NotificationType type;
    public String title;
    public String message;
    public String dataJson;
    public Map<String, Object> data;
    public boolean isRead;
    public LocalDateTime createdAt;
}
