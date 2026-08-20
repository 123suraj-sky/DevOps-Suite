package com.devopssuite.execution.controller;

import com.devopssuite.execution.dto.ExecutionDto.*;
import com.devopssuite.execution.service.ExecutionService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.authentication.AuthenticationCredentialsNotFoundException;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.bind.annotation.*;

import java.util.UUID;

@RestController
@RequestMapping({"/code-execution", "/api/v1/code-execution"})
@RequiredArgsConstructor
public class ExecutionController {

    private final ExecutionService executionService;

    private UUID getCurrentUserId() {
        Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
        if (authentication == null || !authentication.isAuthenticated()) {
            throw new AuthenticationCredentialsNotFoundException("Authentication is required");
        }
        String userIdStr = (String) authentication.getPrincipal();
        return UUID.fromString(userIdStr);
    }

    @PostMapping({"/run", "/execute"})
    public ResponseEntity<ApiResponse<SubmitResponse>> execute(
            @Valid @RequestBody SubmitRequest request) {
        UUID userId = getCurrentUserId();
        SubmitResponse response = executionService.submitExecution(request, userId);
        return ResponseEntity.status(HttpStatus.ACCEPTED)
                .body(ApiResponse.<SubmitResponse>builder()
                        .message("Execution request accepted")
                        .data(response)
                        .build());
    }

    @GetMapping("/{id}")
    public ResponseEntity<ApiResponse<QueryResponse>> getResult(
            @PathVariable("id") UUID id) {
        QueryResponse response = executionService.getResult(id);
        return ResponseEntity.ok(ApiResponse.<QueryResponse>builder()
                .message("Execution query successful")
                .data(response)
                .build());
    }
}
