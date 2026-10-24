package com.securepm.projects;

public class UserSummaryDTO {

    public Long id;
    public String username;
    public String fullName;
    public String role;

    public UserSummaryDTO() {
    }

    public UserSummaryDTO(Long id, String username, String fullName, String role) {
        this.id = id;
        this.username = username;
        this.fullName = fullName;
        this.role = role;
    }

    public UserSummaryDTO(com.securepm.auth.User user) {
        this.id = user.id;
        this.username = user.username;
        this.fullName = user.fullName;
        this.role = user.role != null ? user.role.name() : null;
    }
}
