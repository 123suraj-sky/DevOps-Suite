package com.devopssuite.execution.repository;

import com.devopssuite.execution.model.ExecutionRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;

import java.time.Instant;
import java.util.List;
import java.util.UUID;

public interface ExecutionRequestRepository extends JpaRepository<ExecutionRequest, UUID> {
    List<ExecutionRequest> findByStatus(String status);

    // Count a user's executions submitted after a given point in time (used for "this week" stat)
    long countByUserIdAndCreatedAtAfter(UUID userId, Instant after);

    // Last N executions for a user — used for the recent executions panel
    List<ExecutionRequest> findByUserIdOrderByCreatedAtDesc(UUID userId, Pageable pageable);
}
