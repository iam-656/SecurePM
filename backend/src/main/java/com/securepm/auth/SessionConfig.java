package com.securepm.auth;

import io.quarkus.runtime.StartupEvent;
import io.vertx.core.Vertx;
import io.vertx.core.http.CookieSameSite;
import io.vertx.ext.web.Router;
import io.vertx.ext.web.handler.SessionHandler;
import io.vertx.ext.web.sstore.LocalSessionStore;
import io.vertx.ext.web.sstore.SessionStore;
import jakarta.enterprise.event.Observes;
import jakarta.enterprise.inject.Produces;
import jakarta.inject.Singleton;
import org.eclipse.microprofile.config.ConfigProvider;

@Singleton
public class SessionConfig {

    private SessionStore sessionStore;

    @Produces
    @Singleton
    public SessionStore sessionStore(Vertx vertx) {
        if (sessionStore == null) {
            sessionStore = LocalSessionStore.create(vertx);
        }
        return sessionStore;
    }

    void init(@Observes StartupEvent ev, Vertx vertx, Router router) {
        SessionHandler handler = SessionHandler.create(sessionStore(vertx));
        handler.setSessionCookieName(
                ConfigProvider.getConfig().getValue("quarkus.http.session.cookie.name", String.class));
        handler.setCookieSecureFlag(
                ConfigProvider.getConfig().getValue("quarkus.http.session.cookie.secure", Boolean.class));
        handler.setCookieHttpOnlyFlag(
                ConfigProvider.getConfig().getValue("quarkus.http.session.cookie.http-only", Boolean.class));
        handler.setCookieSameSite(
                CookieSameSite.valueOf(
                        ConfigProvider.getConfig().getValue("quarkus.http.session.cookie.same-site", String.class)));
        handler.setSessionCookiePath(
                ConfigProvider.getConfig().getValue("quarkus.http.session.cookie.path", String.class));
        Long timeoutSeconds = ConfigProvider.getConfig().getOptionalValue("quarkus.http.session.timeout", Long.class).orElse(1800L);
        handler.setSessionTimeout(timeoutSeconds * 1000L);
        // Register BEFORE RESTEasy routes so routingContext.session() is available to filters
        router.route().order(-100).handler(handler);
    }
}