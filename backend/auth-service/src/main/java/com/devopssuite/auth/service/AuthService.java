package com.devopssuite.auth.service;

import com.devopssuite.auth.dto.AuthDto.*;
import com.devopssuite.auth.model.Role;
import com.devopssuite.auth.model.User;
import com.devopssuite.auth.repository.RoleRepository;
import com.devopssuite.auth.repository.UserRepository;
import com.devopssuite.auth.security.JwtUtils;
import lombok.RequiredArgsConstructor;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.util.Collections;
import java.util.HashSet;
import java.util.UUID;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class AuthService {

    private final UserRepository userRepository;
    private final RoleRepository roleRepository;
    private final PasswordEncoder passwordEncoder;
    private final JwtUtils jwtUtils;

    @Transactional
    public SignupResponse register(SignupRequest request) {
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
                .roles(user.getRoles().stream().map(Role::getName).collect(Collectors.toList()))
                .createdAt(user.getCreatedAt())
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
                .roles(user.getRoles().stream().map(Role::getName).collect(Collectors.toList()))
                .createdAt(user.getCreatedAt())
                .build();
    }
}
