package com.securepm.auth;

import io.quarkus.hibernate.orm.panache.PanacheEntity;
import jakarta.persistence.*;
import java.time.LocalDateTime;

@Entity
@Table(name = "users")
@SequenceGenerator(name = "users_id_seq", sequenceName = "users_id_seq", allocationSize = 1)
public class User extends PanacheEntity {

    @Column(unique = true, nullable = false, length = 50)
    public String username;

    @Column(name = "password_hash", nullable = false, length = 255)
    public String passwordHash;

    @Column(name = "full_name", nullable = false, length = 100)
    public String fullName;

    @Column(unique = true, nullable = false, length = 150)
    public String email;

    @Column(name = "created_by")
    public Long createdBy;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    public Role role;

    @Column(nullable = false)
    public boolean active = true;

    public boolean isSuperAdmin() {
        return (createdBy == null || (id != null && id.equals(1L))) && role == Role.ADMIN;
    }

    @Column(name = "created_at")
    public LocalDateTime createdAt;

    @Column(name = "updated_at")
    public LocalDateTime updatedAt;

    @PrePersist
    void onCreate() {
        createdAt = LocalDateTime.now();
        updatedAt = LocalDateTime.now();
    }

    @PreUpdate
    void onUpdate() {
        updatedAt = LocalDateTime.now();
    }
}
