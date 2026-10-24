package com.securepm.test;

import jakarta.enterprise.context.ApplicationScoped;
import jakarta.inject.Inject;
import jakarta.persistence.EntityManager;
import jakarta.transaction.Transactional;

@ApplicationScoped
public class TestDatabaseCleaner {

    @Inject
    EntityManager em;

    @Transactional
    public void wipeProjectData() {
        wipeData();
    }

    @Transactional
    public void wipeData() {
        em.createNativeQuery(
            "TRUNCATE TABLE notifications, project_invitations, attachments, comments, tasks, project_members, subproject_dependencies, projects RESTART IDENTITY CASCADE")
            .executeUpdate();
        em.createNativeQuery(
            "DELETE FROM users WHERE username != 'admin'")
            .executeUpdate();
        em.createNativeQuery(
            "UPDATE users SET full_name = 'System Administrator', email = 'superadmin@pm.local', role = 'ADMIN', active = true WHERE username = 'admin'")
            .executeUpdate();
    }
}