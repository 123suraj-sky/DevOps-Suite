package com.devopssuite.config;

import com.devopssuite.auth.model.Role;
import com.devopssuite.auth.model.User;
import com.devopssuite.auth.repository.RoleRepository;
import com.devopssuite.auth.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.boot.CommandLineRunner;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

import java.util.HashSet;
import java.util.Set;

/**
 * Seeds a default admin account on every startup when it does not already exist.
 *
 * TODO: Replace this hardcoded seed approach with a proper admin provisioning
 *       mechanism — e.g. environment-variable-driven credentials, a one-time
 *       setup endpoint, or an external identity provider — before any production
 *       deployment. Tracked in .agents/TASKS.md.
 *
 * Default credentials (DEV ONLY):
 *   email:    admin
 *   password: admin
 */
@Component
@RequiredArgsConstructor
@Slf4j
public class DataSeeder implements CommandLineRunner {

    // TODO: Pull these from environment variables instead of hardcoding.
    //       See TASKS.md — "Replace hardcoded admin seed credentials".
    private static final String ADMIN_EMAIL    = "admin@admin.com";
    private static final String ADMIN_PASSWORD = "admin";
    private static final String ADMIN_NAME     = "Administrator";

    private final UserRepository     userRepository;
    private final RoleRepository     roleRepository;
    private final PasswordEncoder    passwordEncoder;

    @Override
    @Transactional
    public void run(String... args) {
        seedAdminUser();
    }

    private void seedAdminUser() {
        if (userRepository.existsByEmail(ADMIN_EMAIL)) {
            log.debug("DataSeeder: admin user already exists, skipping seed.");
            return;
        }

        // Ensure ROLE_ADMIN exists (create it if a fresh DB has no roles yet)
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
                .email(ADMIN_EMAIL)
                .passwordHash(passwordEncoder.encode(ADMIN_PASSWORD))
                .displayName(ADMIN_NAME)
                .roles(roles)
                .build();

        userRepository.save(admin);
        log.warn("DataSeeder: default admin user created (email='{}')." +
                 " This is a DEV-only seed — replace before going to production.", ADMIN_EMAIL);
    }
}
