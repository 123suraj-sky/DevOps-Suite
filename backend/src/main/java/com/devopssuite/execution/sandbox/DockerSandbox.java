package com.devopssuite.execution.sandbox;

import com.devopssuite.execution.config.ExecutionProperties;
import com.github.dockerjava.api.DockerClient;
import com.github.dockerjava.api.command.CreateContainerResponse;
import com.github.dockerjava.api.command.PullImageResultCallback;
import com.github.dockerjava.api.model.Bind;
import com.github.dockerjava.api.model.HostConfig;
import com.github.dockerjava.api.model.Volume;
import com.github.dockerjava.api.model.Frame;
import com.github.dockerjava.core.command.LogContainerResultCallback;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Component;

import java.io.IOException;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;
import java.util.concurrent.TimeUnit;

/**
 * Runs user-submitted source code inside an ephemeral, isolated Docker container.
 *
 * <h3>DinD bind-mount strategy</h3>
 * When the backend runs inside Docker Compose, sibling sandbox containers are
 * created by the host Docker daemon. Files written inside the backend container
 * at {@code sandboxTempDir/run_<id>/} must be visible to the daemon via a
 * host-side path. This is achieved by:
 * <ol>
 *   <li>bind-mounting {@code ./sandbox-temp} → {@code sandboxTempDir} in docker-compose.yml</li>
 *   <li>setting {@code DOCKER_HOST_TEMP_DIR} to the absolute host-side path of sandbox-temp</li>
 *   <li>using {@code hostTempDir/run_<id>/} as the bind-source when creating sandbox containers</li>
 * </ol>
 * For local dev (backend running natively), leave {@code DOCKER_HOST_TEMP_DIR} blank —
 * the in-process path is used directly.
 */
@Component
@RequiredArgsConstructor
@Slf4j
public class DockerSandbox {

    private final DockerClient dockerClient;
    private final ExecutionProperties props;

    // ── Result carrier ──────────────────────────────────────────────────────────

    public static class SandboxResult {
        public String stdout = "";
        public String stderr = "";
        public int exitCode = -1;
        public boolean timedOut = false;
        public boolean oomKilled = false;
        public long executionTimeMs = 0;
    }

    // ── Public API ──────────────────────────────────────────────────────────────

    public SandboxResult runCode(
            String language,
            String dockerImage,
            String fileExtension,
            String sourceCode,
            String stdin,
            int maxTimeMs,
            int maxMemoryMb) {

        SandboxResult result = new SandboxResult();
        String runId = UUID.randomUUID().toString();

        // Resolve in-container workspace path
        Path workspacePath = Paths.get(props.getSandboxTempDir(), "run_" + runId);
        try {
            Files.createDirectories(workspacePath);
        } catch (IOException e) {
            log.error("Failed to create sandbox temp directory: {}", workspacePath, e);
            result.stderr = "System error: Failed to initialize execution sandbox environment.";
            return result;
        }

        // Write source file
        String fileName = language.equalsIgnoreCase("java") ? "Main.java" : "code." + fileExtension;
        try {
            Files.writeString(workspacePath.resolve(fileName), sourceCode, StandardCharsets.UTF_8);
        } catch (IOException e) {
            log.error("Failed to write source code to file", e);
            result.stderr = "System error: Failed to save source code.";
            cleanupDirectory(workspacePath);
            return result;
        }

        // Write stdin file
        try {
            Files.writeString(workspacePath.resolve("input.txt"),
                    stdin != null ? stdin : "", StandardCharsets.UTF_8);
        } catch (IOException e) {
            log.error("Failed to write stdin to file", e);
            result.stderr = "System error: Failed to save stdin.";
            cleanupDirectory(workspacePath);
            return result;
        }

        // Pull image if not cached locally
        try {
            ensureImageExists(dockerImage);
        } catch (Exception e) {
            log.error("Failed to ensure image exists: {}", dockerImage, e);
            result.stderr = "System error: Failed to download sandbox runtime environment.";
            cleanupDirectory(workspacePath);
            return result;
        }

        String containerId = null;
        try {
            // Build shell command for language
            String[] cmd = buildCommand(language);

            // Resolve host-visible bind-source path (for DinD scenarios)
            String bindSource = resolveHostBindPath(runId);
            log.debug("Sandbox bind: {} -> /app (language={})", bindSource, language);

            // Resource limits: 1 CPU, capped memory, no network, read-only FS
            long memoryBytes = (long) maxMemoryMb * 1024L * 1024L;
            HostConfig hostConfig = HostConfig.newHostConfig()
                    .withMemory(memoryBytes)
                    .withMemorySwap(memoryBytes)        // no swap escape
                    .withNanoCPUs(1_000_000_000L)       // 1 CPU core
                    .withNetworkMode("none")             // air-gapped
                    .withReadonlyRootfs(true)            // immutable FS
                    .withTmpFs(java.util.Map.of(
                            "/tmp", "rw,exec,nosuid,size=64m"  // compiler scratch (exec required to run compiled binary)
                    ))
                    .withBinds(new Bind(bindSource, new Volume("/app")));

            CreateContainerResponse container = dockerClient.createContainerCmd(dockerImage)
                    .withHostConfig(hostConfig)
                    .withWorkingDir("/app")
                    .withCmd(cmd)
                    .exec();

            containerId = container.getId();
            long startTime = System.currentTimeMillis();

            dockerClient.startContainerCmd(containerId).exec();

            // Wait for completion or timeout
            long timeoutSec = Math.max(1L, (long) Math.ceil(maxTimeMs / 1000.0));
            boolean completed;
            try {
                completed = dockerClient.waitContainerCmd(containerId)
                        .start()
                        .awaitCompletion(timeoutSec, TimeUnit.SECONDS);
            } catch (InterruptedException e) {
                Thread.currentThread().interrupt();
                log.warn("Container wait interrupted for {}", containerId);
                completed = false;
            }

            result.executionTimeMs = System.currentTimeMillis() - startTime;

            if (!completed) {
                log.warn("Execution timed out after {}ms — stopping container {}", maxTimeMs, containerId);
                result.timedOut = true;
                try {
                    dockerClient.stopContainerCmd(containerId).withTimeout(2).exec();
                } catch (Exception ignored) { /* best-effort */ }
            }

            // Inspect exit code + OOM flag
            try {
                var state = dockerClient.inspectContainerCmd(containerId).exec().getState();
                if (state != null) {
                    if (state.getExitCode() != null) result.exitCode = state.getExitCode();
                    if (Boolean.TRUE.equals(state.getOOMKilled())) result.oomKilled = true;
                }
            } catch (Exception e) {
                log.error("Failed to inspect container state for {}", containerId, e);
            }

            // Read stdout / stderr logs
            List<String> stdoutLines = new ArrayList<>();
            List<String> stderrLines = new ArrayList<>();
            try {
                LogContainerResultCallback logCallback = new LogContainerResultCallback() {
                    @Override
                    public void onNext(Frame frame) {
                        String payload = new String(frame.getPayload(), StandardCharsets.UTF_8);
                        switch (frame.getStreamType()) {
                            case STDOUT -> stdoutLines.add(payload);
                            case STDERR -> stderrLines.add(payload);
                            default -> { /* RAW / other — ignore */ }
                        }
                    }
                };
                dockerClient.logContainerCmd(containerId)
                        .withStdOut(true)
                        .withStdErr(true)
                        .withFollowStream(false)  // container already stopped
                        .exec(logCallback)
                        .awaitCompletion(10, TimeUnit.SECONDS);
            } catch (Exception e) {
                log.error("Failed to read logs from container {}", containerId, e);
            }

            result.stdout = String.join("", stdoutLines);
            result.stderr = String.join("", stderrLines);

        } catch (Exception e) {
            log.error("Unexpected sandbox error for run {}", runId, e);
            result.stderr = "System error: " + e.getMessage();
        } finally {
            // Always remove the container
            if (containerId != null) {
                try {
                    dockerClient.removeContainerCmd(containerId).withForce(true).exec();
                    log.debug("Removed sandbox container {}", containerId);
                } catch (Exception e) {
                    log.warn("Failed to remove sandbox container {}", containerId, e);
                }
            }
            // Always clean up workspace
            cleanupDirectory(workspacePath);
        }

        return result;
    }

