package com.devopssuite.project.controller;

import com.devopssuite.project.dto.ProjectDto.*;
import jakarta.validation.Valid;
import com.devopssuite.project.service.TaskService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.authentication.AuthenticationCredentialsNotFoundException;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.bind.annotation.*;

import java.util.UUID;

@RestController
@RequiredArgsConstructor
public class TaskController {

    private final TaskService taskService;

    private UUID getCurrentUserId() {
        Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
        if (authentication == null || !authentication.isAuthenticated()) {
            throw new AuthenticationCredentialsNotFoundException("Authentication is required");
        }
        String userIdStr = (String) authentication.getPrincipal();
        return UUID.fromString(userIdStr);
    }

    @PostMapping({"/tasks", "/api/tasks", "/api/v1/tasks"})
    public ResponseEntity<ApiResponse<TaskResponse>> create(@Valid @RequestBody TaskRequest request) {
        UUID userId = getCurrentUserId();
        TaskResponse response = taskService.createTask(request, userId);
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(ApiResponse.<TaskResponse>builder()
                        .message("Task created successfully")
                        .data(response)
                        .build());
    }

    @PostMapping({"/boards/{boardId}/tasks", "/api/v1/boards/{boardId}/tasks"})
    public ResponseEntity<ApiResponse<TaskResponse>> createInBoard(
            @PathVariable("boardId") UUID boardId,
            @Valid @RequestBody TaskRequest request) {
        UUID userId = getCurrentUserId();
        TaskResponse response = taskService.createTaskInBoard(boardId, request, userId);
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(ApiResponse.<TaskResponse>builder()
                        .message("Task created successfully")
                        .data(response)
                        .build());
    }

    @GetMapping({"/tasks/{id}", "/api/v1/tasks/{id}"})
    public ResponseEntity<ApiResponse<TaskResponse>> getById(@PathVariable("id") UUID id) {
        UUID userId = getCurrentUserId();
        TaskResponse response = taskService.getTask(id, userId);
        return ResponseEntity.ok(ApiResponse.<TaskResponse>builder()
                .message("Task fetched successfully")
                .data(response)
                .build());
    }

    @PutMapping({"/tasks/{id}", "/api/v1/tasks/{id}"})
    public ResponseEntity<ApiResponse<TaskResponse>> update(@PathVariable("id") UUID id, @Valid @RequestBody TaskRequest request) {
        UUID userId = getCurrentUserId();
        TaskResponse response = taskService.updateTask(id, request, userId);
        return ResponseEntity.ok(ApiResponse.<TaskResponse>builder()
                .message("Task updated successfully")
                .data(response)
                .build());
    }

    @PatchMapping({"/tasks/{id}/status", "/api/v1/tasks/{id}/status"})
    public ResponseEntity<ApiResponse<TaskResponse>> updateStatus(@PathVariable("id") UUID id, @Valid @RequestBody TaskStatusRequest request) {
        UUID userId = getCurrentUserId();
        TaskResponse response = taskService.updateStatus(id, request.getStatus(), userId);
        return ResponseEntity.ok(ApiResponse.<TaskResponse>builder()
                .message("Task status updated successfully")
                .data(response)
                .build());
    }

    @DeleteMapping({"/tasks/{id}", "/api/v1/tasks/{id}"})
    public ResponseEntity<ApiResponse<Void>> delete(@PathVariable("id") UUID id) {
        UUID userId = getCurrentUserId();
        taskService.deleteTask(id, userId);
        return ResponseEntity.ok(ApiResponse.<Void>builder()
                .message("Task deleted successfully")
                .build());
    }
}
