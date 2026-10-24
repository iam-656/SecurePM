package com.securepm.attachments;

import io.quarkus.hibernate.orm.panache.PanacheEntity;
import jakarta.persistence.*;
import java.time.LocalDateTime;

@Entity
@Table(name = "attachments")
@SequenceGenerator(name = "attachments_id_seq", sequenceName = "attachments_id_seq", allocationSize = 1)
public class Attachment extends PanacheEntity {

    @Column(name = "project_id", nullable = false)
    public Long projectId;

    @Column(name = "task_id")
    public Long taskId;

    @Column(name = "file_path", nullable = false, length = 500)
    public String filePath;

    @Column(name = "original_name", nullable = false, length = 255)
    public String originalName;

    @Column(name = "file_size", nullable = false)
    public Long fileSize;

    @Column(name = "uploaded_at")
    public LocalDateTime uploadedAt;

    @Column(name = "uploaded_by")
    public Long uploadedBy;

    @Column(name = "forwarded_by")
    public Long forwardedBy;

    @Column(name = "forwarded_at")
    public LocalDateTime forwardedAt;

    @Column(name = "source_project_id")
    public Long sourceProjectId;

    @Column(name = "source_attachment_id")
    public Long sourceAttachmentId;

    @PrePersist
    void onPersist() {
        if (uploadedAt == null) {
            uploadedAt = LocalDateTime.now();
        }
    }
}