package com.securepm.projects;

import jakarta.validation.constraints.Size;

public class UpdateProjectRequest {

    @Size(min = 1, max = 100)
    public String name;

    @Size(max = 1000)
    public String description;

    public Boolean archived;

    public Long leadId;

    public String dependencyType;

    public java.util.List<Long> prerequisiteIds;
}
