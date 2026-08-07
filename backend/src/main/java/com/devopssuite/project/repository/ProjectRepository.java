package com.devopssuite.project.repository;

import com.devopssuite.project.model.Project;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Set;
import java.util.UUID;

@Repository
public interface ProjectRepository extends JpaRepository<Project, UUID> {
    List<Project> findByOwnerId(UUID ownerId);

    @Query("select distinct p from Project p left join ProjectMember m on m.projectId = p.id " +
            "where p.ownerId = :userId or m.userId = :userId")
    List<Project> findVisibleToUser(@Param("userId") UUID userId);

    List<Project> findByIdIn(Set<UUID> ids);
}
