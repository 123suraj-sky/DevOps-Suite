package com.devopssuite.execution.repository;

import com.devopssuite.execution.model.ExecutionRequest;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;
import java.util.UUID;

public interface ExecutionRequestRepository extends JpaRepository<ExecutionRequest, UUID> {
    List<ExecutionRequest> findByStatus(String status);
}
