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

    @org.springframework.data.jpa.repository.Query("select count(t) from Task t join Column c on t.columnId = c.id join Board b on c.boardId = b.id where b.projectId = :projectId and t.status in :statuses")
    long countByProjectIdAndStatusIn(@org.springframework.data.repository.query.Param("projectId") UUID projectId, @org.springframework.data.repository.query.Param("statuses") java.util.Collection<String> statuses);

    @org.springframework.data.jpa.repository.Query("select count(t) from Task t join Column c on t.columnId = c.id join Board b on c.boardId = b.id where b.projectId in :projectIds and t.status in :statuses")
    long countByProjectIdsAndStatusIn(@org.springframework.data.repository.query.Param("projectIds") java.util.Collection<UUID> projectIds, @org.springframework.data.repository.query.Param("statuses") java.util.Collection<String> statuses);
}
