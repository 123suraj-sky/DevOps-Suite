package com.devopssuite.auth.repository;

import com.devopssuite.auth.model.User;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.Optional;
import java.util.UUID;

@Repository
public interface UserRepository extends JpaRepository<User, UUID> {
    Optional<User> findByEmail(String email);
    boolean existsByEmail(String email);

    /**
     * Atomically increments the profile_view_count for a user.
     * Called whenever another user fetches a public profile.
     */
    @Modifying
    @Query("UPDATE User u SET u.profileViewCount = u.profileViewCount + 1 WHERE u.id = :id")
    void incrementProfileViewCount(@Param("id") UUID id);
}
