package com.devopssuite.auth.service;

import com.devopssuite.auth.dto.AuthDto.*;
import com.devopssuite.auth.model.Role;
import com.devopssuite.auth.model.User;
import com.devopssuite.auth.repository.RoleRepository;
import com.devopssuite.auth.repository.UserFollowRepository;
import com.devopssuite.auth.repository.UserRepository;
import com.devopssuite.security.JwtUtils;
import com.google.api.client.googleapis.auth.oauth2.GoogleIdToken;
import com.google.api.client.googleapis.auth.oauth2.GoogleIdTokenVerifier;
import com.google.api.client.http.javanet.NetHttpTransport;
import com.google.api.client.json.gson.GsonFactory;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.util.Collections;
import java.util.Date;
import java.util.HashSet;
import java.util.List;
import java.util.UUID;
import java.util.concurrent.TimeUnit;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class AuthService {

    private final UserRepository userRepository;
    private final RoleRepository roleRepository;
    private final PasswordEncoder passwordEncoder;
    private final JwtUtils jwtUtils;
    private final StringRedisTemplate redisTemplate;
    private final UserFollowRepository followRepository;

    @Value("${spring.security.oauth2.client.registration.google.client-id}")
    private String googleClientId;

    private static final String PASSWORD_PATTERN =
            "^(?=.*[a-z])(?=.*[A-Z])(?=.*\\d)(?=.*[@#$%^&+=!]).{8,}$";

    // ── Internal helper: map User → UserResponse (self-view, no isFollowing) ─

    /**
     * Builds a {@link UserResponse} for the profile owner themselves.
     * Follow counts and view count are populated; {@code isFollowing} is null
     * (you cannot follow yourself).
     */
    private UserResponse toSelfResponse(User user) {
        return UserResponse.builder()
                .userId(user.getId())
                .id(user.getId())
                .email(user.getEmail())
                .displayName(user.getDisplayName())
                .avatarUrl(user.getAvatarUrl())
                .gender(user.getGender())
                .roles(user.getRoles().stream().map(Role::getName).collect(Collectors.toList()))
                .createdAt(user.getCreatedAt())
                .lastLoginAt(user.getLastLoginAt())
                .followersCount(followRepository.countByFollowingId(user.getId()))
                .followingCount(followRepository.countByFollowerId(user.getId()))
                .isFollowing(null)   // self-view — no follow relationship to check
                .profileViewCount(user.getProfileViewCount())
                .build();
    }

    // ── Register ──────────────────────────────────────────────────────────────

    @Transactional
    public LoginResponse register(SignupRequest request) {
        if (!request.getPassword().matches(PASSWORD_PATTERN)) {
            throw new IllegalArgumentException("Password must be at least 8 characters and contain uppercase, lowercase, digit, and special character (@#$%^&+=!)");
        }

        if (userRepository.existsByEmail(request.getEmail())) {
            throw new IllegalArgumentException("Email already registered");
        }

        Role memberRole = roleRepository.findByName("ROLE_MEMBER")
                .orElseGet(() -> roleRepository.save(
                        Role.builder()
                                .name("ROLE_MEMBER")
                                .description("Default member role")
                                .build()
                ));

        User user = User.builder()
                .email(request.getEmail())
                .passwordHash(passwordEncoder.encode(request.getPassword()))
                .displayName(request.getDisplayName())
                .roles(new HashSet<>(Collections.singletonList(memberRole)))
                .build();

        User savedUser = userRepository.save(user);

        String accessToken  = jwtUtils.generateAccessToken(savedUser);
        String refreshToken = jwtUtils.generateRefreshToken(savedUser);

        return LoginResponse.builder()
                .accessToken(accessToken)
                .accessTokenSnake(accessToken)
                .refreshToken(refreshToken)
                .refreshTokenSnake(refreshToken)
                .expiresIn(86400)
                .user(toSelfResponse(savedUser))
                .build();
    }

    // ── Login ─────────────────────────────────────────────────────────────────

    @Transactional
    public LoginResponse login(LoginRequest request) {
        User user = userRepository.findByEmail(request.getEmail())
                .orElseThrow(() -> new IllegalArgumentException("Invalid email or password"));

        if (!passwordEncoder.matches(request.getPassword(), user.getPasswordHash())) {
            throw new IllegalArgumentException("Invalid email or password");
        }

        user.setLastLoginAt(Instant.now());
        userRepository.save(user);

        String accessToken  = jwtUtils.generateAccessToken(user);
        String refreshToken = jwtUtils.generateRefreshToken(user);

        return LoginResponse.builder()
                .accessToken(accessToken)
                .accessTokenSnake(accessToken)
                .refreshToken(refreshToken)
                .refreshTokenSnake(refreshToken)
                .expiresIn(86400)
                .user(toSelfResponse(user))
                .build();
    }

    // ── Google OAuth2 login / register ────────────────────────────────────────

    /**
     * Verifies a Google ID token issued by the frontend (Google Identity Services),
     * then finds or creates the corresponding local user and returns an app JWT pair.
     *
     * Flow:
     *  1. Verify the id_token signature and audience against GOOGLE_CLIENT_ID.
     *  2. Look up by (oauth_provider=google, oauth_id=sub). If found → returning Google user.
     *  3. If not found by oauthId, look up by email (existing email/password account).
     *     If found → link the Google identity to that account.
     *  4. If not found at all → create a new user (password_hash=null, provider=google).
     *  5. Issue app JWT pair and return LoginResponse.
     */
    @Transactional
    public LoginResponse loginWithGoogle(GoogleAuthRequest request) {
        String googleSub;
        String email;
        String name;
        String pictureUrl;

        if (request.getIdToken() != null && !request.getIdToken().isBlank()) {
            // 1a. Verify the Google id_token
            GoogleIdTokenVerifier verifier = new GoogleIdTokenVerifier.Builder(
                    new NetHttpTransport(), GsonFactory.getDefaultInstance())
                    .setAudience(List.of(googleClientId))
                    .build();

            GoogleIdToken idToken;
            try {
                idToken = verifier.verify(request.getIdToken());
            } catch (Exception e) {
                throw new IllegalArgumentException("Failed to verify Google ID token: " + e.getMessage());
            }

            if (idToken == null) {
                throw new IllegalArgumentException("Invalid or expired Google ID token");
            }

            GoogleIdToken.Payload payload = idToken.getPayload();
            googleSub  = payload.getSubject();
            email      = payload.getEmail();
            name       = (String) payload.get("name");
            pictureUrl = (String) payload.get("picture");
        } else if (request.getAccessToken() != null && !request.getAccessToken().isBlank()) {
            // 1b. Fetch Google user info using the access_token
            org.springframework.web.client.RestTemplate rest = new org.springframework.web.client.RestTemplate();
            org.springframework.http.HttpHeaders headers = new org.springframework.http.HttpHeaders();
            headers.set("Authorization", "Bearer " + request.getAccessToken());
            headers.set("Accept", "application/json");
            org.springframework.http.HttpEntity<Void> entity = new org.springframework.http.HttpEntity<>(headers);

            try {
                @SuppressWarnings("unchecked")
                java.util.Map<String, Object> userInfo = rest.exchange(
                        "https://www.googleapis.com/oauth2/v3/userinfo",
                        org.springframework.http.HttpMethod.GET,
                        entity,
                        new org.springframework.core.ParameterizedTypeReference<java.util.Map<String, Object>>() {}
                ).getBody();

                if (userInfo == null || !userInfo.containsKey("sub")) {
                    throw new IllegalArgumentException("Failed to fetch user info from Google");
                }

                googleSub  = (String) userInfo.get("sub");
                email      = (String) userInfo.get("email");
                name       = (String) userInfo.get("name");
                pictureUrl = (String) userInfo.get("picture");
            } catch (Exception e) {
                throw new IllegalArgumentException("Failed to authenticate with Google: " + e.getMessage());
            }
        } else {
            throw new IllegalArgumentException("Google token is required");
        }

        if (email == null || email.isBlank()) {
            throw new IllegalArgumentException("No email address associated with this Google account");
        }

        // 2. Look up by google sub first (fastest path for returning users)
        User user = userRepository.findByOauthProviderAndOauthId("google", googleSub)
                .orElseGet(() -> {
                    // 3. Fall back to email lookup — link existing email/password account
                    return userRepository.findByEmail(email)
                            .map(existing -> {
                                existing.setOauthProvider("google");
                                existing.setOauthId(googleSub);
                                // Only set avatar if the user has none
                                if (existing.getAvatarUrl() == null && pictureUrl != null) {
                                    existing.setAvatarUrl(pictureUrl);
                                }
                                return userRepository.save(existing);
                            })
                            // 4. Create a brand-new Google-only user
                            .orElseGet(() -> {
                                Role memberRole = roleRepository.findByName("ROLE_MEMBER")
                                        .orElseGet(() -> roleRepository.save(
                                                Role.builder()
                                                        .name("ROLE_MEMBER")
                                                        .description("Default member role")
                                                        .build()
                                        ));

                                String displayName = (name != null && !name.isBlank())
                                        ? name : email.split("@")[0];

                                User newUser = User.builder()
                                        .email(email)
                                        .passwordHash(null)   // no password for OAuth users
                                        .displayName(displayName)
                                        .avatarUrl(pictureUrl)
                                        .oauthProvider("google")
                                        .oauthId(googleSub)
                                        .roles(new HashSet<>(Collections.singletonList(memberRole)))
                                        .build();
                                return userRepository.save(newUser);
                            });
                });

        // 5. Update last login timestamp and issue app JWT pair
        user.setLastLoginAt(Instant.now());
        userRepository.save(user);

        String accessToken  = jwtUtils.generateAccessToken(user);
        String refreshToken = jwtUtils.generateRefreshToken(user);

        return LoginResponse.builder()
                .accessToken(accessToken)
                .accessTokenSnake(accessToken)
                .refreshToken(refreshToken)
                .refreshTokenSnake(refreshToken)
                .expiresIn(86400)
                .user(toSelfResponse(user))
                .build();
    }

    // ── GitHub OAuth2 login / register ────────────────────────────────────────

    @Value("${app.github.client-id}")
    private String githubClientId;

    @Value("${app.github.client-secret}")
    private String githubClientSecret;

    /**
     * Exchanges a GitHub authorization code for an access token, fetches the
     * GitHub user profile (and primary email if private), then finds or creates
     * the local user and returns an app JWT pair.
     *
     * Flow:
     *  1. POST code + client credentials to GitHub to get access_token.
     *  2. GET https://api.github.com/user with the access_token.
     *  3. If email is null/private, GET https://api.github.com/user/emails.
     *  4. Look up by (oauth_provider=github, oauth_id=githubId). Returning user?
     *  5. Fall back to email lookup — link existing email/password account.
     *  6. Create brand-new GitHub-only user if still not found.
     *  7. Issue app JWT pair and return LoginResponse.
     */
    @Transactional
    public LoginResponse loginWithGithub(GithubAuthRequest request) {
        org.springframework.web.client.RestTemplate rest = new org.springframework.web.client.RestTemplate();

        // 1. Exchange code for access_token
        String tokenUrl = "https://github.com/login/oauth/access_token"
                + "?client_id=" + githubClientId
                + "&client_secret=" + githubClientSecret
                + "&code=" + request.getCode();

        org.springframework.http.HttpHeaders tokenHeaders = new org.springframework.http.HttpHeaders();
        tokenHeaders.set("Accept", "application/json");
        org.springframework.http.HttpEntity<Void> tokenEntity = new org.springframework.http.HttpEntity<>(tokenHeaders);

        @SuppressWarnings("unchecked")
        java.util.Map<String, Object> tokenResponse = rest.exchange(
                tokenUrl,
                org.springframework.http.HttpMethod.POST,
                tokenEntity,
                new org.springframework.core.ParameterizedTypeReference<java.util.Map<String, Object>>() {}
        ).getBody();

        if (tokenResponse == null || !tokenResponse.containsKey("access_token")) {
            throw new IllegalArgumentException("Failed to exchange GitHub code for access token");
        }
        String accessToken = (String) tokenResponse.get("access_token");

        // 2. Fetch GitHub user profile
        org.springframework.http.HttpHeaders apiHeaders = new org.springframework.http.HttpHeaders();
        apiHeaders.set("Authorization", "Bearer " + accessToken);
        apiHeaders.set("Accept", "application/vnd.github+json");
        org.springframework.http.HttpEntity<Void> apiEntity = new org.springframework.http.HttpEntity<>(apiHeaders);

        @SuppressWarnings("unchecked")
        java.util.Map<String, Object> githubUser = rest.exchange(
                "https://api.github.com/user",
                org.springframework.http.HttpMethod.GET,
                apiEntity,
                new org.springframework.core.ParameterizedTypeReference<java.util.Map<String, Object>>() {}
        ).getBody();

        if (githubUser == null) {
            throw new IllegalArgumentException("Failed to fetch GitHub user profile");
        }

        String githubId  = String.valueOf(githubUser.get("id"));
        String login     = (String) githubUser.get("login");
        String name      = (String) githubUser.get("name");
        String avatarUrl = (String) githubUser.get("avatar_url");
        String email     = (String) githubUser.get("email");

        // 3. If email is null/private, fetch from /user/emails
        if (email == null || email.isBlank()) {
            try {
                @SuppressWarnings("unchecked")
                java.util.List<java.util.Map<String, Object>> emails = rest.exchange(
                        "https://api.github.com/user/emails",
                        org.springframework.http.HttpMethod.GET,
                        apiEntity,
                        new org.springframework.core.ParameterizedTypeReference<java.util.List<java.util.Map<String, Object>>>() {}
                ).getBody();
                if (emails != null) {
                    email = emails.stream()
                            .filter(e -> Boolean.TRUE.equals(e.get("primary")) && Boolean.TRUE.equals(e.get("verified")))
                            .map(e -> (String) e.get("email"))
                            .findFirst()
                            .orElse(null);
                }
            } catch (Exception ignored) {
                // best-effort
            }
        }

        if (email == null || email.isBlank()) {
            throw new IllegalArgumentException(
                    "No verified email found on your GitHub account. " +
                    "Please make your primary email public or add a verified email and try again.");
        }

        final String resolvedEmail = email;

        // 4-6. Find or create user (same pattern as Google)
        User user = userRepository.findByOauthProviderAndOauthId("github", githubId)
                .orElseGet(() -> userRepository.findByEmail(resolvedEmail)
                        .map(existing -> {
                            existing.setOauthProvider("github");
                            existing.setOauthId(githubId);
                            if (existing.getAvatarUrl() == null && avatarUrl != null) {
                                existing.setAvatarUrl(avatarUrl);
                            }
                            return userRepository.save(existing);
                        })
                        .orElseGet(() -> {
                            Role memberRole = roleRepository.findByName("ROLE_MEMBER")
                                    .orElseGet(() -> roleRepository.save(
                                            Role.builder()
                                                    .name("ROLE_MEMBER")
                                                    .description("Default member role")
                                                    .build()
                                    ));

                            String displayName = (name != null && !name.isBlank()) ? name
                                    : (login != null && !login.isBlank()) ? login
                                    : resolvedEmail.split("@")[0];

                            User newUser = User.builder()
                                    .email(resolvedEmail)
                                    .passwordHash(null)
                                    .displayName(displayName)
                                    .avatarUrl(avatarUrl)
                                    .oauthProvider("github")
                                    .oauthId(githubId)
                                    .roles(new HashSet<>(Collections.singletonList(memberRole)))
                                    .build();
                            return userRepository.save(newUser);
                        }));

        // 7. Update last login and issue JWT pair
        user.setLastLoginAt(Instant.now());
        userRepository.save(user);

        String appAccessToken  = jwtUtils.generateAccessToken(user);
        String appRefreshToken = jwtUtils.generateRefreshToken(user);

        return LoginResponse.builder()
                .accessToken(appAccessToken)
                .accessTokenSnake(appAccessToken)
                .refreshToken(appRefreshToken)
                .refreshTokenSnake(appRefreshToken)
                .expiresIn(86400)
                .user(toSelfResponse(user))
                .build();
    }

    // ── Get current user (GET /api/auth/me) ───────────────────────────────────

    @Transactional(readOnly = true)
    public UserResponse getCurrentUser(UUID userId) {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new IllegalArgumentException("User not found"));
        return toSelfResponse(user);
    }

    // ── Update profile ────────────────────────────────────────────────────────

    @Transactional
    public UserResponse updateProfile(UUID userId, UpdateProfileRequest request) {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new IllegalArgumentException("User not found"));

        if (request.getDisplayName() != null && !request.getDisplayName().isBlank()) {
            user.setDisplayName(request.getDisplayName().trim());
        }
        if (request.getAvatarUrl() != null) {
            user.setAvatarUrl(request.getAvatarUrl().trim());
        }
        if (request.getGender() != null) {
            user.setGender(request.getGender());
        }

        User saved = userRepository.save(user);
        return toSelfResponse(saved);
    }

    // ── Refresh token ─────────────────────────────────────────────────────────

    @Transactional(readOnly = true)
    public RefreshResponse refreshAccessToken(String refreshToken) {
        if (!jwtUtils.validateToken(refreshToken)) {
            throw new IllegalArgumentException("Invalid or expired refresh token");
        }

        String blacklistKey = "blacklist:" + refreshToken;
        if (Boolean.TRUE.equals(redisTemplate.hasKey(blacklistKey))) {
            throw new IllegalArgumentException("Refresh token has been revoked");
        }

        String userId = jwtUtils.getUserIdFromToken(refreshToken);
        User user = userRepository.findById(UUID.fromString(userId))
                .orElseThrow(() -> new IllegalArgumentException("User not found"));

        String newAccessToken = jwtUtils.generateAccessToken(user);
        return RefreshResponse.builder()
                .accessToken(newAccessToken)
                .accessTokenSnake(newAccessToken)
                .expiresIn(86400)
                .build();
    }

    // ── Logout ────────────────────────────────────────────────────────────────

    public void logout(String accessToken, String refreshToken) {
        if (accessToken != null && !accessToken.isBlank()) {
            blacklistToken(accessToken);
        }
        if (refreshToken != null && !refreshToken.isBlank()) {
            blacklistToken(refreshToken);
        }
    }

    private void blacklistToken(String token) {
        try {
            if (jwtUtils.validateToken(token)) {
                Date expiry = jwtUtils.getExpirationFromToken(token);
                long ttlMs = expiry.getTime() - System.currentTimeMillis();
                if (ttlMs > 0) {
                    redisTemplate.opsForValue().set(
                            "blacklist:" + token,
                            "true",
                            ttlMs,
                            TimeUnit.MILLISECONDS
                    );
                }
            }
        } catch (Exception ignored) {
            // Already invalid — no need to blacklist
        }
    }

    // ── Password reset (optional — requires SMTP config) ──────────────────────

    @Autowired(required = false)
    private com.devopssuite.auth.repository.PasswordResetTokenRepository tokenRepository;

    @Autowired(required = false)
    private org.springframework.mail.javamail.JavaMailSender mailSender;

    @Value("${app.frontend-url:http://localhost:5173}")
    private String frontendUrl;

    @Value("${spring.mail.from:noreply@devopssuite.local}")
    private String mailFrom;

    @Value("${spring.mail.host:}")
    private String mailHost;

    @Transactional
    public void forgotPassword(ForgotPasswordRequest request) {
        // Guard: SMTP is not configured when MAIL_HOST is blank.
        // We still return a generic 200 to avoid leaking whether the email exists.
        if (mailHost == null || mailHost.isBlank()) {
            // Log for operator visibility; caller always gets a success response.
            org.slf4j.LoggerFactory.getLogger(AuthService.class)
                    .warn("AuthService.forgotPassword: MAIL_HOST is not configured — reset email not sent for '{}'.", request.getEmail());
            return;
        }

        // Look up user — but do NOT expose whether the address is registered.
        // We silently succeed if the email is unknown (prevents enumeration).
        java.util.Optional<User> userOpt = userRepository.findByEmail(request.getEmail());
        if (userOpt.isEmpty()) {
            return; // silent success
        }
        User user = userOpt.get();

        tokenRepository.deleteByUserId(user.getId());

        String token = UUID.randomUUID().toString();
        com.devopssuite.auth.model.PasswordResetToken resetToken = com.devopssuite.auth.model.PasswordResetToken.builder()
                .userId(user.getId())
                .token(token)
                .expiryDate(Instant.now().plusSeconds(3600))
                .build();
        tokenRepository.save(resetToken);

        try {
            org.springframework.mail.SimpleMailMessage message = new org.springframework.mail.SimpleMailMessage();
            message.setFrom(mailFrom);
            message.setTo(user.getEmail());
            message.setSubject("DevOps Suite — Password Reset Request");
            message.setText(
                    "Hi " + user.getDisplayName() + ",\n\n" +
                    "We received a request to reset your DevOps Suite password.\n\n" +
                    "Click the link below to choose a new password (valid for 1 hour):\n" +
                    frontendUrl + "/reset-password?token=" + token + "\n\n" +
                    "If you did not request a password reset, you can safely ignore this email.\n\n" +
                    "— The DevOps Suite Team"
            );
            mailSender.send(message);
        } catch (Exception e) {
            throw new RuntimeException("Failed to send password reset email. Please try again later.");
        }
    }

    @Transactional
    public void resetPassword(ResetPasswordRequest request) {
        com.devopssuite.auth.model.PasswordResetToken token = tokenRepository.findByToken(request.getToken())
                .orElseThrow(() -> new IllegalArgumentException("Invalid or expired reset token"));

        if (token.getExpiryDate().isBefore(Instant.now())) {
            tokenRepository.delete(token);
            throw new IllegalArgumentException("Password reset token has expired");
        }

        if (!request.getPassword().matches(PASSWORD_PATTERN)) {
            throw new IllegalArgumentException("Password must be at least 8 characters and contain uppercase, lowercase, digit, and special character (@#$%^&+=!)");
        }

        User user = userRepository.findById(token.getUserId())
                .orElseThrow(() -> new IllegalArgumentException("User not found"));

        user.setPasswordHash(passwordEncoder.encode(request.getPassword()));
        userRepository.save(user);
        tokenRepository.delete(token);
    }
}
