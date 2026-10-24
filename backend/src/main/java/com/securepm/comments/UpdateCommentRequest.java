package com.securepm.comments;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public class UpdateCommentRequest {

    @NotBlank
    @Size(max = 5000)
    public String content;
}