package com.devopssuite.execution.service;

import com.devopssuite.execution.config.ExecutionProperties;
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
import java.util.concurrent.TimeUnit;

@Component
@RequiredArgsConstructor
@Slf4j
public class ExecutionQueueWorker {

    private final ExecutionService executionService;
    private final ExecutionRequestRepository requestRepository;
    private final ExecutionResultRepository resultRepository;
    private final DockerSandbox dockerSandbox;
    private final ExecutionProperties props;

    private ExecutorService executorService;
    private volatile boolean running = true;

    @PostConstruct
    public void start() {
        int poolSize = props.getPoolSize();
        executorService = Executors.newFixedThreadPool(poolSize);
        running = true;

        for (int i = 0; i < poolSize; i++) {
            executorService.submit(this::workerLoop);
        }
        log.info("Started {} sandbox execution worker thread(s).", poolSize);
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
                log.error("Uncaught error in sandbox worker loop", e);
            }
        }
    }

    private void processRequest(UUID requestId) {
        log.info("Worker picked up request: {}", requestId);

        ExecutionRequest request = requestRepository.findById(requestId).orElse(null);
        if (request == null) {
            log.warn("Request {} not found in DB — skipping", requestId);
            return;
        }

        // Mark as RUNNING
        request.setStatus("RUNNING");
        request.setStartedAt(Instant.now());
        requestRepository.saveAndFlush(request);

        DockerSandbox.SandboxResult sandboxResult;
        try {
            sandboxResult = dockerSandbox.runCode(
                    request.getLanguage().getName(),
                    request.getLanguage().getDockerImage(),
                    request.getLanguage().getFileExtension(),
                    request.getSourceCode(),
                    request.getStdin(),
                    request.getMaxTimeMs(),
                    request.getMaxMemoryMb()
            );
        } catch (Exception e) {
            log.error("Sandbox threw an unexpected exception for request {}", requestId, e);
            // Treat as infrastructure failure
            sandboxResult = new DockerSandbox.SandboxResult();
            sandboxResult.stderr = "System error: " + e.getMessage();
            sandboxResult.exitCode = -1;
        }

        // Determine terminal status from sandbox outcome
        String terminalStatus = resolveTerminalStatus(sandboxResult);

        // Persist result
        ExecutionResult result = ExecutionResult.builder()
                .requestId(request.getId())
                .stdout(sandboxResult.stdout)
                .stderr(sandboxResult.stderr)
                .exitCode(sandboxResult.exitCode)
                .executionTimeMs((int) sandboxResult.executionTimeMs)
                .memoryUsedKb(null)          // Docker stats not wired; null is preferable to a misleading 0
                .timedOut(sandboxResult.timedOut)
                .oomKilled(sandboxResult.oomKilled)
                .build();

        resultRepository.saveAndFlush(result);

        // Update request to terminal status
        request.setStatus(terminalStatus);
        request.setCompletedAt(Instant.now());
        requestRepository.saveAndFlush(request);

        log.info("Request {} finished with status={} exitCode={} timedOut={} oomKilled={}",
                requestId, terminalStatus, sandboxResult.exitCode,
                sandboxResult.timedOut, sandboxResult.oomKilled);
    }

    /**
     * Maps sandbox result fields to the canonical API status enum:
     * TIMEOUT | OOM_KILLED | FAILED | COMPLETED
     *
     * Note: non-zero exit codes from user code are still COMPLETED — it's the
     * user program that failed, not the infrastructure. This matches LeetCode-style
     * semantics documented in the task spec.
     */
    private String resolveTerminalStatus(DockerSandbox.SandboxResult r) {
        if (r.timedOut) return "TIMEOUT";
        if (r.oomKilled) return "OOM_KILLED";
        // System errors emitted by DockerSandbox use "System error:" prefix
        if (r.stderr != null && r.stderr.startsWith("System error:")) return "FAILED";
        return "COMPLETED";
    }

    @PreDestroy
    public void stop() {
        running = false;
        if (executorService != null) {
            executorService.shutdownNow();
            try {
                if (!executorService.awaitTermination(5, TimeUnit.SECONDS)) {
                    log.warn("Sandbox worker pool did not terminate cleanly within 5 s");
                }
            } catch (InterruptedException e) {
                Thread.currentThread().interrupt();
            }
        }
    }
}
