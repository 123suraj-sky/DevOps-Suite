package com.devopssuite.execution.controller;

import com.devopssuite.execution.dto.ExecutionDto.ApiResponse;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;

import java.util.NoSuchElementException;

/**
 * Handles exceptions thrown from ExecutionController and ExecutionService,
 * returning well-formed JSON error responses instead of generic 500s.
 */
@RestControllerAdvice(basePackages = "com.devopssuite.execution")
public class ExecutionExceptionHandler {

    /** Bad language name, payload too large, disabled language, etc. */
    @ExceptionHandler(IllegalArgumentException.class)
    public ResponseEntity<ApiResponse<Void>> handleBadRequest(IllegalArgumentException ex, jakarta.servlet.http.HttpServletRequest request) {
        recordError(request, ex.getMessage(), "BAD_REQUEST");
        return ResponseEntity.status(HttpStatus.BAD_REQUEST)
                .body(ApiResponse.<Void>builder()
                        .status("error")
                        .message(ex.getMessage())
                        .build());
    }

    /** Execution ID not found in the database. */
    @ExceptionHandler(NoSuchElementException.class)
    public ResponseEntity<ApiResponse<Void>> handleNotFound(NoSuchElementException ex, jakarta.servlet.http.HttpServletRequest request) {
        recordError(request, ex.getMessage(), "NOT_FOUND");
        return ResponseEntity.status(HttpStatus.NOT_FOUND)
                .body(ApiResponse.<Void>builder()
                        .status("error")
                        .message(ex.getMessage())
                        .build());
    }

    private void recordError(jakarta.servlet.http.HttpServletRequest request, String message, String errorClass) {
        if (request != null) {
            request.setAttribute("log_error_message", message);
            request.setAttribute("log_error_class", errorClass);
        }
    }
}
