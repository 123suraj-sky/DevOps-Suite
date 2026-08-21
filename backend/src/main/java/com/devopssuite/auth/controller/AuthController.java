package com.devopssuite.auth.controller;

import com.devopssuite.auth.dto.AuthDto.*;
import com.devopssuite.auth.service.AuthService;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.bind.annotation.*;

import java.util.UUID;

@RestController
@RequestMapping({"/auth", "/api/auth"})
@RequiredArgsConstructor
public class AuthController {

    private final AuthService authService;

    @PostMapping("/register")
    public ResponseEntity<ApiResponse<SignupResponse>> register(@Valid @RequestBody SignupRequest request) {
        try {
            SignupResponse response = authService.register(request);
            return ResponseEntity.status(HttpStatus.CREATED)
                    .body(ApiResponse.<SignupResponse>builder()
                            .message("User registered successfully")
                            .data(response)
                            .build());
        } catch (IllegalArgumentException e) {
            return ResponseEntity.status(HttpStatus.CONFLICT)
                    .body(ApiResponse.<SignupResponse>builder()
                            .status("error")
                            .message(e.getMessage())
                            .build());
        }
    }

    @PostMapping("/login")
    public ResponseEntity<ApiResponse<LoginResponse>> login(@Valid @RequestBody LoginRequest request) {
        try {
            LoginResponse response = authService.login(request);
            return ResponseEntity.ok(ApiResponse.<LoginResponse>builder()
                    .message("Login successful")
                    .data(response)
                    .build());
        } catch (IllegalArgumentException e) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED)
                    .body(ApiResponse.<LoginResponse>builder()
                            .status("error")
                            .message(e.getMessage())
                            .build());
        }
    }

    @PostMapping("/refresh")
    public ResponseEntity<ApiResponse<RefreshResponse>> refresh(@Valid @RequestBody RefreshRequest request) {
        try {
            RefreshResponse response = authService.refreshAccessToken(request.getRefreshToken());
            return ResponseEntity.ok(ApiResponse.<RefreshResponse>builder()
                    .message("Token refreshed successfully")
                    .data(response)
                    .build());
        } catch (IllegalArgumentException e) {
            return ResponseEntity.status(HttpStatus.BAD_REQUEST)
                    .body(ApiResponse.<RefreshResponse>builder()
                            .status("error")
                            .message(e.getMessage())
                            .build());
        }
    }

    @PostMapping("/logout")
    public ResponseEntity<ApiResponse<Void>> logout(
            HttpServletRequest request,
            @RequestBody(required = false) LogoutRequest logoutRequest) {
        String authHeader = request.getHeader(HttpHeaders.AUTHORIZATION);
        String accessToken = null;
        if (authHeader != null && authHeader.startsWith("Bearer ")) {
            accessToken = authHeader.substring(7);
        }
        String refreshToken = logoutRequest != null ? logoutRequest.getRefreshToken() : null;

        authService.logout(accessToken, refreshToken);
        return ResponseEntity.ok(ApiResponse.<Void>builder()
                .message("Logged out successfully")
                .build());
    }

    @GetMapping("/me")
    public ResponseEntity<ApiResponse<UserResponse>> me() {
        try {
            String userIdStr = (String) SecurityContextHolder.getContext().getAuthentication().getPrincipal();
            UUID userId = UUID.fromString(userIdStr);
            UserResponse response = authService.getCurrentUser(userId);
            return ResponseEntity.ok(ApiResponse.<UserResponse>builder()
                    .message("User profile fetched successfully")
                    .data(response)
                    .build());
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND)
                    .body(ApiResponse.<UserResponse>builder()
                            .status("error")
                            .message(e.getMessage())
                            .build());
        }
    }

    @PostMapping("/forgot-password")
    public ResponseEntity<ApiResponse<Void>> forgotPassword(@Valid @RequestBody ForgotPasswordRequest request) {
        try {
            authService.forgotPassword(request);
            return ResponseEntity.ok(ApiResponse.<Void>builder()
                    .message("Password reset link sent to your email.")
                    .build());
        } catch (IllegalArgumentException e) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND)
                    .body(ApiResponse.<Void>builder()
                            .status("error")
                            .message(e.getMessage())
                            .build());
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(ApiResponse.<Void>builder()
                            .status("error")
                            .message(e.getMessage())
                            .build());
        }
    }

    @PostMapping("/reset-password")
    public ResponseEntity<ApiResponse<Void>> resetPassword(@Valid @RequestBody ResetPasswordRequest request) {
        try {
            authService.resetPassword(request);
            return ResponseEntity.ok(ApiResponse.<Void>builder()
                    .message("Password has been reset successfully.")
                    .build());
        } catch (IllegalArgumentException e) {
            return ResponseEntity.status(HttpStatus.BAD_REQUEST)
                    .body(ApiResponse.<Void>builder()
                            .status("error")
                            .message(e.getMessage())
                            .build());
        }
    }
}
