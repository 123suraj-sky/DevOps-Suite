package com.devopssuite.config;

import com.devopssuite.auth.model.Role;
import com.devopssuite.auth.model.User;
import com.devopssuite.auth.repository.RoleRepository;
import com.devopssuite.auth.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.CommandLineRunner;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

import java.util.HashSet;
import java.util.Set;

/**
 * Seeds a default admin account on first startup when the account does not already exist.
 *
 * Credentials are driven by environment variables (see application.yml → seed.admin.*):
 *   ADMIN_SEED_EMAIL    — admin account e-mail    (default: admin@admin.com, dev only)
 *   ADMIN_SEED_PASSWORD — admin account password  (default: admin, dev only)
 *   ADMIN_SEED_NAME     — admin display name      (default: Administrator)
 *
 * Production checklist:
 *   1. Set all three ADMIN_SEED_* env vars to secure, non-default values.
 *   2. A blank ADMIN_SEED_PASSWORD intentionally disables seeding entirely.
 */
@Component
@RequiredArgsConstructor
@Slf4j
public class DataSeeder implements CommandLineRunner {

    /** Dev-only fallback — matches the application.yml default. */
    private static final String DEV_DEFAULT_PASSWORD = "admin";

    @Value("${seed.admin.email:admin@admin.com}")
    private String adminEmail;

    @Value("${seed.admin.password:admin}")
    private String adminPassword;

    @Value("${seed.admin.name:Administrator}")
    private String adminName;

    private final UserRepository  userRepository;
    private final RoleRepository  roleRepository;
    private final PasswordEncoder passwordEncoder;

    @Override
    @Transactional
    public void run(String... args) {
        seedAdminUser();
    }

    private void seedAdminUser() {
        // Blank password → operator has explicitly opted out of seeding.
        if (adminPassword == null || adminPassword.isBlank()) {
            log.info("DataSeeder: ADMIN_SEED_PASSWORD is blank — skipping admin seed.");
            return;
        }

        if (userRepository.existsByEmail(adminEmail)) {
            log.debug("DataSeeder: admin user '{}' already exists, skipping seed.", adminEmail);
            return;
        }

        // Warn loudly when the password is still the known dev default.
        if (DEV_DEFAULT_PASSWORD.equals(adminPassword)) {
            log.warn("DataSeeder: ADMIN_SEED_PASSWORD is set to the dev default ('admin'). " +
                     "Set ADMIN_SEED_PASSWORD to a strong, unique value before deploying to production.");
        }

        // Ensure ROLE_ADMIN exists (creates it on a fresh DB that has no roles yet).
        Role adminRole = roleRepository.findByName("ROLE_ADMIN")
                .orElseGet(() -> {
                    log.info("DataSeeder: ROLE_ADMIN not found — creating it.");
                    return roleRepository.save(Role.builder()
                            .name("ROLE_ADMIN")
                            .description("Full platform access — admin only")
                            .build());
                });

        Set<Role> roles = new HashSet<>();
        roles.add(adminRole);

        User admin = User.builder()
                .email(adminEmail)
                .passwordHash(passwordEncoder.encode(adminPassword))
                .displayName(adminName)
                .roles(roles)
                .build();

        userRepository.save(admin);
        log.warn("DataSeeder: admin user created (email='{}', name='{}'). " +
                 "Ensure ADMIN_SEED_* env vars are set to production-grade values.", adminEmail, adminName);
    }
}
