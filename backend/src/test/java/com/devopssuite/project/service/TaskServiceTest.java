package com.devopssuite.project.service;

import com.devopssuite.project.dto.ProjectDto.TaskRequest;
import com.devopssuite.project.dto.ProjectDto.ReorderTaskItem;
import com.devopssuite.project.model.Board;
import com.devopssuite.project.model.Column;
import com.devopssuite.project.model.Task;
import com.devopssuite.project.repository.BoardRepository;
import com.devopssuite.project.repository.ColumnRepository;
import com.devopssuite.project.repository.TaskRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.context.ApplicationEventPublisher;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.when;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.times;

@ExtendWith(MockitoExtension.class)
class TaskServiceTest {

    @Mock
    private TaskRepository taskRepository;

    @Mock
    private ColumnRepository columnRepository;

    @Mock
    private BoardRepository boardRepository;

    @Mock
    private ProjectService projectService;

    @Mock
    private ApplicationEventPublisher eventPublisher;

    private TaskService taskService;

    @BeforeEach
    void setUp() {
        taskService = new TaskService(taskRepository, columnRepository, boardRepository, projectService, eventPublisher);
    }

    @Test
    void createTaskInBoardUsesFirstColumnWhenRequestColumnIsMissing() {
        UUID boardId = UUID.randomUUID();
        UUID projectId = UUID.randomUUID();
        UUID columnId = UUID.randomUUID();
        UUID userId = UUID.randomUUID();
        Board board = Board.builder().id(boardId).projectId(projectId).name("Main").build();
        Column column = Column.builder().id(columnId).boardId(boardId).name("Backlog").sortOrder(0).build();

        when(boardRepository.findById(boardId)).thenReturn(Optional.of(board));
        when(columnRepository.findByBoardIdOrderBySortOrderAsc(boardId)).thenReturn(List.of(column));
        when(columnRepository.findById(columnId)).thenReturn(Optional.of(column));
        when(projectService.getProjectIdForBoard(boardId)).thenReturn(projectId);
        when(taskRepository.findByColumnIdOrderBySortOrderAsc(columnId)).thenReturn(List.of());
        when(taskRepository.saveAndFlush(any(Task.class))).thenAnswer(invocation -> {
            Task task = invocation.getArgument(0);
            task.setId(UUID.randomUUID());
            return task;
        });

        var response = taskService.createTaskInBoard(
                boardId,
                new TaskRequest(null, null, "Wire API", "Connect frontend", "MEDIUM", null, null),
                userId);

        assertThat(response.getColumnId()).isEqualTo(columnId);
        assertThat(response.getStatus()).isEqualTo("BACKLOG");
        verify(projectService, times(2)).checkPermission(projectId, userId, "ADMIN", "OWNER", "MEMBER");
    }

    @Test
    void createTaskNormalizesToDoColumnToTodoStatus() {
        UUID boardId = UUID.randomUUID();
        UUID projectId = UUID.randomUUID();
        UUID columnId = UUID.randomUUID();
        UUID userId = UUID.randomUUID();
        Column column = Column.builder().id(columnId).boardId(boardId).name("To Do").sortOrder(1).build();

        when(columnRepository.findById(columnId)).thenReturn(Optional.of(column));
        when(projectService.getProjectIdForBoard(boardId)).thenReturn(projectId);
        when(taskRepository.findByColumnIdOrderBySortOrderAsc(columnId)).thenReturn(List.of());
        when(taskRepository.saveAndFlush(any(Task.class))).thenAnswer(invocation -> {
            Task task = invocation.getArgument(0);
            task.setId(UUID.randomUUID());
            return task;
        });

        var response = taskService.createTask(
                new TaskRequest(columnId, null, "Fix To Do", null, "MEDIUM", null, null),
                userId);

        assertThat(response.getStatus()).isEqualTo("TODO");
    }

    @Test
    void createTaskRejectsColumnAtWipLimit() {
        UUID boardId = UUID.randomUUID();
        UUID projectId = UUID.randomUUID();
        UUID columnId = UUID.randomUUID();
        UUID userId = UUID.randomUUID();
        Column column = Column.builder().id(columnId).boardId(boardId).name("In Progress").wipLimit(1).build();
        Task existingTask = Task.builder().id(UUID.randomUUID()).columnId(columnId).title("Existing").build();

        when(columnRepository.findById(columnId)).thenReturn(Optional.of(column));
        when(projectService.getProjectIdForBoard(boardId)).thenReturn(projectId);
        when(taskRepository.findByColumnIdOrderBySortOrderAsc(columnId)).thenReturn(List.of(existingTask));

        assertThatThrownBy(() -> taskService.createTask(
                new TaskRequest(columnId, null, "Second task", null, "MEDIUM", null, null),
                userId))
                .isInstanceOf(IllegalStateException.class)
                .hasMessageContaining("WIP limit");
    }

    @Test
    void reorderTasksNormalizesToDoColumnToTodoStatus() {
        UUID projectId = UUID.randomUUID();
        UUID boardId = UUID.randomUUID();
        UUID taskId = UUID.randomUUID();
        UUID sourceColumnId = UUID.randomUUID();
        UUID targetColumnId = UUID.randomUUID();
        UUID userId = UUID.randomUUID();

        Board board = Board.builder().id(boardId).projectId(projectId).name("Main").build();
        Column sourceColumn = Column.builder().id(sourceColumnId).boardId(boardId).name("Backlog").build();
        Column targetColumn = Column.builder().id(targetColumnId).boardId(boardId).name("To Do").build();
        Task task = Task.builder().id(taskId).columnId(sourceColumnId).title("Move me").status("BACKLOG").build();

        when(boardRepository.findById(boardId)).thenReturn(Optional.of(board));
        when(taskRepository.findById(taskId)).thenReturn(Optional.of(task));
        when(projectService.getProjectIdForColumn(sourceColumnId)).thenReturn(projectId);
        when(projectService.getProjectIdForColumn(targetColumnId)).thenReturn(projectId);
        when(columnRepository.findById(targetColumnId)).thenReturn(Optional.of(targetColumn));
        when(taskRepository.findByColumnIdOrderBySortOrderAsc(targetColumnId)).thenReturn(List.of());

        taskService.reorderTasks(projectId, boardId, List.of(new ReorderTaskItem(taskId, targetColumnId, 0)), userId);

        assertThat(task.getColumnId()).isEqualTo(targetColumnId);
        assertThat(task.getSortOrder()).isZero();
        assertThat(task.getStatus()).isEqualTo("TODO");
    }
}
