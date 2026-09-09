package com.devopssuite.auth.repository;

import com.devopssuite.auth.model.UserFollow;
import com.devopssuite.auth.model.UserFollowId;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.UUID;

@Repository
public interface UserFollowRepository extends JpaRepository<UserFollow, UserFollowId> {

    /** Check if follower already follows target. */
    boolean existsByFollowerIdAndFollowingId(UUID followerId, UUID followingId);

    /** Delete a follow relationship. */
    void deleteByFollowerIdAndFollowingId(UUID followerId, UUID followingId);

    /** How many people follow the given user. */
    long countByFollowingId(UUID followingId);

    /** How many people the given user follows. */
    long countByFollowerId(UUID followerId);

    /** IDs of users that follow the given user (for listing followers). */
    @Query("SELECT f.followerId FROM UserFollow f WHERE f.followingId = :userId")
    List<UUID> findFollowerIdsByFollowingId(@Param("userId") UUID userId);

    /** IDs of users the given user follows (for listing following). */
    @Query("SELECT f.followingId FROM UserFollow f WHERE f.followerId = :userId")
    List<UUID> findFollowingIdsByFollowerId(@Param("userId") UUID userId);
}
