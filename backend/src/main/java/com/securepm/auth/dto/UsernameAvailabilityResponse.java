package com.securepm.auth.dto;

public class UsernameAvailabilityResponse {
    public String username;
    public boolean available;
    public String message;

    public UsernameAvailabilityResponse() {
    }

    public UsernameAvailabilityResponse(String username, boolean available, String message) {
        this.username = username;
        this.available = available;
        this.message = message;
    }
}
