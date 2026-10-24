package com.securepm.projects;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import java.time.LocalDate;

public class CreateTaskRequest {

    @NotBlank
    @Size(max = 255)
    public String title;

    @Size(max = 5000)
    public String description;

    public String status;

    public String priority;

    public Long assigneeId;

    public LocalDate dueDate;
}