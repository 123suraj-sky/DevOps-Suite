package com.devopssuite.project.repository;

import com.devopssuite.project.model.Task;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.Collection;
import java.util.List;
import java.util.UUID;

@Repository
public interface TaskRepository extends JpaRepository<Task, UUID> {
    List<Task> findByColumnIdOrderBySortOrderAsc(UUID columnId);
    List<Task> findByAssigneeId(UUID assigneeId);

    @Query("select count(t) from Task t join Column c on t.columnId = c.id join Board b on c.boardId = b.id where b.projectId = :projectId and t.status in :statuses")
    long countByProjectIdAndStatusIn(@Param("projectId") UUID projectId, @Param("statuses") Collection<String> statuses);

    @Query("select count(t) from Task t join Column c on t.columnId = c.id join Board b on c.boardId = b.id where b.projectId in :projectIds and t.status in :statuses")
    long countByProjectIdsAndStatusIn(@Param("projectIds") Collection<UUID> projectIds, @Param("statuses") Collection<String> statuses);

    // User-scoped task counts for the personal dashboard summary
    @Query("select count(t) from Task t join Column c on t.columnId = c.id join Board b on c.boardId = b.id join ProjectMember pm on pm.projectId = b.projectId where pm.userId = :userId and t.status in :statuses")
    long countByAssigneeProjectMembershipAndStatusIn(@Param("userId") UUID userId, @Param("statuses") Collection<String> statuses);

    // Last N tasks assigned to a user, ordered most-recent first — used for activity feed
    @Query("select t from Task t where t.assigneeId = :userId order by t.updatedAt desc")
    List<Task> findRecentByAssigneeId(@Param("userId") UUID userId, org.springframework.data.domain.Pageable pageable);
}
