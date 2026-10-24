package com.securepm.auth.dto;

import jakarta.validation.constraints.Size;

public class UpdateProfileRequest {

    @Size(max = 100)
    public String fullName;

    public String currentPassword;

    @Size(min = 8)
    public String newPassword;
}
