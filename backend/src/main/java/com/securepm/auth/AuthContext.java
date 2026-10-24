package com.securepm.auth;

import jakarta.enterprise.context.RequestScoped;

@RequestScoped
public class AuthContext {

    private User currentUser;

    public void setCurrentUser(User user) {
        this.currentUser = user;
    }

    public User getCurrentUser() {
        return currentUser;
    }

    public boolean isAuthenticated() {
        return currentUser != null;
    }

    public boolean isAdmin() {
        return currentUser != null && currentUser.role == Role.ADMIN;
    }
}
