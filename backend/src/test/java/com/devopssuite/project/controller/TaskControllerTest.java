package com.devopssuite.project.controller;

import com.devopssuite.project.dto.ProjectDto.TaskResponse;
import com.devopssuite.project.service.TaskService;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.http.MediaType;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.context.SecurityContextHolder;
import com.devopssuite.security.JwtUtils;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;

import java.util.Collections;
import java.util.UUID;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@WebMvcTest(TaskController.class)
@AutoConfigureMockMvc(addFilters = false)
class TaskControllerTest {

    @Autowired
    private MockMvc mockMvc;

    @MockitoBean
    private TaskService taskService;

    @MockitoBean
    private JwtUtils jwtUtils;

    @MockitoBean
    private org.springframework.data.redis.core.StringRedisTemplate redisTemplate;

    @Test
    void createTaskInBoardSupportsDocumentedV1Path() throws Exception {
        UUID boardId = UUID.randomUUID();
        UUID columnId = UUID.randomUUID();
        UUID userId = UUID.randomUUID();

        when(taskService.createTaskInBoard(eq(boardId), any(), eq(userId))).thenReturn(
                TaskResponse.builder()
                        .id(UUID.randomUUID())
                        .columnId(columnId)
                        .title("Wire API")
                        .status("BACKLOG")
                        .build());

        var authentication = new UsernamePasswordAuthenticationToken(
                userId.toString(),
                null,
                Collections.emptyList());
        SecurityContextHolder.getContext().setAuthentication(authentication);

        try {
            mockMvc.perform(post("/api/v1/boards/{boardId}/tasks", boardId)
                            .contentType(MediaType.APPLICATION_JSON)
                            .content("{\"title\":\"Wire API\"}"))
                    .andExpect(status().isCreated())
                    .andExpect(jsonPath("$.data.title").value("Wire API"))
                    .andExpect(jsonPath("$.data.status").value("BACKLOG"));
        } finally {
            SecurityContextHolder.clearContext();
        }
    }
}
