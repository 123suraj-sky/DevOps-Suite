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

import java.util.List;
import java.util.UUID;

/**
 * REST controller for the code execution sandbox.
 *
 * <p>Canonical paths: {@code /api/code-execution/*}
 * (Axios client baseURL is {@code VITE_API_URL = http://localhost:8081},
 *  so frontend calls {@code /api/code-execution/...} which resolves correctly.)
 */
@RestController
@RequestMapping("/api/code-execution")
@RequiredArgsConstructor
public class ExecutionController {

    private final ExecutionService executionService;

    // ── Submit ───────────────────────────────────────────────────────────────────

    /**
     * POST /api/code-execution/run
     * Accepts source code + metadata, enqueues a sandbox job, returns 202.
     */
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

    // ── Poll ─────────────────────────────────────────────────────────────────────

    /**
     * GET /api/code-execution/{id}
     * Returns the current status (and result when terminal) for an execution.
     */
    @GetMapping("/{id}")
    public ResponseEntity<ApiResponse<QueryResponse>> getResult(
            @PathVariable("id") UUID id) {
        QueryResponse response = executionService.getResult(id);
        return ResponseEntity.ok(ApiResponse.<QueryResponse>builder()
                .message("Execution query successful")
                .data(response)
                .build());
    }

    // ── History ──────────────────────────────────────────────────────────────────

    /**
     * GET /api/code-execution/history?page=0&size=20
     * Returns the authenticated user's paginated execution history, newest first.
     */
    @GetMapping("/history")
    public ResponseEntity<ApiResponse<List<HistoryItem>>> getHistory(
            @RequestParam(defaultValue = "0")  int page,
            @RequestParam(defaultValue = "20") int size) {
        UUID userId = getCurrentUserId();
        List<HistoryItem> items = executionService.getHistory(userId, page, size);
        return ResponseEntity.ok(ApiResponse.<List<HistoryItem>>builder()
                .message("Execution history retrieved")
                .data(items)
                .build());
    }

    // ── Helper ───────────────────────────────────────────────────────────────────

    private UUID getCurrentUserId() {
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        if (auth == null || !auth.isAuthenticated()) {
            throw new AuthenticationCredentialsNotFoundException("Authentication is required");
        }
        return UUID.fromString((String) auth.getPrincipal());
    }
}
