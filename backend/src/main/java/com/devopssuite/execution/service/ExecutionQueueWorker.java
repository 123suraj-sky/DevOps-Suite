package com.devopssuite.execution.service;

import com.devopssuite.execution.config.ExecutionProperties;
import com.devopssuite.execution.model.ExecutionRequest;
import com.devopssuite.execution.model.ExecutionResult;
import com.devopssuite.execution.repository.ExecutionRequestRepository;
import com.devopssuite.execution.repository.ExecutionResultRepository;
import com.devopssuite.execution.sandbox.DockerSandbox;
import com.devopssuite.ide.model.IdeFile;
import com.devopssuite.ide.service.IdeFileService;
import jakarta.annotation.PostConstruct;
import jakarta.annotation.PreDestroy;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Component;

import java.time.Instant;
import java.util.Collections;
import java.util.List;
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
    private final IdeFileService ideFileService;

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
            if (request.getFileId() != null) {
                // ── IDE mode: send all project files to the sandbox ───────────────
                sandboxResult = runIdeMode(request);
            } else {
                // ── Classic mode: single inline file ─────────────────────────────
                sandboxResult = dockerSandbox.runCode(
                        request.getLanguage().getName(),
                        request.getLanguage().getDockerImage(),
                        request.getLanguage().getFileExtension(),
                        request.getSourceCode(),
                        request.getStdin(),
                        request.getMaxTimeMs(),
                        request.getMaxMemoryMb()
                );
            }
        } catch (Exception e) {
            log.error("Sandbox threw an unexpected exception for request {}", requestId, e);
            sandboxResult = new DockerSandbox.SandboxResult();
            sandboxResult.stderr = "System error: " + e.getMessage();
            sandboxResult.exitCode = -1;
        }

        String terminalStatus = resolveTerminalStatus(sandboxResult);

        ExecutionResult result = ExecutionResult.builder()
                .requestId(request.getId())
                .stdout(sandboxResult.stdout)
                .stderr(sandboxResult.stderr)
                .exitCode(sandboxResult.exitCode)
                .executionTimeMs((int) sandboxResult.executionTimeMs)
                .memoryUsedKb(null)
                .timedOut(sandboxResult.timedOut)
                .oomKilled(sandboxResult.oomKilled)
                .build();

        resultRepository.saveAndFlush(result);

        request.setStatus(terminalStatus);
        request.setCompletedAt(Instant.now());
        requestRepository.saveAndFlush(request);

        log.info("Request {} finished with status={} exitCode={} timedOut={} oomKilled={}",
                requestId, terminalStatus, sandboxResult.exitCode,
                sandboxResult.timedOut, sandboxResult.oomKilled);
    }

    /**
     * Builds the full multi-file workspace from the project's IDE files and
     * delegates to the sandbox. The entry point file path is determined from the
     * request's stored source code language (which matches the clicked file).
     */
    private DockerSandbox.SandboxResult runIdeMode(ExecutionRequest request) {
        // Load the target file to get its path (used as entry point)
        IdeFile targetFile = ideFileService.getFileEntityInternal(request.getFileId());

        // Load all non-folder files in the same project
        List<IdeFile> allFiles = ideFileService.getProjectFilesInternal(targetFile.getProjectId());

        if (allFiles.isEmpty()) {
            DockerSandbox.SandboxResult err = new DockerSandbox.SandboxResult();
            err.stderr   = "System error: No files found in project workspace.";
            err.exitCode = -1;
            return err;
        }

        // Build the FileEntry list
        List<DockerSandbox.FileEntry> entries = allFiles.stream()
                .map(f -> new DockerSandbox.FileEntry(f.getPath(), f.getContent()))
                .toList();

        return dockerSandbox.runProject(
                request.getLanguage().getName(),
                request.getLanguage().getDockerImage(),
                targetFile.getPath(),          // entry point
                entries,
                request.getStdin(),
                request.getMaxTimeMs(),
                request.getMaxMemoryMb()
        );
    }

    /**
     * TIMEOUT | OOM_KILLED | FAILED | COMPLETED
     * Non-zero exit codes from user code remain COMPLETED — user error, not infra error.
     */
    private String resolveTerminalStatus(DockerSandbox.SandboxResult r) {
        if (r.timedOut)  return "TIMEOUT";
        if (r.oomKilled) return "OOM_KILLED";
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
