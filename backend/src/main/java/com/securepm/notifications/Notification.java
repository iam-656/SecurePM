package com.securepm.notifications;

import io.quarkus.hibernate.orm.panache.PanacheEntity;
import jakarta.persistence.*;
import java.time.LocalDateTime;

@Entity
@Table(name = "notifications")
@SequenceGenerator(name = "notifications_id_seq", sequenceName = "notifications_id_seq", allocationSize = 1)
public class Notification extends PanacheEntity {

    @Column(name = "recipient_id", nullable = false)
    public Long recipientId;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 50)
    public NotificationType type;

    @Column(nullable = false, length = 200)
    public String title;

    @Column(nullable = false, columnDefinition = "TEXT")
    public String message;

    @Column(name = "data_json", columnDefinition = "TEXT")
    public String dataJson;

    @Column(name = "is_read", nullable = false)
    public boolean isRead = false;

    @Column(name = "created_at")
    public LocalDateTime createdAt;

    @PrePersist
    void onCreate() {
        createdAt = LocalDateTime.now();
    }
}
