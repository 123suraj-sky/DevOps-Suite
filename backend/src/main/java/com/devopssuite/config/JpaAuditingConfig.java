package com.devopssuite.config;

import org.springframework.context.annotation.Configuration;
import org.springframework.data.jpa.repository.config.EnableJpaAuditing;

/**
 * Isolates @EnableJpaAuditing from the main application class so that
 * @WebMvcTest slices don't attempt to initialize the JPA auditing handler
 * (which requires a JPA metamodel that isn't available in a web-only context).
 */
@Configuration
@EnableJpaAuditing(auditorAwareRef = "securityAuditorAware")
public class JpaAuditingConfig {
}
