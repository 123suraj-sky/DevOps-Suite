package com.devopssuite.project.service;

import com.devopssuite.project.dto.ProjectDto.BoardRequest;
import com.devopssuite.project.dto.ProjectDto.ProjectRequest;
import com.devopssuite.project.model.Board;
import com.devopssuite.project.model.Project;
import com.devopssuite.project.model.ProjectMember;
import com.devopssuite.project.repository.BoardRepository;
import com.devopssuite.project.repository.ColumnRepository;
import com.devopssuite.project.repository.ProjectMemberRepository;
import com.devopssuite.project.repository.ProjectRepository;
import com.devopssuite.project.repository.TaskRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
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
class ProjectServiceTest {

    @Mock
    private ProjectRepository projectRepository;

    @Mock
    private ProjectMemberRepository projectMemberRepository;

    @Mock
    private BoardRepository boardRepository;

    @Mock
    private ColumnRepository columnRepository;

    @Mock
    private TaskRepository taskRepository;

    @Mock
    private ApplicationEventPublisher eventPublisher;

    private ProjectService projectService;

    @BeforeEach
    void setUp() {
        projectService = new ProjectService(
                projectRepository,
                projectMemberRepository,
                boardRepository,
                columnRepository,
                taskRepository,
                eventPublisher);
    }

    @Test
    void createProjectCreatesOwnerMemberBoardAndDefaultColumns() {
        UUID projectId = UUID.randomUUID();
        UUID boardId = UUID.randomUUID();
        UUID ownerId = UUID.randomUUID();

        when(projectRepository.save(any(Project.class))).thenAnswer(invocation -> {
            Project project = invocation.getArgument(0);
            project.setId(projectId);
            return project;
        });
        when(boardRepository.save(any(Board.class))).thenAnswer(invocation -> {
            Board board = invocation.getArgument(0);
            board.setId(boardId);
            return board;
        });
        when(projectMemberRepository.findByProjectId(projectId)).thenReturn(List.of(
                ProjectMember.builder()
                        .projectId(projectId)
                        .userId(ownerId)
                        .role("OWNER")
                        .build()));

        projectService.createProject(new ProjectRequest("Platform", "Core work"), ownerId);

        ArgumentCaptor<ProjectMember> memberCaptor = ArgumentCaptor.forClass(ProjectMember.class);
        verify(projectMemberRepository).save(memberCaptor.capture());
        assertThat(memberCaptor.getValue().getProjectId()).isEqualTo(projectId);
        assertThat(memberCaptor.getValue().getUserId()).isEqualTo(ownerId);
        assertThat(memberCaptor.getValue().getRole()).isEqualTo("OWNER");

        verify(columnRepository, times(4)).save(any());
    }

    @Test
    void createBoardRejectsNonMembers() {
        UUID projectId = UUID.randomUUID();
        UUID ownerId = UUID.randomUUID();
        UUID userId = UUID.randomUUID();
        Project project = Project.builder()
                .id(projectId)
                .ownerId(ownerId)
                .name("Platform")
                .status("ACTIVE")
                .build();

        when(projectRepository.findById(projectId)).thenReturn(Optional.of(project));
        when(projectMemberRepository.findByProjectIdAndUserId(projectId, userId)).thenReturn(Optional.empty());

        assertThatThrownBy(() -> projectService.createBoard(
                projectId,
                new BoardRequest("Delivery", "Sprint board", 0),
                userId))
                .isInstanceOf(ForbiddenException.class)
                .hasMessageContaining("not a member");
    }
}
