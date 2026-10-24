package com.securepm.invitations.dto;

import jakarta.validation.constraints.NotNull;

public class CreateInvitationRequest {

    @NotNull(message = "userId is required")
    public Long userId;
}
