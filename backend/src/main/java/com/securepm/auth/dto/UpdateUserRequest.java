package com.securepm.auth.dto;

import jakarta.validation.constraints.Size;

public class UpdateUserRequest {

    @Size(max = 100)
    public String fullName;

    @jakarta.validation.constraints.Email
    @Size(max = 150)
    public String email;

    @Size(min = 8)
    public String password;

    public String role;

    public Boolean active;
}
