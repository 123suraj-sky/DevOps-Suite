package com.devopssuite.project.repository;

import com.devopssuite.project.model.TaskAuditHistory;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.UUID;

@Repository
public interface TaskAuditHistoryRepository extends JpaRepository<TaskAuditHistory, UUID> {

    /** Returns the full audit trail for a task, newest first. */
    List<TaskAuditHistory> findByTaskIdOrderByChangedAtDesc(UUID taskId);
}
