package com.devopssuite.project.repository;

import com.devopssuite.project.model.Task;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.UUID;

@Repository
public interface TaskRepository extends JpaRepository<Task, UUID> {
    List<Task> findByColumnIdOrderBySortOrderAsc(UUID columnId);
    List<Task> findByAssigneeId(UUID assigneeId);
}
