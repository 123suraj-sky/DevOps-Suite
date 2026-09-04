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
 * <h3>Two execution modes</h3>
 * <ol>
 *   <li><b>Classic mode</b> — {@link #runCode}: single inline source string, written
 *       as {@code code.<ext>} (or {@code Main.java}) into the workspace.</li>
 *   <li><b>IDE mode</b> — {@link #runProject}: a list of {@link FileEntry} objects
 *       (path → content) written verbatim into the workspace, preserving directory
 *       structure. A specific entry-point file is designated for execution.</li>
 * </ol>
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

    // ── Result carrier ───────────────────────────────────────────────────────────

    public static class SandboxResult {
        public String stdout = "";
        public String stderr = "";
        public int exitCode = -1;
        public boolean timedOut = false;
        public boolean oomKilled = false;
        public long executionTimeMs = 0;
    }

    /**
     * A single file to be written into the sandbox workspace.
     *
     * @param path    Relative path from workspace root, e.g. {@code "src/utils.py"}.
     *                Directory separators must use {@code /}.
     * @param content File content as a string.
     */
    public record FileEntry(String path, String content) {}

    // ── Public API ───────────────────────────────────────────────────────────────

    /**
     * Classic mode: runs a single inline source code string.
     * Writes the code as the canonical filename for the language
     * ({@code Main.java} for Java, {@code code.<ext>} for others).
     */
    public SandboxResult runCode(
            String language,
            String dockerImage,
            String fileExtension,
            String sourceCode,
            String stdin,
            int maxTimeMs,
            int maxMemoryMb) {

        String fileName = language.equalsIgnoreCase("java") ? "Main.java" : "code." + fileExtension;
        List<FileEntry> entries = List.of(new FileEntry(fileName, sourceCode));
        return runProject(language, dockerImage, fileName, entries, stdin, maxTimeMs, maxMemoryMb);
    }

    /**
     * IDE mode: writes all {@code files} into the workspace, then runs the
     * entry point file identified by {@code entryPointPath}.
     *
     * <p>The entry point path must exactly match one of the paths in {@code files}.
     * Directory structure is preserved (sub-directories are created as needed).
     */
    public SandboxResult runProject(
            String language,
            String dockerImage,
            String entryPointPath,
            List<FileEntry> files,
            String stdin,
            int maxTimeMs,
            int maxMemoryMb) {

        SandboxResult result = new SandboxResult();
        String runId = UUID.randomUUID().toString();

        // Resolve in-process workspace path
        Path workspacePath = Paths.get(props.getSandboxTempDir(), "run_" + runId);
        try {
            Files.createDirectories(workspacePath);
        } catch (IOException e) {
            log.error("Failed to create sandbox temp directory: {}", workspacePath, e);
            result.stderr = "System error: Failed to initialize execution sandbox environment.";
            return result;
        }

        // Write all project files, creating sub-directories as needed
        for (FileEntry entry : files) {
            // Sanitise: strip leading slashes to prevent absolute path injection
            String safePath = entry.path().replaceAll("^/+", "");
            Path target = workspacePath.resolve(safePath).normalize();

            // Ensure the resolved path is still inside the workspace (path traversal guard)
            if (!target.startsWith(workspacePath)) {
                log.warn("Path traversal attempt blocked: '{}'", entry.path());
                result.stderr = "System error: Invalid file path detected.";
                cleanupDirectory(workspacePath);
                return result;
            }

            try {
                Files.createDirectories(target.getParent());
                Files.writeString(target, entry.content(), StandardCharsets.UTF_8);
            } catch (IOException e) {
                log.error("Failed to write file '{}' to sandbox workspace", entry.path(), e);
                result.stderr = "System error: Failed to write file '" + entry.path() + "'.";
                cleanupDirectory(workspacePath);
                return result;
            }
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
            String[] cmd = buildCommand(language, entryPointPath);

            String bindSource = resolveHostBindPath(runId);
            log.debug("Sandbox bind: {} -> /app (language={}, entry={})",
                    bindSource, language, entryPointPath);

            long memoryBytes = (long) maxMemoryMb * 1024L * 1024L;
            HostConfig hostConfig = HostConfig.newHostConfig()
                    .withMemory(memoryBytes)
                    .withMemorySwap(memoryBytes)
                    .withNanoCPUs(1_000_000_000L)
                    .withNetworkMode("none")
                    .withReadonlyRootfs(true)
                    .withTmpFs(java.util.Map.of(
                            "/tmp", "rw,exec,nosuid,size=64m"
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

            try {
                var state = dockerClient.inspectContainerCmd(containerId).exec().getState();
                if (state != null) {
                    if (state.getExitCode() != null) result.exitCode = state.getExitCode();
                    if (Boolean.TRUE.equals(state.getOOMKilled())) result.oomKilled = true;
                }
            } catch (Exception e) {
                log.error("Failed to inspect container state for {}", containerId, e);
            }

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
                        .withFollowStream(false)
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
            if (containerId != null) {
                try {
                    dockerClient.removeContainerCmd(containerId).withForce(true).exec();
                    log.debug("Removed sandbox container {}", containerId);
                } catch (Exception e) {
                    log.warn("Failed to remove sandbox container {}", containerId, e);
                }
            }
            cleanupDirectory(workspacePath);
        }

        return result;
    }

    // ── Helpers ──────────────────────────────────────────────────────────────────

    /**
     * Builds the shell command to compile/run the entry point.
     *
     * <p>For Java we derive the class name from the file name (without extension).
     * For other languages we use the entry-point path directly.
     * All paths are rooted at {@code /app} inside the container.
     */
    private String[] buildCommand(String language, String entryPointPath) {
        // Always use forward slashes and strip any leading slash
        String ep = entryPointPath.replace("\\", "/").replaceAll("^/+", "");
        String fullPath = "/app/" + ep;

        return switch (language.toLowerCase()) {
            case "python", "python3" ->
                    new String[]{"sh", "-c", "python3 " + fullPath + " < /app/input.txt"};
            case "javascript", "node" ->
                    new String[]{"sh", "-c", "node " + fullPath + " < /app/input.txt"};
            case "java" -> {
                // Derive class name from filename without extension
                String fileName = ep.contains("/") ? ep.substring(ep.lastIndexOf('/') + 1) : ep;
                String className = fileName.endsWith(".java")
                        ? fileName.substring(0, fileName.length() - 5)
                        : fileName;
                // Determine classpath root (parent dir of the file, or /app for root-level)
                String classPath = ep.contains("/")
                        ? "/app/" + ep.substring(0, ep.lastIndexOf('/'))
                        : "/app";
                yield new String[]{"sh", "-c",
                        "javac " + fullPath + " && java -cp " + classPath + " " + className + " < /app/input.txt"};
            }
            case "cpp", "c++" ->
                    new String[]{"sh", "-c",
                            "g++ -O2 " + fullPath + " -o /tmp/program && /tmp/program < /app/input.txt"};
            default ->
                    new String[]{"sh", "-c", "echo 'Unsupported language: " + language + "'; exit 1"};
        };
    }

    /**
     * Resolves the host-visible bind-mount source path for the sandbox run workspace.
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