    // ── Helpers ─────────────────────────────────────────────────────────────────

    /**
     * Returns the shell command to compile/run code for the given language.
     * The workspace is always mounted at /app inside the sandbox container.
     */
    private String[] buildCommand(String language) {
        return switch (language.toLowerCase()) {
            case "python", "python3" ->
                    new String[]{"sh", "-c", "python3 /app/code.py < /app/input.txt"};
            case "javascript", "node" ->
                    new String[]{"sh", "-c", "node /app/code.js < /app/input.txt"};
            case "java" ->
                    new String[]{"sh", "-c", "javac /app/Main.java && java -cp /app Main < /app/input.txt"};
            case "cpp", "c++" ->
                    new String[]{"sh", "-c", "g++ -O2 /app/code.cpp -o /tmp/program && /tmp/program < /app/input.txt"};
            default ->
                    new String[]{"sh", "-c", "echo 'Unsupported language: " + language + "'; exit 1"};
        };
    }

    /**
     * Resolves the host-visible bind-mount source path for the sandbox run workspace.
     * When {@code hostTempDir} is configured (DinD/Docker Compose deployment),
     * the host path is used so the Docker daemon can see the files.
     * Otherwise, the in-process path is used directly (native local dev).
     */
    private String resolveHostBindPath(String runId) {
        String hostTempDir = props.getHostTempDir();
        if (hostTempDir != null && !hostTempDir.isBlank()) {
            return Paths.get(hostTempDir, "run_" + runId).toString().replace("\\", "/");
        }
        return Paths.get(props.getSandboxTempDir(), "run_" + runId).toAbsolutePath().toString();
    }

    private void ensureImageExists(String dockerImage) throws InterruptedException {
        try {
            dockerClient.inspectImageCmd(dockerImage).exec();
            log.debug("Image {} already present locally", dockerImage);
        } catch (com.github.dockerjava.api.exception.NotFoundException e) {
            log.info("Image {} not cached — pulling (this may take a moment)...", dockerImage);
            dockerClient.pullImageCmd(dockerImage)
                    .exec(new PullImageResultCallback())
                    .awaitCompletion(5, TimeUnit.MINUTES);
            log.info("Image {} pulled successfully", dockerImage);
        }
    }

    private void cleanupDirectory(Path dir) {
        try {
            if (Files.exists(dir)) {
                try (var stream = Files.walk(dir)) {
                    stream.sorted(java.util.Comparator.reverseOrder())
                          .forEach(p -> {
                              try { Files.delete(p); }
                              catch (IOException ex) {
                                  log.warn("Failed to delete sandbox path: {}", p, ex);
                              }
                          });
                }
            }
        } catch (IOException e) {
            log.warn("Failed to clean up sandbox workspace: {}", dir, e);
        }
    }
}
