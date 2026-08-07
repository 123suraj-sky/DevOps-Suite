package com.devopssuite.execution.model;

import jakarta.persistence.*;
import lombok.*;
import java.time.Instant;
import java.util.UUID;

@Entity
@Table(name = "languages")
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class Language {

    @Id
    @GeneratedValue(strategy = GenerationType.AUTO)
    private UUID id;

    @Column(nullable = false, unique = true)
    private String name;

    @Column(nullable = false)
    private String version;

    @Column(name = "docker_image", nullable = false)
    private String dockerImage;

    @Column(name = "file_extension", nullable = false)
    private String fileExtension;

    @Column(name = "max_execution_time_ms", nullable = false)
    private int maxExecutionTimeMs;

    @Column(name = "max_memory_mb", nullable = false)
    private int maxMemoryMb;

    @Column(nullable = false)
    private boolean enabled;

    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt;

    @PrePersist
    protected void onCreate() {
        createdAt = Instant.now();
    }
}
