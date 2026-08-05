package com.devopssuite.monolith.execution.service;

import com.devopssuite.monolith.execution.dto.ExecutionDto.*;
import com.devopssuite.monolith.execution.model.ExecutionRequest;
import com.devopssuite.monolith.execution.model.ExecutionResult;
import com.devopssuite.monolith.execution.model.Language;
import com.devopssuite.monolith.execution.repository.ExecutionRequestRepository;
import com.devopssuite.monolith.execution.repository.ExecutionResultRepository;
import com.devopssuite.monolith.execution.repository.LanguageRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.UUID;
import java.util.concurrent.BlockingQueue;
import java.util.concurrent.LinkedBlockingQueue;

@Service
@RequiredArgsConstructor
@Slf4j
public class ExecutionService {

    private final LanguageRepository languageRepository;
    private final ExecutionRequestRepository requestRepository;
    private final ExecutionResultRepository resultRepository;

    // In-memory queue to coordinate async background workers
    private final BlockingQueue<UUID> executionQueue = new LinkedBlockingQueue<>();

    public BlockingQueue<UUID> getExecutionQueue() {
        return executionQueue;
    }

    @Transactional
    public SubmitResponse submitExecution(SubmitRequest request, UUID userId) {
        Language language = languageRepository.findByNameIgnoreCase(request.getLanguage())
                .orElseThrow(() -> new IllegalArgumentException("Unsupported language: " + request.getLanguage()));

        int maxTime = request.getMaxTimeMs() != null ? request.getMaxTimeMs() : language.getMaxExecutionTimeMs();
        int maxMem = request.getMaxMemoryMb() != null ? request.getMaxMemoryMb() : language.getMaxMemoryMb();

        ExecutionRequest execRequest = ExecutionRequest.builder()
                .userId(userId)
                .language(language)
                .sourceCode(request.getSourceCode())
                .stdin(request.getStdin())
                .maxTimeMs(maxTime)
                .maxMemoryMb(maxMem)
                .status("PENDING")
                .build();

        ExecutionRequest saved = requestRepository.saveAndFlush(execRequest);
        executionQueue.offer(saved.getId());

        return SubmitResponse.builder()
                .executionId(saved.getId())
                .status(saved.getStatus())
                .build();
    }

    @Transactional(readOnly = true)
    public QueryResponse getResult(UUID executionId) {
        ExecutionRequest request = requestRepository.findById(executionId)
                .orElseThrow(() -> new IllegalArgumentException("Execution request not found"));

        QueryResponse.QueryResponseBuilder builder = QueryResponse.builder()
                .executionId(request.getId())
                .status(request.getStatus());

        if (request.getStatus().equals("COMPLETED") || request.getStatus().equals("FAILED")) {
            resultRepository.findByRequestId(request.getId()).ifPresent(res -> {
                builder.stdout(res.getStdout())
                        .stderr(res.getStderr())
                        .exitCode(res.getExitCode())
                        .executionTimeMs(res.getExecutionTimeMs())
                        .memoryUsedKb(res.getMemoryUsedKb())
                        .timedOut(res.isTimedOut())
                        .oomKilled(res.isOomKilled());
            });
        }

        return builder.build();
    }
}
