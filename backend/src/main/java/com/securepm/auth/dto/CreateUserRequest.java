package com.securepm.auth.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public class CreateUserRequest {

    @NotBlank
    @Size(min = 3, max = 50)
    public String username;

    @NotBlank
    @Size(min = 8)
    public String password;

    @NotBlank
    @Size(max = 100)
    public String fullName;

    @NotBlank
    @jakarta.validation.constraints.Email
    @Size(max = 150)
    public String email;

    @NotBlank
    public String role;
}
