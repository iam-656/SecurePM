package com.securepm.comments;

import java.time.LocalDateTime;

public class CommentDTO {

    public Long id;
    public Long taskId;
    public Long authorId;
    public String authorName;
    public String content;
    public LocalDateTime createdAt;
    public LocalDateTime updatedAt;

    public CommentDTO() {
    }

    public CommentDTO(Comment comment) {
        this.id = comment.id;
        this.taskId = comment.taskId;
        this.authorId = comment.authorId;
        this.content = comment.content;
        this.createdAt = comment.createdAt;
        this.updatedAt = comment.updatedAt;
    }
}