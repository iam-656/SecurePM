package com.securepm.attachments;

public class ForwardTargetDTO {
    public Long id;
    public String name;
    public boolean isSubproject;
    public boolean completed;
    public boolean alreadyForwarded;

    public ForwardTargetDTO() {
    }

    public ForwardTargetDTO(Long id, String name, boolean isSubproject, boolean completed, boolean alreadyForwarded) {
        this.id = id;
        this.name = name;
        this.isSubproject = isSubproject;
        this.completed = completed;
        this.alreadyForwarded = alreadyForwarded;
    }
}
