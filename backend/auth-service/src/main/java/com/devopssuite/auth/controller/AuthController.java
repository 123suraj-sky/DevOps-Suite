package com.devopssuite.auth.controller;

import com.devopssuite.auth.dto.AuthDto.*;
import com.devopssuite.auth.service.AuthService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.bind.annotation.*;

import java.util.UUID;

@RestController
@RequiredArgsConstructor
public class AuthController {

    private final AuthService authService;

    @PostMapping("/register")
    public ResponseEntity<ApiResponse<SignupResponse>> register(@RequestBody SignupRequest request) {
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
    public ResponseEntity<ApiResponse<LoginResponse>> login(@RequestBody LoginRequest request) {
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
}
