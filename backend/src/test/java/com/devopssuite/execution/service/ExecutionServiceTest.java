package com.devopssuite.execution.service;

import com.devopssuite.execution.config.ExecutionProperties;
import com.devopssuite.execution.dto.ExecutionDto.SubmitRequest;
import com.devopssuite.execution.dto.ExecutionDto.SubmitResponse;
import com.devopssuite.execution.model.Language;
import com.devopssuite.execution.repository.ExecutionRequestRepository;
import com.devopssuite.execution.repository.ExecutionResultRepository;
import com.devopssuite.execution.repository.LanguageRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.Spy;
import org.mockito.junit.jupiter.MockitoExtension;
import org.mockito.junit.jupiter.MockitoSettings;
import org.mockito.quality.Strictness;

import java.util.Optional;
import java.util.UUID;

import static org.assertj.core.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.argThat;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
@MockitoSettings(strictness = Strictness.LENIENT)
class ExecutionServiceTest {

    @Mock
    private LanguageRepository languageRepository;

    @Mock
    private ExecutionRequestRepository requestRepository;

    @Mock
    private ExecutionResultRepository resultRepository;

    @Spy
    private ExecutionProperties props = new ExecutionProperties();

    @InjectMocks
    private ExecutionService service;

    private Language pythonLanguage;

    @BeforeEach
    void setUp() {
        pythonLanguage = Language.builder()
                .id(UUID.randomUUID())
                .name("python")
                .version("3.12")
                .dockerImage("python:3.12-alpine")
                .fileExtension("py")
                .maxExecutionTimeMs(5000)
                .maxMemoryMb(256)
                .enabled(true)
                .build();

        // Mock save to return same entity with an id
        when(requestRepository.saveAndFlush(any())).thenAnswer(inv -> {
            var req = inv.getArgument(0, com.devopssuite.execution.model.ExecutionRequest.class);
            if (req.getId() == null) {
                // Simulate @PrePersist + @GeneratedValue
                java.lang.reflect.Field idField = req.getClass().getDeclaredField("id");
                idField.setAccessible(true);
                idField.set(req, UUID.randomUUID());
                java.lang.reflect.Field createdAtField = req.getClass().getDeclaredField("createdAt");
                createdAtField.setAccessible(true);
                createdAtField.set(req, java.time.Instant.now());
            }
            return req;
        });
    }

    // ── Language alias resolution ─────────────────────────────────────────────

    @Test
    void python3_alias_resolves_to_python() {
        when(languageRepository.findByNameIgnoreCase("python")).thenReturn(Optional.of(pythonLanguage));

        SubmitRequest req = SubmitRequest.builder()
                .language("python3")
                .sourceCode("print('hi')")
                .build();

        SubmitResponse res = service.submitExecution(req, UUID.randomUUID());

        assertThat(res.getStatus()).isEqualTo("QUEUED");
        verify(languageRepository).findByNameIgnoreCase("python");
    }

    @Test
    void node_alias_resolves_to_javascript() {
        Language js = Language.builder()
                .id(UUID.randomUUID())
                .name("javascript")
                .version("24")
                .dockerImage("node:24-alpine")
                .fileExtension("js")
                .maxExecutionTimeMs(5000)
                .maxMemoryMb(256)
                .enabled(true)
                .build();
        when(languageRepository.findByNameIgnoreCase("javascript")).thenReturn(Optional.of(js));

        SubmitRequest req = SubmitRequest.builder()
                .language("node")
                .sourceCode("console.log('hi')")
                .build();

        SubmitResponse res = service.submitExecution(req, UUID.randomUUID());
        assertThat(res.getStatus()).isEqualTo("QUEUED");
        verify(languageRepository).findByNameIgnoreCase("javascript");
    }

