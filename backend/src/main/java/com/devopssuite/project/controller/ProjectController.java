package com.devopssuite.project.controller;

import com.devopssuite.project.dto.ProjectDto.*;
import com.devopssuite.project.service.ProjectService;
import com.devopssuite.project.service.TaskService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.authentication.AuthenticationCredentialsNotFoundException;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping({"/projects", "/api/v1/projects"})
@RequiredArgsConstructor
public class ProjectController {

    private final ProjectService projectService;
    private final TaskService taskService;

    private UUID getCurrentUserId() {
        Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
        if (authentication == null || !authentication.isAuthenticated()) {
            throw new AuthenticationCredentialsNotFoundException("Authentication is required");
        }
        String userIdStr = (String) authentication.getPrincipal();
        return UUID.fromString(userIdStr);
    }

    @PostMapping
    public ResponseEntity<ApiResponse<ProjectResponse>> create(@Valid @RequestBody ProjectRequest request) {
        UUID userId = getCurrentUserId();
        ProjectResponse response = projectService.createProject(request, userId);
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(ApiResponse.<ProjectResponse>builder()
                        .message("Project created successfully")
                        .data(response)
                        .build());
    }

    @GetMapping
    public ResponseEntity<ApiResponse<ProjectListResponse>> getAll(
            @RequestParam(name = "page", defaultValue = "0") int page,
            @RequestParam(name = "size", defaultValue = "10") int size) {
        UUID userId = getCurrentUserId();
        Page<ProjectResponse> projectPage = projectService.listProjects(PageRequest.of(page, size), userId);
        
        ProjectListResponse response = ProjectListResponse.builder()
                .projects(projectPage.getContent())
                .content(projectPage.getContent())
                .total(projectPage.getTotalElements())
                .page(page)
                .size(size)
                .build();

        return ResponseEntity.ok(ApiResponse.<ProjectListResponse>builder()
                .message("Projects fetched successfully")
                .data(response)
                .build());
    }

    @GetMapping("/{id}")
    public ResponseEntity<ApiResponse<ProjectResponse>> getById(@PathVariable("id") UUID id) {
        UUID userId = getCurrentUserId();
        ProjectResponse response = projectService.getProject(id, userId);
        return ResponseEntity.ok(ApiResponse.<ProjectResponse>builder()
                .message("Project fetched successfully")
                .data(response)
                .build());
    }

