package com.devopssuite.project.service;

import com.devopssuite.project.dto.ProjectDto.*;
import com.devopssuite.project.model.*;
import com.devopssuite.project.repository.*;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.ArrayList;
import java.util.List;
import java.util.UUID;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class TaskService {

    private final TaskRepository taskRepository;
    private final ColumnRepository columnRepository;
    private final BoardRepository boardRepository;
    private final ProjectService projectService;

    @Transactional
    public TaskResponse createTask(TaskRequest request, UUID userId) {
        Column column = columnRepository.findById(request.getColumnId())
                .orElseThrow(() -> new ResourceNotFoundException("Column not found"));
        UUID projectId = projectService.getProjectIdForBoard(column.getBoardId());
        projectService.checkPermission(projectId, userId, "ADMIN", "OWNER", "MEMBER");

        List<Task> existingTasks = taskRepository.findByColumnIdOrderBySortOrderAsc(column.getId());
        enforceWipLimit(column, existingTasks, null);
        int nextSortOrder = existingTasks.size();

        String status = request.getStatus();
        if (status == null || status.trim().isEmpty()) {
            status = column.getName().toUpperCase();
        }

        Task task = Task.builder()
                .columnId(column.getId())
                .assigneeId(request.getAssigneeId())
                .title(request.getTitle())
                .description(request.getDescription())
                .priority(request.getPriority())
                .status(status)
                .dueDate(request.getDueDate())
                .sortOrder(nextSortOrder)
                .build();

        Task savedTask = taskRepository.saveAndFlush(task);
        return mapToTaskResponse(savedTask);
    }

    @Transactional
    public TaskResponse createTaskInBoard(UUID boardId, TaskRequest request, UUID userId) {
        Board board = boardRepository.findById(boardId)
                .orElseThrow(() -> new ResourceNotFoundException("Board not found"));
        projectService.checkPermission(board.getProjectId(), userId, "ADMIN", "OWNER", "MEMBER");

        UUID columnId = request.getColumnId();
        if (columnId == null) {
            columnId = columnRepository.findByBoardIdOrderBySortOrderAsc(boardId).stream()
                    .findFirst()
                    .map(Column::getId)
                    .orElseThrow(() -> new ResourceNotFoundException("Board has no columns"));
        }

        Column column = columnRepository.findById(columnId)
                .orElseThrow(() -> new ResourceNotFoundException("Column not found"));
        if (!column.getBoardId().equals(boardId)) {
            throw new ResourceNotFoundException("Column not found in board");
        }

        request.setColumnId(columnId);
        return createTask(request, userId);
    }

    @Transactional(readOnly = true)
    public TaskResponse getTask(UUID taskId, UUID userId) {
        Task task = taskRepository.findById(taskId)
                .orElseThrow(() -> new ResourceNotFoundException("Task not found"));
        projectService.requireProjectMember(projectService.getProjectIdForColumn(task.getColumnId()), userId);
        return mapToTaskResponse(task);
    }

    @Transactional
    public TaskResponse updateTask(UUID taskId, TaskRequest request, UUID userId) {
        Task task = taskRepository.findById(taskId)
                .orElseThrow(() -> new ResourceNotFoundException("Task not found"));
        UUID projectId = projectService.getProjectIdForColumn(task.getColumnId());
        projectService.checkPermission(projectId, userId, "ADMIN", "OWNER", "MEMBER");

        if (request.getColumnId() != null && !request.getColumnId().equals(task.getColumnId())) {
            Column column = columnRepository.findById(request.getColumnId())
                    .orElseThrow(() -> new ResourceNotFoundException("Column not found"));
            UUID newProjectId = projectService.getProjectIdForBoard(column.getBoardId());
            if (!newProjectId.equals(projectId)) {
                throw new ForbiddenException("Task cannot be moved to another project");
            }
            enforceWipLimit(column, taskRepository.findByColumnIdOrderBySortOrderAsc(column.getId()), task.getId());
            task.setColumnId(column.getId());
        }

        task.setTitle(request.getTitle());
        task.setDescription(request.getDescription());
        task.setPriority(request.getPriority());
        task.setAssigneeId(request.getAssigneeId());
        task.setDueDate(request.getDueDate());
        
        if (request.getStatus() != null && !request.getStatus().trim().isEmpty()) {
            task.setStatus(request.getStatus());
        }

        Task savedTask = taskRepository.saveAndFlush(task);
        return mapToTaskResponse(savedTask);
    }

    @Transactional
    public TaskResponse updateStatus(UUID taskId, String status, UUID userId) {
        Task task = taskRepository.findById(taskId)
                .orElseThrow(() -> new ResourceNotFoundException("Task not found"));
        UUID projectId = projectService.getProjectIdForColumn(task.getColumnId());
        projectService.checkPermission(projectId, userId, "ADMIN", "OWNER", "MEMBER");

        task.setStatus(status);

        // Attempt to find column with matching name in the same board
        Column currentColumn = columnRepository.findById(task.getColumnId()).orElse(null);
        if (currentColumn != null) {
            List<Column> boardColumns = columnRepository.findByBoardIdOrderBySortOrderAsc(currentColumn.getBoardId());
            // Normalize both sides: "In Progress" and "IN_PROGRESS" both become "in_progress"
            String normalizedStatus = status.trim().toLowerCase().replace(" ", "_");
            for (Column col : boardColumns) {
                String normalizedColName = col.getName().trim().toLowerCase().replace(" ", "_");
                if (normalizedColName.equals(normalizedStatus)) {
                    enforceWipLimit(col, taskRepository.findByColumnIdOrderBySortOrderAsc(col.getId()), task.getId());
                    task.setColumnId(col.getId());
                    break;
                }
            }
        }

        Task savedTask = taskRepository.saveAndFlush(task);
        return mapToTaskResponse(savedTask);
    }

    @Transactional
    public void deleteTask(UUID taskId, UUID userId) {
        Task task = taskRepository.findById(taskId)
                .orElseThrow(() -> new ResourceNotFoundException("Task not found"));
        UUID projectId = projectService.getProjectIdForColumn(task.getColumnId());
        projectService.checkPermission(projectId, userId, "ADMIN", "OWNER", "MEMBER");
        taskRepository.delete(task);
    }

    @Transactional
    public void reorderTasks(UUID projectId, UUID boardId, List<ReorderTaskItem> taskUpdates, UUID userId) {
        projectService.checkPermission(projectId, userId, "ADMIN", "OWNER", "MEMBER");
        Board board = boardRepository.findById(boardId)
                .orElseThrow(() -> new ResourceNotFoundException("Board not found"));
        if (!board.getProjectId().equals(projectId)) {
            throw new ResourceNotFoundException("Board not found in project");
        }

        for (ReorderTaskItem item : taskUpdates) {
            Task task = taskRepository.findById(item.getId()).orElse(null);
            if (task != null) {
                UUID taskProjectId = projectService.getProjectIdForColumn(task.getColumnId());
                UUID targetProjectId = projectService.getProjectIdForColumn(item.getColumnId());
                if (!taskProjectId.equals(projectId) || !targetProjectId.equals(projectId)) {
                    throw new ForbiddenException("Task reorder contains resources outside this project");
                }
                Column targetColumn = columnRepository.findById(item.getColumnId())
                        .orElseThrow(() -> new ResourceNotFoundException("Column not found"));
                enforceWipLimit(targetColumn, taskRepository.findByColumnIdOrderBySortOrderAsc(item.getColumnId()), task.getId());
                task.setColumnId(item.getColumnId());
                task.setSortOrder(item.getSortOrder());
                
                // Map column name to task status dynamically ("In Progress" -> "IN_PROGRESS")
                task.setStatus(targetColumn.getName().trim().replace(" ", "_").toUpperCase());

                taskRepository.save(task);
            }
        }
    }

    @Transactional(readOnly = true)
    public List<TaskResponse> getTasksByProject(UUID projectId, UUID userId) {
        projectService.requireProjectMember(projectId, userId);
        List<Board> boards = boardRepository.findByProjectIdOrderBySortOrderAsc(projectId);
        List<TaskResponse> allTasks = new ArrayList<>();

        for (Board board : boards) {
            List<Column> columns = columnRepository.findByBoardIdOrderBySortOrderAsc(board.getId());
            for (Column column : columns) {
                List<Task> tasks = taskRepository.findByColumnIdOrderBySortOrderAsc(column.getId());
                allTasks.addAll(tasks.stream().map(this::mapToTaskResponse).collect(Collectors.toList()));
            }
        }

        return allTasks;
    }

    private TaskResponse mapToTaskResponse(Task task) {
        return TaskResponse.builder()
                .id(task.getId())
                .columnId(task.getColumnId())
                .assigneeId(task.getAssigneeId())
                .title(task.getTitle())
                .description(task.getDescription())
                .priority(task.getPriority())
                .status(task.getStatus())
                .dueDate(task.getDueDate())
                .sortOrder(task.getSortOrder())
                .createdAt(task.getCreatedAt())
                .updatedAt(task.getUpdatedAt())
                .build();
    }

    private void enforceWipLimit(Column column, List<Task> existingTasks, UUID movingTaskId) {
        int wipLimit = column.getWipLimit();
        if (wipLimit <= 0) {
            return;
        }

        long taskCount = existingTasks.stream()
                .filter(task -> movingTaskId == null || !task.getId().equals(movingTaskId))
                .count();
        if (taskCount >= wipLimit) {
            throw new IllegalStateException("Column WIP limit exceeded");
        }
    }
}
