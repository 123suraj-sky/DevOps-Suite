package com.devopssuite.ide.repository;

import com.devopssuite.ide.model.IdeFile;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface IdeFileRepository extends JpaRepository<IdeFile, UUID> {

    /** All files and folders for a project, ordered for a predictable tree display. */
    List<IdeFile> findByProjectIdOrderByIsFolderDescPathAsc(UUID projectId);

    /** Lookup by project + path (used for duplicate-path checks). */
    Optional<IdeFile> findByProjectIdAndPath(UUID projectId, String path);

    /** Check existence without loading the entity. */
    boolean existsByProjectIdAndPath(UUID projectId, String path);

    /**
     * Delete every entry whose path starts with a given prefix —
     * used when a folder is deleted (cascades to all children).
     */
    @Modifying
    @Query("DELETE FROM IdeFile f WHERE f.projectId = :projectId AND f.path LIKE :prefix%")
    void deleteByProjectIdAndPathStartingWith(
            @Param("projectId") UUID projectId,
            @Param("prefix") String prefix);

    /** All entries owned directly by a specific user (admin utility). */
    List<IdeFile> findByUserId(UUID userId);
}