    @PutMapping("/{id}")
    public ResponseEntity<ApiResponse<ProjectResponse>> update(@PathVariable("id") UUID id, @Valid @RequestBody ProjectRequest request) {
        UUID userId = getCurrentUserId();
        ProjectResponse response = projectService.updateProject(id, request, userId);
        return ResponseEntity.ok(ApiResponse.<ProjectResponse>builder()
                .message("Project updated successfully")
                .data(response)
                .build());
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<ApiResponse<Void>> delete(@PathVariable("id") UUID id) {
        UUID userId = getCurrentUserId();
        projectService.deleteProject(id, userId);
        return ResponseEntity.ok(ApiResponse.<Void>builder()
                .message("Project deleted successfully")
                .build());
    }

    @PostMapping("/{projectId}/members")
    public ResponseEntity<ApiResponse<Void>> addMember(@PathVariable("projectId") UUID projectId, @Valid @RequestBody MemberRequest request) {
        UUID userId = getCurrentUserId();
        projectService.addMember(projectId, request.getUserId(), request.getRole(), userId);
        return ResponseEntity.ok(ApiResponse.<Void>builder()
                .message("Member added/updated successfully")
                .build());
    }

    @DeleteMapping("/{projectId}/members/{userId}")
    public ResponseEntity<ApiResponse<Void>> removeMember(
            @PathVariable("projectId") UUID projectId,
            @PathVariable("userId") UUID userId) {
        UUID actingUserId = getCurrentUserId();
        projectService.removeMember(projectId, userId, actingUserId);
        return ResponseEntity.ok(ApiResponse.<Void>builder()
                .message("Member removed successfully")
                .build());
    }

    @GetMapping("/{projectId}/boards")
    public ResponseEntity<ApiResponse<List<BoardResponse>>> getBoards(@PathVariable("projectId") UUID projectId) {
        UUID userId = getCurrentUserId();
        List<BoardResponse> response = projectService.getBoards(projectId, userId);
        return ResponseEntity.ok(ApiResponse.<List<BoardResponse>>builder()
                .message("Boards fetched successfully")
                .data(response)
                .build());
    }

    @PostMapping("/{projectId}/boards")
    public ResponseEntity<ApiResponse<BoardResponse>> createBoard(
            @PathVariable("projectId") UUID projectId,
            @Valid @RequestBody BoardRequest request) {
        UUID userId = getCurrentUserId();
        BoardResponse response = projectService.createBoard(projectId, request, userId);
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(ApiResponse.<BoardResponse>builder()
                        .message("Board created successfully")
                        .data(response)
                        .build());
    }

    @PostMapping("/{projectId}/boards/{boardId}/columns")
    public ResponseEntity<ApiResponse<ColumnResponse>> createColumn(
            @PathVariable("projectId") UUID projectId,
            @PathVariable("boardId") UUID boardId,
            @Valid @RequestBody ColumnRequest request) {
        UUID userId = getCurrentUserId();
        ColumnResponse response = projectService.createColumn(projectId, boardId, request, userId);
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(ApiResponse.<ColumnResponse>builder()
                        .message("Column created successfully")
                        .data(response)
                        .build());
    }

    @PutMapping("/{projectId}/boards/{boardId}/columns/{columnId}")
    public ResponseEntity<ApiResponse<ColumnResponse>> updateColumn(
            @PathVariable("projectId") UUID projectId,
            @PathVariable("boardId") UUID boardId,
            @PathVariable("columnId") UUID columnId,
            @Valid @RequestBody ColumnRequest request) {
        UUID userId = getCurrentUserId();
        ColumnResponse response = projectService.updateColumn(projectId, boardId, columnId, request, userId);
        return ResponseEntity.ok(ApiResponse.<ColumnResponse>builder()
                .message("Column updated successfully")
                .data(response)
                .build());
    }

    @DeleteMapping("/{projectId}/boards/{boardId}/columns/{columnId}")
    public ResponseEntity<ApiResponse<Void>> deleteColumn(
            @PathVariable("projectId") UUID projectId,
            @PathVariable("boardId") UUID boardId,
            @PathVariable("columnId") UUID columnId) {
        UUID userId = getCurrentUserId();
        projectService.deleteColumn(projectId, boardId, columnId, userId);
        return ResponseEntity.ok(ApiResponse.<Void>builder()
                .message("Column deleted successfully")
                .build());
    }

    @GetMapping("/{projectId}/tasks")
    public ResponseEntity<ApiResponse<List<TaskResponse>>> getTasks(@PathVariable("projectId") UUID projectId) {
        UUID userId = getCurrentUserId();
        List<TaskResponse> response = taskService.getTasksByProject(projectId, userId);
        return ResponseEntity.ok(ApiResponse.<List<TaskResponse>>builder()
                .message("Tasks fetched successfully")
                .data(response)
                .build());
    }

    @PutMapping("/{projectId}/boards/{boardId}/tasks/reorder")
    public ResponseEntity<ApiResponse<Void>> reorderTasks(
            @PathVariable("projectId") UUID projectId,
            @PathVariable("boardId") UUID boardId,
            @Valid @RequestBody ReorderTasksRequest request) {
        UUID userId = getCurrentUserId();
        taskService.reorderTasks(projectId, boardId, request.getTasks(), userId);
        return ResponseEntity.ok(ApiResponse.<Void>builder()
                .message("Tasks reordered successfully")
                .build());
    }
}
