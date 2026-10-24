package com.securepm.invitations;

import io.quarkus.hibernate.orm.panache.PanacheEntity;
import jakarta.persistence.*;
import java.time.LocalDateTime;

@Entity
@Table(name = "project_invitations")
@SequenceGenerator(name = "project_invitations_id_seq", sequenceName = "project_invitations_id_seq", allocationSize = 1)
public class ProjectInvitation extends PanacheEntity {

    @Column(name = "project_id", nullable = false)
    public Long projectId;

    @Column(name = "invited_user_id", nullable = false)
    public Long invitedUserId;

    @Column(name = "invited_by", nullable = false)
    public Long invitedBy;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 30)
    public InvitationStatus status = InvitationStatus.PENDING;

    @Column(name = "expires_at", nullable = false)
    public LocalDateTime expiresAt;

    @Column(name = "created_at")
    public LocalDateTime createdAt;

    @Column(name = "updated_at")
    public LocalDateTime updatedAt;

    @PrePersist
    void onCreate() {
        createdAt = LocalDateTime.now();
        updatedAt = LocalDateTime.now();
        if (expiresAt == null) {
            expiresAt = LocalDateTime.now().plusDays(7);
        }
    }

    @PreUpdate
    void onUpdate() {
        updatedAt = LocalDateTime.now();
    }

    public boolean isExpired() {
        if (status == InvitationStatus.EXPIRED) {
            return true;
        }
        return status == InvitationStatus.PENDING && expiresAt != null && expiresAt.isBefore(LocalDateTime.now());
    }
}
