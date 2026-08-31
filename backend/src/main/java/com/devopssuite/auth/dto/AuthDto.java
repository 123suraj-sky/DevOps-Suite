package com.devopssuite.auth.dto;

import com.fasterxml.jackson.annotation.JsonProperty;
import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.Instant;
import java.util.List;
import java.util.UUID;

public class AuthDto {

    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    public static class SignupRequest {

        @NotBlank(message = "Email is required")
        @Email(message = "Invalid email format")
        private String email;

        @NotBlank(message = "Password is required")
        @Size(min = 8, message = "Password must be at least 8 characters")
        private String password;

        @NotBlank(message = "Display name is required")
        @JsonProperty("display_name")
        private String displayName;
    }

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class SignupResponse {
        @JsonProperty("user_id")
        private UUID userId;
        private String email;

        @JsonProperty("display_name")
        private String displayName;

        @JsonProperty("created_at")
        private Instant createdAt;
    }

    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    public static class LoginRequest {

        @NotBlank(message = "Email is required")
        private String email;

        @NotBlank(message = "Password is required")
        private String password;
    }

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class LoginResponse {
        @JsonProperty("access_token")
        private String accessTokenSnake;

        @JsonProperty("refresh_token")
        private String refreshTokenSnake;

        @JsonProperty("expires_in")
        private long expiresIn;

        @JsonProperty("token_type")
        @Builder.Default
        private String tokenType = "Bearer";

        // CamelCase support for existing frontend compatibility
        private String accessToken;
        private String refreshToken;
        private UserResponse user;
    }

    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    public static class RefreshRequest {

        @NotBlank(message = "Refresh token is required")
        @JsonProperty("refresh_token")
        private String refreshToken;
    }

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class RefreshResponse {
        @JsonProperty("access_token")
        private String accessTokenSnake;

        @JsonProperty("expires_in")
        private long expiresIn;

        // CamelCase support for existing frontend compatibility
        private String accessToken;
    }

    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    public static class LogoutRequest {
        @JsonProperty("refresh_token")
        private String refreshToken;
    }

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class UserResponse {
        @JsonProperty("user_id")
        private UUID userId;

        private UUID id; // For frontend compatibility
        private String email;

        @JsonProperty("display_name")
        private String displayName;

        @JsonProperty("avatar_url")
        private String avatarUrl;

        private List<String> roles;

        @JsonProperty("created_at")
        private Instant createdAt;

        @JsonProperty("last_login_at")
        private Instant lastLoginAt;
    }

    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    public static class UpdateProfileRequest {
        @NotBlank(message = "Display name is required")
        @JsonProperty("display_name")
        private String displayName;

        @JsonProperty("avatar_url")
        private String avatarUrl;
    }

    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    public static class ForgotPasswordRequest {
        @NotBlank(message = "Email is required")
        @Email(message = "Invalid email format")
        private String email;
    }

    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    public static class ResetPasswordRequest {
        @NotBlank(message = "Token is required")
        private String token;

        @NotBlank(message = "Password is required")
        @Size(min = 8, message = "Password must be at least 8 characters")
        private String password;
    }

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class ApiResponse<T> {
        @Builder.Default
        private String status = "success";
        private String message;
        private T data;
    }
}
