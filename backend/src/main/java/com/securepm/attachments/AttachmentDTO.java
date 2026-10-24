package com.securepm.attachments;

import java.time.LocalDateTime;

public class AttachmentDTO {

    public Long id;
    public Long projectId;
    public Long taskId;
    public String taskTitle;
    public String originalName;
    public Long fileSize;
    public LocalDateTime uploadedAt;
    public Long uploadedBy;
    public String uploadedByName;
    public Long forwardedBy;
    public String forwardedByName;
    public LocalDateTime forwardedAt;
    public Long sourceProjectId;
    public String sourceProjectName;
    public Long sourceAttachmentId;
    public boolean isForwarded;

    public AttachmentDTO() {
    }

    public AttachmentDTO(Attachment attachment) {
        this.id = attachment.id;
        this.projectId = attachment.projectId;
        this.taskId = attachment.taskId;
        this.originalName = attachment.originalName;
        this.fileSize = attachment.fileSize;
        this.uploadedAt = attachment.uploadedAt;
        this.uploadedBy = attachment.uploadedBy;
        this.forwardedBy = attachment.forwardedBy;
        this.forwardedAt = attachment.forwardedAt;
        this.sourceProjectId = attachment.sourceProjectId;
        this.sourceAttachmentId = attachment.sourceAttachmentId;
        this.isForwarded = attachment.forwardedBy != null;
    }
}