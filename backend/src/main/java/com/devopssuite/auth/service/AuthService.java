package com.devopssuite.auth.service;

import com.devopssuite.auth.dto.AuthDto.*;
import com.devopssuite.auth.model.Role;
import com.devopssuite.auth.model.User;
import com.devopssuite.auth.repository.RoleRepository;
import com.devopssuite.auth.repository.UserRepository;
import com.devopssuite.security.JwtUtils;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.util.Collections;
import java.util.Date;
import java.util.HashSet;
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

    private static final String PASSWORD_PATTERN =
            "^(?=.*[a-z])(?=.*[A-Z])(?=.*\\d)(?=.*[@#$%^&+=!]).{8,}$";

    @Transactional
    public SignupResponse register(SignupRequest request) {
        if (!request.getPassword().matches(PASSWORD_PATTERN)) {
            throw new IllegalArgumentException("Password must be at least 8 characters and contain uppercase, lowercase, digit, and special character (@#$%^&+=!)");
        }

        if (userRepository.existsByEmail(request.getEmail())) {
            throw new IllegalArgumentException("Email already registered");
        }

        // Get or create default ROLE_MEMBER role
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

        return SignupResponse.builder()
                .userId(savedUser.getId())
                .email(savedUser.getEmail())
                .displayName(savedUser.getDisplayName())
                .createdAt(savedUser.getCreatedAt())
                .build();
    }

    @Transactional
    public LoginResponse login(LoginRequest request) {
        User user = userRepository.findByEmail(request.getEmail())
                .orElseThrow(() -> new IllegalArgumentException("Invalid email or password"));

        if (!passwordEncoder.matches(request.getPassword(), user.getPasswordHash())) {
            throw new IllegalArgumentException("Invalid email or password");
        }

        // Update last login
        user.setLastLoginAt(Instant.now());
        userRepository.save(user);

        String accessToken = jwtUtils.generateAccessToken(user);
        String refreshToken = jwtUtils.generateRefreshToken(user);

        UserResponse userResponse = UserResponse.builder()
                .userId(user.getId())
                .id(user.getId())
                .email(user.getEmail())
                .displayName(user.getDisplayName())
                .avatarUrl(user.getAvatarUrl())
                .roles(user.getRoles().stream().map(Role::getName).collect(Collectors.toList()))
                .createdAt(user.getCreatedAt())
                .lastLoginAt(user.getLastLoginAt())
                .build();

        return LoginResponse.builder()
                .accessToken(accessToken)
                .accessTokenSnake(accessToken)
                .refreshToken(refreshToken)
                .refreshTokenSnake(refreshToken)
                .expiresIn(86400) // 24 hours
                .user(userResponse)
                .build();
    }

    @Transactional(readOnly = true)
    public UserResponse getCurrentUser(UUID userId) {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new IllegalArgumentException("User not found"));

        return UserResponse.builder()
                .userId(user.getId())
                .id(user.getId())
                .email(user.getEmail())
                .displayName(user.getDisplayName())
                .avatarUrl(user.getAvatarUrl())
                .roles(user.getRoles().stream().map(Role::getName).collect(Collectors.toList()))
                .createdAt(user.getCreatedAt())
                .lastLoginAt(user.getLastLoginAt())
                .build();
    }

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

        User saved = userRepository.save(user);

        return UserResponse.builder()
                .userId(saved.getId())
                .id(saved.getId())
                .email(saved.getEmail())
                .displayName(saved.getDisplayName())
                .avatarUrl(saved.getAvatarUrl())
                .roles(saved.getRoles().stream().map(Role::getName).collect(Collectors.toList()))
                .createdAt(saved.getCreatedAt())
                .lastLoginAt(saved.getLastLoginAt())
                .build();
    }

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
            // Already invalid, no need to blacklist
        }
    }
    @Autowired(required = false)
    private com.devopssuite.auth.repository.PasswordResetTokenRepository tokenRepository;

    @Autowired(required = false)
    private org.springframework.mail.javamail.JavaMailSender mailSender;


    @Transactional
    public void forgotPassword(ForgotPasswordRequest request) {
        if (mailSender == null) {
            throw new UnsupportedOperationException("Password reset via email is not configured on this server.");
        }

        User user = userRepository.findByEmail(request.getEmail())
                .orElseThrow(() -> new IllegalArgumentException("Email address not found"));

        // Revoke any existing tokens
        tokenRepository.deleteByUserId(user.getId());

        // Generate token (expires in 1 hour)
        String token = UUID.randomUUID().toString();
        com.devopssuite.auth.model.PasswordResetToken resetToken = com.devopssuite.auth.model.PasswordResetToken.builder()
                .userId(user.getId())
                .token(token)
                .expiryDate(Instant.now().plusSeconds(3600))
                .build();

        tokenRepository.save(resetToken);

        // Send reset email
        try {
            org.springframework.mail.SimpleMailMessage message = new org.springframework.mail.SimpleMailMessage();
            message.setTo(user.getEmail());
            message.setSubject("DevOps Suite - Password Reset Request");
            message.setText("Click the following link to reset your password: \n" +
                    "http://localhost:5173/reset-password?token=" + token + "\n" +
                    "This link is valid for 1 hour.");
            mailSender.send(message);
        } catch (Exception e) {
            throw new RuntimeException("Failed to send password reset email: " + e.getMessage());
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

        // Update password hash
        user.setPasswordHash(passwordEncoder.encode(request.getPassword()));
        userRepository.save(user);

        // Delete token
        tokenRepository.delete(token);
    }
}
