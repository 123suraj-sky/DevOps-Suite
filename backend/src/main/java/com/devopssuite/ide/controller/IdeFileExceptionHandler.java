package com.devopssuite.ide.controller;

import com.devopssuite.ide.dto.IdeFileDto.ApiResponse;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;

import java.util.NoSuchElementException;
import java.util.stream.Collectors;

/**
 * Translates IDE service exceptions into consistent JSON error responses.
 * Scoped to the {@code com.devopssuite.ide} package only.
 */
@RestControllerAdvice(basePackages = "com.devopssuite.ide")
public class IdeFileExceptionHandler {

    /** Duplicate path, blank path, content on a folder, etc. */
    @ExceptionHandler(IllegalArgumentException.class)
    public ResponseEntity<ApiResponse<Void>> handleBadRequest(IllegalArgumentException ex, jakarta.servlet.http.HttpServletRequest request) {
        recordError(request, ex.getMessage(), "BAD_REQUEST");
        return ResponseEntity.status(HttpStatus.BAD_REQUEST)
                .body(ApiResponse.<Void>builder()
                        .status("error")
                        .message(ex.getMessage())
                        .build());
    }

    /** Bean-validation failures on @Valid-annotated request bodies. */
    @ExceptionHandler(MethodArgumentNotValidException.class)
    public ResponseEntity<ApiResponse<Void>> handleValidation(MethodArgumentNotValidException ex, jakarta.servlet.http.HttpServletRequest request) {
        String msg = ex.getBindingResult().getFieldErrors().stream()
                .map(fe -> fe.getField() + ": " + fe.getDefaultMessage())
                .collect(Collectors.joining("; "));
        recordError(request, msg, "VALIDATION_ERROR");
        return ResponseEntity.status(HttpStatus.BAD_REQUEST)
                .body(ApiResponse.<Void>builder()
                        .status("error")
                        .message(msg)
                        .build());
    }

    /** File or project not found. */
    @ExceptionHandler(NoSuchElementException.class)
    public ResponseEntity<ApiResponse<Void>> handleNotFound(NoSuchElementException ex, jakarta.servlet.http.HttpServletRequest request) {
        recordError(request, ex.getMessage(), "NOT_FOUND");
        return ResponseEntity.status(HttpStatus.NOT_FOUND)
                .body(ApiResponse.<Void>builder()
                        .status("error")
                        .message(ex.getMessage())
                        .build());
    }

    /** Requesting user is not a member of the project. */
    @ExceptionHandler(SecurityException.class)
    public ResponseEntity<ApiResponse<Void>> handleForbidden(SecurityException ex, jakarta.servlet.http.HttpServletRequest request) {
        recordError(request, ex.getMessage(), "FORBIDDEN");
        return ResponseEntity.status(HttpStatus.FORBIDDEN)
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
