package com.devopssuite.execution.repository;

import com.devopssuite.execution.model.ExecutionRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.time.Instant;
import java.util.List;
import java.util.UUID;

public interface ExecutionRequestRepository extends JpaRepository<ExecutionRequest, UUID> {
    List<ExecutionRequest> findByStatus(String status);

    // Count a user's executions submitted after a given point in time (used for "this week" stat)
    long countByUserIdAndCreatedAtAfter(UUID userId, Instant after);

    // Last N executions for a user — used for the recent executions panel
    List<ExecutionRequest> findByUserIdOrderByCreatedAtDesc(UUID userId, Pageable pageable);

    /**
     * Returns daily execution counts for a user over a date range.
     * Each row is Object[]{ java.sql.Date day, Long count }.
     * Only days with at least one execution are returned (sparse); the caller
     * is responsible for filling in zero-count days.
     */
    @Query(value = """
        SELECT DATE(created_at AT TIME ZONE 'UTC') AS day, COUNT(*) AS cnt
        FROM execution_requests
        WHERE user_id = :userId
          AND created_at >= :from
        GROUP BY day
        ORDER BY day
        """, nativeQuery = true)
    List<Object[]> countByUserIdGroupedByDay(
            @Param("userId") UUID userId,
            @Param("from")   Instant from);
}
