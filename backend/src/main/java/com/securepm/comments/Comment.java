package com.securepm.comments;

import io.quarkus.hibernate.orm.panache.PanacheEntity;
import jakarta.persistence.*;
import java.time.LocalDateTime;

@Entity
@Table(name = "comments")
@SequenceGenerator(name = "comments_id_seq", sequenceName = "comments_id_seq", allocationSize = 1)
public class Comment extends PanacheEntity {

    @Column(name = "task_id", nullable = false)
    public Long taskId;

    @Column(name = "author_id", nullable = false)
    public Long authorId;

    @Column(columnDefinition = "TEXT", nullable = false)
    public String content;

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