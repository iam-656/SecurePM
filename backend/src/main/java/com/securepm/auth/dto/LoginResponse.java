package com.securepm.auth.dto;

public class LoginResponse {

    public Long id;
    public String username;
    public String email;
    public String fullName;
    public String role;
    public boolean active;
    public Long createdBy;
    public boolean isSuperAdmin;

    public LoginResponse() {
    }

    public LoginResponse(com.securepm.auth.User user) {
        this.id = user.id;
        this.username = user.username;
        this.email = user.email;
        this.fullName = user.fullName;
        this.role = user.role != null ? user.role.name() : null;
        this.active = user.active;
        this.createdBy = user.createdBy;
        this.isSuperAdmin = user.isSuperAdmin();
    }
}
