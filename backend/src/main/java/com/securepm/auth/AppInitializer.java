package com.securepm.auth;

import io.quarkus.runtime.StartupEvent;
import jakarta.enterprise.event.Observes;
import jakarta.inject.Singleton;
import jakarta.transaction.Transactional;
import org.mindrot.jbcrypt.BCrypt;

@Singleton
public class AppInitializer {

    @Transactional
    void onStart(@Observes StartupEvent ev) {
        try {
            if (com.securepm.auth.User.count() == 0) {
                String defaultPassword = System.getenv().getOrDefault(
                        "APP_BOOTSTRAP_ADMIN_PASSWORD", "ChangeMeNow123!");

                User admin = new User();
                admin.username = "admin";
                admin.email = "superadmin@pm.local";
                admin.passwordHash = BCrypt.hashpw(defaultPassword, BCrypt.gensalt(12));
                admin.fullName = "System Administrator";
                admin.role = Role.ADMIN;
                admin.active = true;
                admin.createdBy = null;
                admin.persist();

                // Log creation without exposing the password (rule 6)
                java.util.logging.Logger.getLogger(AppInitializer.class.getName())
                        .info("Bootstrap admin user created. Password from env APP_BOOTSTRAP_ADMIN_PASSWORD.");
            }
        } catch (Exception e) {
            // Schema may not be ready yet (e.g., tests with H2); admin can be created via API
            java.util.logging.Logger.getLogger(AppInitializer.class.getName())
                    .warning("Could not bootstrap admin user: " + e.getMessage());
        }
    }
}
