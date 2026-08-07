package com.devopssuite.auth.dto;

import com.fasterxml.jackson.annotation.JsonProperty;
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
        private String email;
        private String password;
        
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
        private String email;
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
        
        private List<String> roles;
        
        @JsonProperty("created_at")
        private Instant createdAt;
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
