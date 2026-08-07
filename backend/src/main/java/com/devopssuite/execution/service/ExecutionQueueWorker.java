package com.devopssuite.execution.service;

import com.devopssuite.execution.model.ExecutionRequest;
import com.devopssuite.execution.model.ExecutionResult;
import com.devopssuite.execution.repository.ExecutionRequestRepository;
import com.devopssuite.execution.repository.ExecutionResultRepository;
import com.devopssuite.execution.sandbox.DockerSandbox;
import jakarta.annotation.PostConstruct;
import jakarta.annotation.PreDestroy;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Component;

import java.time.Instant;
import java.util.UUID;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;

@Component
@RequiredArgsConstructor
@Slf4j
public class ExecutionQueueWorker {

    private final ExecutionService executionService;
    private final ExecutionRequestRepository requestRepository;
    private final ExecutionResultRepository resultRepository;
    private final DockerSandbox dockerSandbox;

    private ExecutorService executorService;
    private boolean running = true;

    @PostConstruct
    public void start() {
        // Pool size config from properties or defaults to 4 threads
        executorService = Executors.newFixedThreadPool(4);
        running = true;

        for (int i = 0; i < 4; i++) {
            executorService.submit(this::workerLoop);
        }
        log.info("Started 4 sandbox code execution background worker threads.");
    }

    private void workerLoop() {
        while (running) {
            try {
                UUID requestId = executionService.getExecutionQueue().take();
                processRequest(requestId);
            } catch (InterruptedException e) {
                Thread.currentThread().interrupt();
                break;
            } catch (Exception e) {
                log.error("Error processing execution request in worker loop", e);
            }
        }
    }

    private void processRequest(UUID requestId) {
        log.info("Background worker picked up request: {}", requestId);
        ExecutionRequest request = requestRepository.findById(requestId).orElse(null);
        if (request == null) {
            log.warn("Request not found in database: {}", requestId);
            return;
        }

        try {
            // Update request status to RUNNING
            request.setStatus("RUNNING");
            request.setStartedAt(Instant.now());
            requestRepository.saveAndFlush(request);

            // Execute code in sandbox
            DockerSandbox.SandboxResult sandboxResult = dockerSandbox.runCode(
                    request.getLanguage().getName(),
                    request.getLanguage().getDockerImage(),
                    request.getLanguage().getFileExtension(),
                    request.getSourceCode(),
                    request.getStdin(),
                    request.getMaxTimeMs(),
                    request.getMaxMemoryMb()
            );

            // Build result entity
            ExecutionResult result = ExecutionResult.builder()
                    .requestId(request.getId())
                    .stdout(sandboxResult.stdout)
                    .stderr(sandboxResult.stderr)
                    .exitCode(sandboxResult.exitCode)
                    .executionTimeMs((int) sandboxResult.executionTimeMs)
                    .memoryUsedKb(0) // Docker client memory measurement is omitted for simplicity in local run
                    .timedOut(sandboxResult.timedOut)
                    .oomKilled(sandboxResult.oomKilled)
                    .build();

            resultRepository.saveAndFlush(result);

            // Update request status to COMPLETED
            request.setStatus("COMPLETED");
            request.setCompletedAt(Instant.now());
            requestRepository.saveAndFlush(request);
            log.info("Request completed successfully: {}", requestId);

        } catch (Exception e) {
            log.error("Failed to execute request {}", requestId, e);
            request.setStatus("FAILED");
            request.setCompletedAt(Instant.now());
            requestRepository.saveAndFlush(request);

            ExecutionResult result = ExecutionResult.builder()
                    .requestId(request.getId())
                    .stdout("")
                    .stderr("Execution engine failure: " + e.getMessage())
                    .exitCode(-1)
                    .executionTimeMs(0)
                    .timedOut(false)
                    .oomKilled(false)
                    .build();
            resultRepository.saveAndFlush(result);
        }
    }

    @PreDestroy
    public void stop() {
        running = false;
        if (executorService != null) {
            executorService.shutdownNow();
        }
    }
}
