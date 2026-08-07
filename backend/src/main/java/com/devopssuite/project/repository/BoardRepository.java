package com.devopssuite.project.repository;

import com.devopssuite.project.model.Board;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.UUID;

@Repository
public interface BoardRepository extends JpaRepository<Board, UUID> {
    List<Board> findByProjectIdOrderBySortOrderAsc(UUID projectId);
}
