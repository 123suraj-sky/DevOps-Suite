package com.devopssuite.execution.sandbox;

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

import java.io.File;
import java.io.FileWriter;
import java.io.IOException;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;
import java.util.concurrent.TimeUnit;

@Component
@RequiredArgsConstructor
@Slf4j
public class DockerSandbox {

    private final DockerClient dockerClient;

    public static class SandboxResult {
        public String stdout = "";
        public String stderr = "";
        public int exitCode = -1;
        public boolean timedOut = false;
        public boolean oomKilled = false;
        public long executionTimeMs = 0;
    }

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

        // Create a unique temporary directory inside the workspace directory
        Path workspaceTempDir = Paths.get("backend", "code-execution-service", "temp", "run_" + runId).toAbsolutePath();
        try {
            Files.createDirectories(workspaceTempDir);
        } catch (IOException e) {
            log.error("Failed to create sandbox temp directory", e);
            result.stderr = "System error: Failed to initialize execution sandbox environment.";
            return result;
        }

        // Write the source code to a file
        File codeFile = new File(workspaceTempDir.toFile(), "code." + fileExtension);
        try (FileWriter writer = new FileWriter(codeFile, StandardCharsets.UTF_8)) {
            writer.write(sourceCode);
        } catch (IOException e) {
            log.error("Failed to write source code to file", e);
            result.stderr = "System error: Failed to save source code.";
            cleanupDirectory(workspaceTempDir.toFile());
            return result;
        }

        // Ensure the Docker image is available
        try {
            ensureImageExists(dockerImage);
        } catch (Exception e) {
            log.error("Failed to ensure image exists: {}", dockerImage, e);
            result.stderr = "System error: Failed to download sandbox runtime environment.";
            cleanupDirectory(workspaceTempDir.toFile());
            return result;
        }

        String containerId = null;
        try {
            // Determine execute command based on language
            String[] cmd;
            if (language.equalsIgnoreCase("python")) {
                cmd = new String[]{"python3", "/app/code.py"};
            } else if (language.equalsIgnoreCase("javascript")) {
                cmd = new String[]{"node", "/app/code.js"};
            } else {
                cmd = new String[]{"sh", "-c", "echo 'Unsupported language'"};
            }

            // Create HostConfig with limits: 1 CPU core, maxMemoryMb, disabled network
            long memoryBytes = (long) maxMemoryMb * 1024 * 1024;
            HostConfig hostConfig = HostConfig.newHostConfig()
                    .withMemory(memoryBytes)
                    .withMemorySwap(memoryBytes)
                    .withNanoCPUs(1000000000L) // 1 CPU Core
                    .withNetworkMode("none")   // Disable internet
                    .withBinds(new Bind(workspaceTempDir.toString(), new Volume("/app")));

            CreateContainerResponse container = dockerClient.createContainerCmd(dockerImage)
                    .withHostConfig(hostConfig)
                    .withWorkingDir("/app")
                    .withCmd(cmd)
                    .exec();

            containerId = container.getId();
            long startTime = System.currentTimeMillis();

            // Start container
            dockerClient.startContainerCmd(containerId).exec();

            // Wait for execution completion or timeout
            boolean completed = false;
            long timeoutSec = (long) Math.ceil(maxTimeMs / 1000.0);
            if (timeoutSec <= 0) timeoutSec = 5;

            try {
                // Wait for the container to stop
                com.github.dockerjava.api.command.WaitContainerResultCallback waitCallback = 
                        dockerClient.waitContainerCmd(containerId).start();
                
                completed = waitCallback.awaitCompletion(timeoutSec, TimeUnit.SECONDS);
            } catch (InterruptedException e) {
                log.warn("Container execution interrupted", e);
            }

            result.executionTimeMs = System.currentTimeMillis() - startTime;

            if (!completed) {
                log.warn("Execution timed out. Killing container {}", containerId);
                result.timedOut = true;
                try {
                    dockerClient.stopContainerCmd(containerId).withTimeout(1).exec();
                } catch (Exception ignored) {}
            }

            // Inspect container to get exit code & check if OOM killed
            try {
                var inspect = dockerClient.inspectContainerCmd(containerId).exec();
                var state = inspect.getState();
                if (state != null) {
                    if (state.getExitCode() != null) {
                        result.exitCode = state.getExitCode();
                    }
                    if (state.getOOMKilled() != null) {
                        result.oomKilled = state.getOOMKilled();
                    }
                }
            } catch (Exception e) {
                log.error("Failed to inspect container status", e);
            }

            // Capture output logs (stdout/stderr)
            List<String> stdoutLines = new ArrayList<>();
            List<String> stderrLines = new ArrayList<>();

            try {
                LogContainerResultCallback logCallback = new LogContainerResultCallback() {
                    @Override
                    public void onNext(Frame frame) {
                        String payload = new String(frame.getPayload(), StandardCharsets.UTF_8);
                        if (frame.getStreamType() == com.github.dockerjava.api.model.StreamType.STDOUT) {
                            stdoutLines.add(payload);
                        } else if (frame.getStreamType() == com.github.dockerjava.api.model.StreamType.STDERR) {
                            stderrLines.add(payload);
                        }
                    }
                };

                dockerClient.logContainerCmd(containerId)
                        .withStdOut(true)
                        .withStdErr(true)
                        .withFollowStream(true)
                        .exec(logCallback)
                        .awaitCompletion(5, TimeUnit.SECONDS);

            } catch (Exception e) {
                log.error("Failed to read logs from container", e);
            }

            result.stdout = String.join("", stdoutLines);
            result.stderr = String.join("", stderrLines);

        } finally {
            // Delete container
            if (containerId != null) {
                try {
                    dockerClient.removeContainerCmd(containerId).withForce(true).exec();
                } catch (Exception e) {
                    log.warn("Failed to remove container: {}", containerId, e);
                }
            }
            // Cleanup directories
            cleanupDirectory(workspaceTempDir.toFile());
        }

        return result;
    }

    private void ensureImageExists(String dockerImage) throws InterruptedException {
        try {
            dockerClient.inspectImageCmd(dockerImage).exec();
        } catch (com.github.dockerjava.api.exception.NotFoundException e) {
            log.info("Image {} not found locally, pulling...", dockerImage);
            dockerClient.pullImageCmd(dockerImage)
                    .exec(new PullImageResultCallback())
                    .awaitCompletion(2, TimeUnit.MINUTES);
        }
    }

    private void cleanupDirectory(File dir) {
        if (dir.isDirectory()) {
            File[] files = dir.listFiles();
            if (files != null) {
                for (File f : files) {
                    cleanupDirectory(f);
                }
            }
        }
        if (!dir.delete()) {
            log.warn("Failed to delete temp sandbox file/folder: {}", dir.getAbsolutePath());
        }
    }
}
