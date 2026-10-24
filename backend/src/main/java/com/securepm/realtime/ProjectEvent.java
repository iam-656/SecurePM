package com.securepm.realtime;

import java.util.HashMap;
import java.util.Map;

public class ProjectEvent {

    public ProjectEventType type;
    public Long projectId;
    public Long taskId;
    public Map<String, Object> payload;

    public ProjectEvent() {
        this.payload = new HashMap<>();
    }

    public ProjectEvent(ProjectEventType type, Long projectId, Long taskId, Map<String, Object> payload) {
        this.type = type;
        this.projectId = projectId;
        this.taskId = taskId;
        this.payload = payload != null ? payload : new HashMap<>();
    }

    public ProjectEvent(ProjectEventType type, Long projectId, Long taskId) {
        this(type, projectId, taskId, null);
    }
}
