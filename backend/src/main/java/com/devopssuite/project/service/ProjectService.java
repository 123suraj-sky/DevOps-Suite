package com.devopssuite.project.service;

import com.devopssuite.notification.event.MemberAddedEvent;
import com.devopssuite.project.dto.ProjectDto.*;
import com.devopssuite.project.model.*;
import com.devopssuite.project.repository.*;
import lombok.RequiredArgsConstructor;
import org.springframework.context.ApplicationEventPublisher;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class ProjectService {

    private final ProjectRepository projectRepository;
    private final ProjectMemberRepository projectMemberRepository;
    private final BoardRepository boardRepository;
    private final ColumnRepository columnRepository;
    private final TaskRepository taskRepository;
    private final ApplicationEventPublisher eventPublisher;

    @Transactional
    public ProjectResponse createProject(ProjectRequest request, UUID ownerId) {
        Project project = Project.builder()
                .name(request.getName())
                .description(request.getDescription())
                .ownerId(ownerId)
                .status("ACTIVE")
                .build();

        Project savedProject = projectRepository.save(project);

        // Add owner as a member
        ProjectMember ownerMember = ProjectMember.builder()
                .projectId(savedProject.getId())
                .userId(ownerId)
                .role("OWNER")
                .build();
        projectMemberRepository.save(ownerMember);

        // Create a default Board
        Board defaultBoard = Board.builder()
                .projectId(savedProject.getId())
                .name("Default Board")
                .description("Default Kanban Board")
                .sortOrder(0)
                .build();
        Board savedBoard = boardRepository.save(defaultBoard);

        // Create default Columns
        String[] defaultColumns = {"Backlog", "To Do", "In Progress", "Done"};
        int[] wipLimits = {0, 0, 3, 0};
        String[] colors = {"#6B7280", "#3B82F6", "#F59E0B", "#10B981"};

        for (int i = 0; i < defaultColumns.length; i++) {
            Column col = Column.builder()
                    .boardId(savedBoard.getId())
                    .name(defaultColumns[i])
                    .colorHex(colors[i])
                    .sortOrder(i)
                    .wipLimit(wipLimits[i])
                    .build();
            columnRepository.save(col);
        }

        return mapToProjectResponse(savedProject);
    }

    @Transactional(readOnly = true)
    public ProjectResponse getProject(UUID projectId) {
        Project project = projectRepository.findById(projectId)
                .orElseThrow(() -> new ResourceNotFoundException("Project not found"));
        return mapToProjectResponse(project);
    }

    @Transactional(readOnly = true)
    public ProjectResponse getProject(UUID projectId, UUID userId) {
        requireProjectMember(projectId, userId);
        return getProject(projectId);
    }

    @Transactional
    public ProjectResponse updateProject(UUID projectId, ProjectRequest request, UUID userId) {
        Project project = projectRepository.findById(projectId)
                .orElseThrow(() -> new ResourceNotFoundException("Project not found"));

        // Only owner or admin can update
        checkPermission(projectId, userId, "ADMIN", "OWNER");

        project.setName(request.getName());
        project.setDescription(request.getDescription());
        Project savedProject = projectRepository.save(project);
        return mapToProjectResponse(savedProject);
    }

    @Transactional
    public void deleteProject(UUID projectId, UUID userId) {
        Project project = projectRepository.findById(projectId)
                .orElseThrow(() -> new ResourceNotFoundException("Project not found"));

        // Only owner can delete project
        if (!project.getOwnerId().equals(userId)) {
            throw new IllegalStateException("Only the project owner can delete the project");
        }

        // Clean up project members
        List<ProjectMember> members = projectMemberRepository.findByProjectId(projectId);
        projectMemberRepository.deleteAll(members);

        // Clean up boards, columns, and tasks
        List<Board> boards = boardRepository.findByProjectIdOrderBySortOrderAsc(projectId);
        for (Board board : boards) {
            List<Column> cols = columnRepository.findByBoardIdOrderBySortOrderAsc(board.getId());
            for (Column col : cols) {
                List<Task> tasks = taskRepository.findByColumnIdOrderBySortOrderAsc(col.getId());
                taskRepository.deleteAll(tasks);
            }
            columnRepository.deleteAll(cols);
        }
        boardRepository.deleteAll(boards);

        projectRepository.delete(project);
    }

    @Transactional(readOnly = true)
    public Page<ProjectResponse> listProjects(Pageable pageable, UUID userId) {
        // Find project IDs where user is owner or member
        List<UUID> memberProjectIds = projectMemberRepository.findByUserId(userId).stream()
                .map(ProjectMember::getProjectId)
                .collect(Collectors.toList());

        List<Project> userProjects = projectRepository.findVisibleToUser(userId).stream()
                .collect(Collectors.toList());

        int start = (int) pageable.getOffset();
        int end = Math.min((start + pageable.getPageSize()), userProjects.size());

        List<ProjectResponse> pageContent = new ArrayList<>();
        if (start < userProjects.size()) {
            pageContent = userProjects.subList(start, end).stream()
                    .map(this::mapToProjectResponse)
                    .collect(Collectors.toList());
        }

        return new PageImpl<>(pageContent, pageable, userProjects.size());
    }

    @Transactional
    public void addMember(UUID projectId, UUID memberUserId, String role, UUID actingUserId) {
        checkPermission(projectId, actingUserId, "ADMIN", "OWNER");
        if (projectMemberRepository.existsByProjectIdAndUserId(projectId, memberUserId)) {
            ProjectMember member = projectMemberRepository.findByProjectIdAndUserId(projectId, memberUserId).get();
            member.setRole(role);
            projectMemberRepository.save(member);
        } else {
            ProjectMember member = ProjectMember.builder()
                    .projectId(projectId)
                    .userId(memberUserId)
                    .role(role)
                    .build();
            projectMemberRepository.save(member);

            // Notify the newly added member
            Project project = projectRepository.findById(projectId).orElse(null);
            String projectName = project != null ? project.getName() : projectId.toString();
            eventPublisher.publishEvent(new MemberAddedEvent(projectId, memberUserId, projectName, role));
        }
    }

    @Transactional
    public void removeMember(UUID projectId, UUID memberUserId, UUID actingUserId) {
        checkPermission(projectId, actingUserId, "ADMIN", "OWNER");
        Project project = projectRepository.findById(projectId)
                .orElseThrow(() -> new ResourceNotFoundException("Project not found"));
        if (project.getOwnerId().equals(memberUserId)) {
            throw new IllegalStateException("Project owner cannot be removed");
        }
        ProjectMember member = projectMemberRepository.findByProjectIdAndUserId(projectId, memberUserId)
                .orElseThrow(() -> new ResourceNotFoundException("Member not found"));
        projectMemberRepository.delete(member);
    }

    @Transactional(readOnly = true)
    public List<BoardResponse> getBoards(UUID projectId, UUID userId) {
        requireProjectMember(projectId, userId);
        List<Board> boards = boardRepository.findByProjectIdOrderBySortOrderAsc(projectId);
        return boards.stream().map(this::mapToBoardResponse).collect(Collectors.toList());
    }

    @Transactional
    public BoardResponse createBoard(UUID projectId, BoardRequest request, UUID userId) {
        checkPermission(projectId, userId, "ADMIN", "OWNER", "MEMBER");
        Board board = Board.builder()
                .projectId(projectId)
                .name(request.getName())
                .description(request.getDescription())
                .sortOrder(request.getSortOrder())
                .build();
        return mapToBoardResponse(boardRepository.save(board));
    }

    @Transactional
    public ColumnResponse createColumn(UUID projectId, UUID boardId, ColumnRequest request, UUID userId) {
        checkPermission(projectId, userId, "ADMIN", "OWNER", "MEMBER");
        Board board = boardRepository.findById(boardId)
                .orElseThrow(() -> new ResourceNotFoundException("Board not found"));
        if (!board.getProjectId().equals(projectId)) {
            throw new ResourceNotFoundException("Board not found in project");
        }
        Column column = Column.builder()
                .boardId(boardId)
                .name(request.getName())
                .colorHex(request.getColorHex())
                .sortOrder(request.getSortOrder())
                .wipLimit(request.getWipLimit())
                .build();
        return mapToColumnResponse(columnRepository.save(column));
    }

    @Transactional
    public ColumnResponse updateColumn(UUID projectId, UUID boardId, UUID columnId, ColumnRequest request, UUID userId) {
        checkPermission(projectId, userId, "ADMIN", "OWNER", "MEMBER");
        requireBoardInProject(projectId, boardId);
        Column column = columnRepository.findById(columnId)
                .orElseThrow(() -> new ResourceNotFoundException("Column not found"));
        if (!column.getBoardId().equals(boardId)) {
            throw new ResourceNotFoundException("Column not found in board");
        }
        column.setName(request.getName());
        column.setColorHex(request.getColorHex());
        column.setSortOrder(request.getSortOrder());
        column.setWipLimit(request.getWipLimit());
        return mapToColumnResponse(columnRepository.save(column));
    }

    @Transactional
    public void deleteColumn(UUID projectId, UUID boardId, UUID columnId, UUID userId) {
        checkPermission(projectId, userId, "ADMIN", "OWNER", "MEMBER");
        requireBoardInProject(projectId, boardId);
        Column column = columnRepository.findById(columnId)
                .orElseThrow(() -> new ResourceNotFoundException("Column not found"));
        if (!column.getBoardId().equals(boardId)) {
            throw new ResourceNotFoundException("Column not found in board");
        }
        List<Task> tasks = taskRepository.findByColumnIdOrderBySortOrderAsc(columnId);
        if (!tasks.isEmpty()) {
            throw new IllegalStateException("Column cannot be deleted while it contains tasks");
        }
        columnRepository.delete(column);
    }

    public void requireProjectMember(UUID projectId, UUID userId) {
        Project project = projectRepository.findById(projectId)
                .orElseThrow(() -> new ResourceNotFoundException("Project not found"));
        if (project.getOwnerId().equals(userId) || projectMemberRepository.existsByProjectIdAndUserId(projectId, userId)) {
            return;
        }
        throw new ForbiddenException("User is not a member of this project");
    }

    public void checkPermission(UUID projectId, UUID userId, String... allowedRoles) {
        Project project = projectRepository.findById(projectId)
                .orElseThrow(() -> new ResourceNotFoundException("Project not found"));
        if (project != null && project.getOwnerId().equals(userId)) {
            return; // Owner always has permission
        }

        ProjectMember member = projectMemberRepository.findByProjectIdAndUserId(projectId, userId)
                .orElseThrow(() -> new ForbiddenException("User is not a member of this project"));

        boolean hasRole = false;
        for (String role : allowedRoles) {
            if (member.getRole().equalsIgnoreCase(role)) {
                hasRole = true;
                break;
            }
        }
        if (!hasRole) {
            throw new ForbiddenException("Access denied: insufficient project role");
        }
    }

    public UUID getProjectIdForBoard(UUID boardId) {
        Board board = boardRepository.findById(boardId)
                .orElseThrow(() -> new ResourceNotFoundException("Board not found"));
        return board.getProjectId();
    }

    public UUID getProjectIdForColumn(UUID columnId) {
        Column column = columnRepository.findById(columnId)
                .orElseThrow(() -> new ResourceNotFoundException("Column not found"));
        return getProjectIdForBoard(column.getBoardId());
    }

    private void requireBoardInProject(UUID projectId, UUID boardId) {
        Board board = boardRepository.findById(boardId)
                .orElseThrow(() -> new ResourceNotFoundException("Board not found"));
        if (!board.getProjectId().equals(projectId)) {
            throw new ResourceNotFoundException("Board not found in project");
        }
    }

    private ProjectResponse mapToProjectResponse(Project project) {
        List<ProjectMember> members = projectMemberRepository.findByProjectId(project.getId());
        List<MemberResponse> memberResponses = members.stream()
                .map(m -> MemberResponse.builder()
                        .userId(m.getUserId())
                        .userIdSnake(m.getUserId())
                        .role(m.getRole())
                        .joinedAt(m.getJoinedAt())
                        .joinedAtSnake(m.getJoinedAt())
                        .displayName("User " + m.getUserId().toString().substring(0, 8))
                        .email("user-" + m.getUserId().toString().substring(0, 8) + "@example.com")
                        .build())
                .collect(Collectors.toList());

        return ProjectResponse.builder()
                .id(project.getId())
                .projectId(project.getId())
                .name(project.getName())
                .description(project.getDescription())
                .ownerId(project.getOwnerId())
                .status(project.getStatus())
                .createdAt(project.getCreatedAt())
                .createdAtSnake(project.getCreatedAt())
                .updatedAt(project.getUpdatedAt())
                .updatedAtSnake(project.getUpdatedAt())
                .members(memberResponses)
                .memberCount(memberResponses.size())
                .build();
    }

    private BoardResponse mapToBoardResponse(Board board) {
        List<Column> columns = columnRepository.findByBoardIdOrderBySortOrderAsc(board.getId());
        List<ColumnResponse> columnResponses = columns.stream()
                .map(c -> {
                    List<Task> tasks = taskRepository.findByColumnIdOrderBySortOrderAsc(c.getId());
                    List<TaskResponse> taskResponses = tasks.stream()
                            .map(this::mapToTaskResponse)
                            .collect(Collectors.toList());

                    return mapToColumnResponse(c, taskResponses);
                })
                .collect(Collectors.toList());

        return BoardResponse.builder()
                .id(board.getId())
                .boardId(board.getId())
                .projectId(board.getProjectId())
                .name(board.getName())
                .description(board.getDescription())
                .sortOrder(board.getSortOrder())
                .columns(columnResponses)
                .build();
    }

    private ColumnResponse mapToColumnResponse(Column column) {
        List<TaskResponse> taskResponses = taskRepository.findByColumnIdOrderBySortOrderAsc(column.getId()).stream()
                .map(this::mapToTaskResponse)
                .collect(Collectors.toList());
        return mapToColumnResponse(column, taskResponses);
    }

    private ColumnResponse mapToColumnResponse(Column column, List<TaskResponse> taskResponses) {
        return ColumnResponse.builder()
                .id(column.getId())
                .columnId(column.getId())
                .boardId(column.getBoardId())
                .name(column.getName())
                .colorHex(column.getColorHex())
                .sortOrder(column.getSortOrder())
                .wipLimit(column.getWipLimit())
                .tasks(taskResponses)
                .build();
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
}