    @Test
    void cpp_alias_from_c_plus_plus() {
        Language cpp = Language.builder()
                .id(UUID.randomUUID())
                .name("cpp")
                .version("13")
                .dockerImage("gcc:13-alpine")
                .fileExtension("cpp")
                .maxExecutionTimeMs(10000)
                .maxMemoryMb(256)
                .enabled(true)
                .build();
        when(languageRepository.findByNameIgnoreCase("cpp")).thenReturn(Optional.of(cpp));

        SubmitRequest req = SubmitRequest.builder()
                .language("c++")
                .sourceCode("#include<iostream>")
                .build();

        service.submitExecution(req, UUID.randomUUID());
        verify(languageRepository).findByNameIgnoreCase("cpp");
    }

    // ── Input validation ─────────────────────────────────────────────────────

    @Test
    void rejects_unknown_language() {
        when(languageRepository.findByNameIgnoreCase("brainfuck")).thenReturn(Optional.empty());

        SubmitRequest req = SubmitRequest.builder()
                .language("brainfuck")
                .sourceCode("++++")
                .build();

        assertThatThrownBy(() -> service.submitExecution(req, UUID.randomUUID()))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessageContaining("Unsupported language");
    }

    @Test
    void rejects_disabled_language() {
        Language disabled = Language.builder()
                .id(UUID.randomUUID())
                .name("python")
                .version("2.7")
                .dockerImage("python:2.7-alpine")
                .fileExtension("py")
                .maxExecutionTimeMs(5000)
                .maxMemoryMb(256)
                .enabled(false)   // disabled
                .build();
        when(languageRepository.findByNameIgnoreCase("python")).thenReturn(Optional.of(disabled));

        SubmitRequest req = SubmitRequest.builder()
                .language("python")
                .sourceCode("print('hi')")
                .build();

        assertThatThrownBy(() -> service.submitExecution(req, UUID.randomUUID()))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessageContaining("disabled");
    }

    @Test
    void rejects_source_code_exceeding_max_size() {
        // 66 KB > default 64 KB limit
        String hugeCode = "x".repeat(66 * 1024);
        SubmitRequest req = SubmitRequest.builder()
                .language("python")
                .sourceCode(hugeCode)
                .build();

        assertThatThrownBy(() -> service.submitExecution(req, UUID.randomUUID()))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessageContaining("Source code exceeds");
    }

    @Test
    void rejects_stdin_exceeding_max_size() {
        when(languageRepository.findByNameIgnoreCase("python")).thenReturn(Optional.of(pythonLanguage));

        // 17 KB > default 16 KB limit
        String hugeStdin = "x".repeat(17 * 1024);
        SubmitRequest req = SubmitRequest.builder()
                .language("python")
                .sourceCode("print('hi')")
                .stdin(hugeStdin)
                .build();

        assertThatThrownBy(() -> service.submitExecution(req, UUID.randomUUID()))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessageContaining("Stdin exceeds");
    }

    // ── Status and clamping ──────────────────────────────────────────────────

    @Test
    void initial_status_is_QUEUED() {
        when(languageRepository.findByNameIgnoreCase("python")).thenReturn(Optional.of(pythonLanguage));

        SubmitRequest req = SubmitRequest.builder()
                .language("python")
                .sourceCode("print('hello')")
                .build();

        SubmitResponse res = service.submitExecution(req, UUID.randomUUID());
        assertThat(res.getStatus()).isEqualTo("QUEUED");
    }

    @Test
    void clamps_max_time_to_language_ceiling() {
        when(languageRepository.findByNameIgnoreCase("python")).thenReturn(Optional.of(pythonLanguage));

        SubmitRequest req = SubmitRequest.builder()
                .language("python")
                .sourceCode("print('hi')")
                .maxTimeMs(999_999)   // absurdly large — must be clamped to 5000
                .build();

        // Verify the saved entity has clamped time
        service.submitExecution(req, UUID.randomUUID());
        verify(requestRepository).saveAndFlush(argThat(r -> r.getMaxTimeMs() <= pythonLanguage.getMaxExecutionTimeMs()));
    }
}
