package com.devopssuite.monolith.execution.repository;

import com.devopssuite.monolith.execution.model.ExecutionResult;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.Optional;
import java.util.UUID;

public interface ExecutionResultRepository extends JpaRepository<ExecutionResult, UUID> {
    Optional<ExecutionResult> findByRequestId(UUID requestId);
}
