package com.devopssuite.project.service;

import com.devopssuite.notification.event.TaskAssignedEvent;
import com.devopssuite.project.dto.ProjectDto.*;
import com.devopssuite.project.model.*;
import com.devopssuite.project.repository.*;
import com.devopssuite.auth.model.User;
import com.devopssuite.auth.repository.UserRepository;
import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.datatype.jsr310.JavaTimeModule;
import lombok.RequiredArgsConstructor;
import org.springframework.context.ApplicationEventPublisher;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.*;
import java.util.function.Function;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class TaskService {

    private final TaskRepository taskRepository;
    private final ColumnRepository columnRepository;
    private final BoardRepository boardRepository;
    private final ProjectService projectService;
    private final ApplicationEventPublisher eventPublisher;
    private final UserRepository userRepository;
    private final TaskAuditHistoryRepository auditHistoryRepository;

    private static final ObjectMapper MAPPER = new ObjectMapper()
            .registerModule(new JavaTimeModule());

    @Transactional
    public TaskResponse createTask(TaskRequest request, UUID userId) {
        Column column = columnRepository.findById(request.getColumnId())
                .orElseThrow(() -> new ResourceNotFoundException("Column not found"));
        UUID projectId = projectService.getProjectIdForBoard(column.getBoardId());
        projectService.checkPermission(projectId, userId, "ADMIN", "OWNER");

        List<Task> existingTasks = taskRepository.findByColumnIdOrderBySortOrderAsc(column.getId());
        enforceWipLimit(column, existingTasks, null);
        int nextSortOrder = existingTasks.size();

        String status = normalizeStatus(request.getStatus(), column);
        String priority = normalizePriority(request.getPriority());

        Task task = Task.builder()
                .columnId(column.getId())
                .assigneeId(request.getAssigneeId())
                .title(request.getTitle())
                .description(request.getDescription())
                .priority(priority)
                .status(status)
                .dueDate(request.getDueDate())
                .sortOrder(nextSortOrder)
                .build();

        Task savedTask = taskRepository.saveAndFlush(task);

        // Notify assignee if one was specified
        if (savedTask.getAssigneeId() != null) {
            eventPublisher.publishEvent(new TaskAssignedEvent(
                    savedTask.getId(), savedTask.getAssigneeId(), projectId, savedTask.getTitle()));
        }

        writeAudit(savedTask, userId, "CREATED");
        return mapToTaskResponse(savedTask);
    }

    @Transactional
    public TaskResponse createTaskInBoard(UUID boardId, TaskRequest request, UUID userId) {
        Board board = boardRepository.findById(boardId)
                .orElseThrow(() -> new ResourceNotFoundException("Board not found"));
        projectService.checkPermission(board.getProjectId(), userId, "ADMIN", "OWNER");

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
        projectService.checkPermission(projectId, userId, "ADMIN", "OWNER");

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
        task.setPriority(normalizePriority(request.getPriority()));
        task.setAssigneeId(request.getAssigneeId());
        task.setDueDate(request.getDueDate());
        
        if (request.getStatus() != null && !request.getStatus().trim().isEmpty()) {
            task.setStatus(request.getStatus());
        }

        Task savedTask = taskRepository.saveAndFlush(task);
        writeAudit(savedTask, userId, "UPDATED");
        return mapToTaskResponse(savedTask);
    }

    @Transactional
    public TaskResponse updateStatus(UUID taskId, String status, UUID userId) {
        Task task = taskRepository.findById(taskId)
                .orElseThrow(() -> new ResourceNotFoundException("Task not found"));
        UUID projectId = projectService.getProjectIdForColumn(task.getColumnId());
        projectService.checkPermission(projectId, userId, "ADMIN", "OWNER", "MEMBER");

        String previousStatus = task.getStatus();
        String normalizedStatus = normalizeStatus(status, null);
        task.setStatus(normalizedStatus);

        // Attempt to find column with matching name in the same board
        Column currentColumn = columnRepository.findById(task.getColumnId()).orElse(null);
        if (currentColumn != null) {
            List<Column> boardColumns = columnRepository.findByBoardIdOrderBySortOrderAsc(currentColumn.getBoardId());
            // Normalize both sides: "In Progress" and "IN_PROGRESS" both become "in_progress"
            for (Column col : boardColumns) {
                String normalizedColName = normalizeStatus(null, col);
                if (normalizedColName.equals(normalizedStatus)) {
                    enforceWipLimit(col, taskRepository.findByColumnIdOrderBySortOrderAsc(col.getId()), task.getId());
                    task.setColumnId(col.getId());
                    break;
                }
            }
        }

        Task savedTask = taskRepository.saveAndFlush(task);
        Map<String, Object> extra = new LinkedHashMap<>();
        if (previousStatus != null && !previousStatus.equals(normalizedStatus)) {
            extra.put("previous_status", previousStatus);
        }
        writeAudit(savedTask, userId, "STATUS_CHANGED", extra);
        return mapToTaskResponse(savedTask);
    }

    @Transactional
    public void deleteTask(UUID taskId, UUID userId) {
        Task task = taskRepository.findById(taskId)
                .orElseThrow(() -> new ResourceNotFoundException("Task not found"));
        UUID projectId = projectService.getProjectIdForColumn(task.getColumnId());
        projectService.checkPermission(projectId, userId, "ADMIN", "OWNER");
        taskRepository.delete(task);
    }

    @Transactional
    public TaskResponse duplicateTask(UUID taskId, UUID userId) {
        Task original = taskRepository.findById(taskId)
                .orElseThrow(() -> new ResourceNotFoundException("Task not found"));
        UUID projectId = projectService.getProjectIdForColumn(original.getColumnId());
        projectService.checkPermission(projectId, userId, "ADMIN", "OWNER");

        Column column = columnRepository.findById(original.getColumnId())
                .orElseThrow(() -> new ResourceNotFoundException("Column not found"));
        List<Task> existingTasks = taskRepository.findByColumnIdOrderBySortOrderAsc(original.getColumnId());
        enforceWipLimit(column, existingTasks, null);

        Task duplicate = Task.builder()
                .columnId(original.getColumnId())
                .assigneeId(original.getAssigneeId())
                .title(original.getTitle() + " (Copy)")
                .description(original.getDescription())
                .priority(original.getPriority())
                .status(original.getStatus())
                .dueDate(original.getDueDate())
                .sortOrder(existingTasks.size())
                .build();

        Task saved = taskRepository.saveAndFlush(duplicate);
        writeAudit(saved, userId, "DUPLICATED");
        return mapToTaskResponse(saved);
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
                
                String oldStatus = task.getStatus();
                String newStatus = normalizeStatus(null, targetColumn);
                boolean statusChanged = oldStatus != null && !oldStatus.equals(newStatus);

                task.setColumnId(item.getColumnId());
                task.setSortOrder(item.getSortOrder());
                task.setStatus(newStatus);

                Task saved = taskRepository.save(task);
                if (statusChanged) {
                    Map<String, Object> extra = new LinkedHashMap<>();
                    extra.put("previous_status", oldStatus);
                    writeAudit(saved, userId, "STATUS_CHANGED", extra);
                }
            }
        }
    }

    @Transactional(readOnly = true)
    public List<TaskResponse> getTasksByProject(UUID projectId, UUID userId) {
        projectService.requireProjectMember(projectId, userId);
        List<Board> boards = boardRepository.findByProjectIdOrderBySortOrderAsc(projectId);
        List<Task> allTasks = new ArrayList<>();

        for (Board board : boards) {
            List<Column> columns = columnRepository.findByBoardIdOrderBySortOrderAsc(board.getId());
            for (Column column : columns) {
                allTasks.addAll(taskRepository.findByColumnIdOrderBySortOrderAsc(column.getId()));
            }
        }

        // Batch-load all referenced users to avoid N+1 queries
        Map<UUID, User> userCache = buildUserCache(allTasks);
        return allTasks.stream()
                .map(task -> mapToTaskResponse(task, userCache))
                .collect(Collectors.toList());
    }

    // ── Audit history ──────────────────────────────────────────────────────────

    @Transactional(readOnly = true)
    public List<TaskAuditHistoryResponse> getTaskHistory(UUID taskId, UUID userId) {
        Task task = taskRepository.findById(taskId)
                .orElseThrow(() -> new ResourceNotFoundException("Task not found"));
        projectService.requireProjectMember(projectService.getProjectIdForColumn(task.getColumnId()), userId);

        List<TaskAuditHistory> history = auditHistoryRepository.findByTaskIdOrderByChangedAtDesc(taskId);

        // Batch-load user display names
        Set<UUID> userIds = new HashSet<>();
        for (TaskAuditHistory h : history) {
            if (h.getChangedBy() != null) userIds.add(h.getChangedBy());
        }
        Map<UUID, String> nameCache = userIds.isEmpty()
                ? Collections.emptyMap()
                : userRepository.findAllById(userIds).stream()
                    .collect(Collectors.toMap(User::getId, u -> u.getDisplayName() != null ? u.getDisplayName() : u.getEmail()));

        return history.stream().map(h -> {
            Object snapshotObj;
            try {
                snapshotObj = MAPPER.readValue(h.getSnapshot(), Object.class);
            } catch (Exception e) {
                snapshotObj = h.getSnapshot(); // return raw string on parse failure
            }
            return TaskAuditHistoryResponse.builder()
                    .id(h.getId())
                    .taskId(h.getTaskId())
                    .changedBy(h.getChangedBy())
                    .changedByName(h.getChangedBy() != null ? nameCache.getOrDefault(h.getChangedBy(), "Unknown") : null)
                    .changedAt(h.getChangedAt())
                    .action(h.getAction())
                    .snapshot(snapshotObj)
                    .build();
        }).collect(Collectors.toList());
    }

    /**
     * Serialises the current task state to JSON and persists one audit record.
     * Swallows serialization errors so audit failures never break the main transaction.
     */
    private void writeAudit(Task task, UUID actorId, String action) {
        writeAudit(task, actorId, action, Collections.emptyMap());
    }

    private void writeAudit(Task task, UUID actorId, String action, Map<String, Object> extraFields) {
        if (task == null) return;   // guard: can be null if repository.save returns null
        try {
            Map<String, Object> snap = new LinkedHashMap<>();
            snap.put("title",        task.getTitle());
            snap.put("description",  task.getDescription());
            snap.put("status",       task.getStatus());
            snap.put("priority",     task.getPriority());
            snap.put("assignee_id",  task.getAssigneeId() != null ? task.getAssigneeId().toString() : null);
            snap.put("due_date",     task.getDueDate() != null ? task.getDueDate().toString() : null);
            snap.put("column_id",    task.getColumnId() != null ? task.getColumnId().toString() : null);
            snap.put("sort_order",   task.getSortOrder());

            if (extraFields != null) {
                snap.putAll(extraFields);
            }

            String json = MAPPER.writeValueAsString(snap);

            auditHistoryRepository.save(TaskAuditHistory.builder()
                    .taskId(task.getId())
                    .changedBy(actorId)
                    .action(action)
                    .snapshot(json)
                    .build());
        } catch (Exception e) {
            // Non-fatal — audit failure should not roll back the business transaction
        }
    }

    // ── Private utilities ──────────────────────────────────────────────────────

    /**
     * Collects all unique user UUIDs referenced by created_by / last_modified_by
     * across a list of tasks and fetches them in a single query.
     */
    private Map<UUID, User> buildUserCache(List<Task> tasks) {
        Set<UUID> userIds = new HashSet<>();
        for (Task t : tasks) {
            if (t.getCreatedBy() != null)      userIds.add(t.getCreatedBy());
            if (t.getLastModifiedBy() != null) userIds.add(t.getLastModifiedBy());
            if (t.getAssigneeId() != null)     userIds.add(t.getAssigneeId());
        }
        if (userIds.isEmpty()) return Collections.emptyMap();
        return userRepository.findAllById(userIds).stream()
                .collect(Collectors.toMap(User::getId, Function.identity()));
    }

    private TaskResponse mapToTaskResponse(Task task) {
        // Single-task path: fetch only the users needed for this one task
        Map<UUID, User> cache = buildUserCache(List.of(task));
        return mapToTaskResponse(task, cache);
    }

    private TaskResponse mapToTaskResponse(Task task, Map<UUID, User> userCache) {
        String createdByName = task.getCreatedBy() != null
                ? userCache.getOrDefault(task.getCreatedBy(), null) != null
                    ? userCache.get(task.getCreatedBy()).getDisplayName()
                    : "Unknown"
                : null;
        String lastModifiedByName = task.getLastModifiedBy() != null
                ? userCache.getOrDefault(task.getLastModifiedBy(), null) != null
                    ? userCache.get(task.getLastModifiedBy()).getDisplayName()
                    : "Unknown"
                : null;
        String assigneeName = task.getAssigneeId() != null
                ? userCache.getOrDefault(task.getAssigneeId(), null) != null
                    ? userCache.get(task.getAssigneeId()).getDisplayName()
                    : "Unknown"
                : null;

        return TaskResponse.builder()
                .id(task.getId())
                .columnId(task.getColumnId())
                .assigneeId(task.getAssigneeId())
                .assigneeName(assigneeName)
                .title(task.getTitle())
                .description(task.getDescription())
                .priority(task.getPriority())
                .status(task.getStatus())
                .dueDate(task.getDueDate())
                .sortOrder(task.getSortOrder())
                .createdAt(task.getCreatedAt())
                .updatedAt(task.getUpdatedAt())
                .createdBy(task.getCreatedBy())
                .createdByName(createdByName)
                .lastModifiedBy(task.getLastModifiedBy())
                .lastModifiedByName(lastModifiedByName)
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

    private String normalizeStatus(String requestedStatus, Column column) {
        String rawStatus = requestedStatus;
        if (rawStatus == null || rawStatus.trim().isEmpty()) {
            if (column == null) {
                return "TODO";
            }
            rawStatus = column.getName();
        }
        String normalized = rawStatus.trim().replaceAll("\\s+", "_").toUpperCase();
        return "TO_DO".equals(normalized) ? "TODO" : normalized;
    }

    private String normalizePriority(String requestedPriority) {
        if (requestedPriority == null || requestedPriority.trim().isEmpty()) {
            return "MEDIUM";
        }
        return requestedPriority.trim().toUpperCase();
    }
}
