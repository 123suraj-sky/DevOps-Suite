package com.devopssuite.auth.controller;

import com.devopssuite.auth.dto.AuthDto.*;
import com.devopssuite.auth.service.AuthService;
import com.devopssuite.auth.service.AvatarStorageService;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.util.UUID;

@RestController
@RequestMapping({"/auth", "/api/auth"})
@RequiredArgsConstructor
public class AuthController {

    private final AuthService authService;
    private final AvatarStorageService avatarStorageService;

    @PostMapping("/register")
    public ResponseEntity<ApiResponse<LoginResponse>> register(@Valid @RequestBody SignupRequest request) {
        try {
            LoginResponse response = authService.register(request);
            return ResponseEntity.status(HttpStatus.CREATED)
                    .body(ApiResponse.<LoginResponse>builder()
                            .message("User registered successfully")
                            .data(response)
                            .build());
        } catch (IllegalArgumentException e) {
            return ResponseEntity.status(HttpStatus.CONFLICT)
                    .body(ApiResponse.<LoginResponse>builder()
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

    @PutMapping("/me")
    public ResponseEntity<ApiResponse<UserResponse>> updateProfile(@Valid @RequestBody UpdateProfileRequest request) {
        try {
            String userIdStr = (String) SecurityContextHolder.getContext().getAuthentication().getPrincipal();
            UUID userId = UUID.fromString(userIdStr);
            UserResponse response = authService.updateProfile(userId, request);
            return ResponseEntity.ok(ApiResponse.<UserResponse>builder()
                    .message("Profile updated successfully")
                    .data(response)
                    .build());
        } catch (IllegalArgumentException e) {
            return ResponseEntity.status(HttpStatus.BAD_REQUEST)
                    .body(ApiResponse.<UserResponse>builder()
                            .status("error")
                            .message(e.getMessage())
                            .build());
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(ApiResponse.<UserResponse>builder()
                            .status("error")
                            .message(e.getMessage())
                            .build());
        }
    }

    @PatchMapping("/me")
    public ResponseEntity<ApiResponse<UserResponse>> patchProfile(@RequestBody UpdateProfileRequest request) {
        return updateProfile(request);
    }

    @PostMapping(value = "/me/avatar", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    public ResponseEntity<ApiResponse<UserResponse>> uploadAvatar(
            @RequestParam("file") MultipartFile file) {
        try {
            String userIdStr = (String) SecurityContextHolder.getContext().getAuthentication().getPrincipal();
            UUID userId = UUID.fromString(userIdStr);

            // Fetch current user to get the old avatar path for cleanup
            UserResponse current = authService.getCurrentUser(userId);
            String oldAvatarUrl = current.getAvatarUrl();

            // Persist the new file and build the public URL
            String newAvatarUrl = avatarStorageService.store(file);

            // Update the profile with the new URL
            UpdateProfileRequest updateRequest = new UpdateProfileRequest();
            updateRequest.setDisplayName(current.getDisplayName());
            updateRequest.setAvatarUrl(newAvatarUrl);
            updateRequest.setGender(current.getGender());
            UserResponse updated = authService.updateProfile(userId, updateRequest);

            // Delete the old file after a successful save
            avatarStorageService.delete(oldAvatarUrl);

            return ResponseEntity.ok(ApiResponse.<UserResponse>builder()
                    .message("Avatar uploaded successfully")
                    .data(updated)
                    .build());
        } catch (IllegalArgumentException e) {
            return ResponseEntity.status(HttpStatus.BAD_REQUEST)
                    .body(ApiResponse.<UserResponse>builder()
                            .status("error")
                            .message(e.getMessage())
                            .build());
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(ApiResponse.<UserResponse>builder()
                            .status("error")
                            .message("Failed to upload avatar: " + e.getMessage())
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
