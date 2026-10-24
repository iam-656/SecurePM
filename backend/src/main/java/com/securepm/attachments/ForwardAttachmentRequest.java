package com.securepm.attachments;

import java.util.List;

public class ForwardAttachmentRequest {
    public List<Long> targetProjectIds;

    public ForwardAttachmentRequest() {
    }

    public ForwardAttachmentRequest(List<Long> targetProjectIds) {
        this.targetProjectIds = targetProjectIds;
    }
}
