package com.devopssuite.execution.config;

import lombok.Getter;
import lombok.Setter;
import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.context.annotation.Configuration;

/**
 * Strongly-typed configuration for the code execution sandbox.
 * Mapped from the {@code docker.*} properties in application.yml.
 */
@Configuration
@ConfigurationProperties(prefix = "docker")
@Getter
@Setter
public class ExecutionProperties {

    /** Number of concurrent sandbox worker threads. */
    private int poolSize = 10;

    /**
     * In-container path where source files are written before being
     * bind-mounted into sandbox containers.
     * Defaults to /tmp/devopssuite-sandbox.
     */
    private String sandboxTempDir = "/tmp/devopssuite-sandbox";

    /**
     * Absolute host-side path that the Docker daemon can resolve for
     * bind-mounting sandbox workspaces into sibling containers.
     * Must be set when the backend itself runs inside Docker (DinD pattern).
     * Leave blank for local development (native Java run).
     */
    private String hostTempDir = "";

    /**
     * Global upper-bound on execution time in milliseconds (300 s).
     * Clamps any per-request max_time_ms that exceeds this ceiling.
     */
    private int timeout = 300000;

    /** Maximum source code size in bytes accepted by the API (64 KB). */
    private int maxCodeSizeBytes = 65536;

    /** Maximum stdin size in bytes accepted by the API (16 KB). */
    private int maxStdinSizeBytes = 16384;
}
