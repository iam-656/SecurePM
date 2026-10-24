package com.securepm.projects;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public class CreateProjectRequest {

    @NotBlank
    @Size(min = 1, max = 100)
    public String name;

    @Size(max = 1000)
    public String description;

    @NotBlank
    @Size(min = 1, max = 10)
    public String projectKey;

    public Long parentProjectId;

    public Long leadId;

    public String dependencyType;

    public java.util.List<Long> prerequisiteIds;
}
