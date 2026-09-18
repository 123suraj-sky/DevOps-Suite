package com.devopssuite.auth.repository;

import com.devopssuite.auth.model.PasswordResetToken;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.Optional;
import java.util.UUID;

@Repository
public interface PasswordResetTokenRepository extends JpaRepository<PasswordResetToken, UUID> {

    Optional<PasswordResetToken> findByToken(String token);

    /**
     * Delete all tokens for a user using a direct DELETE query.
     * Using @Modifying + explicit JPQL avoids the derived-delete fetch-then-delete
     * pattern, which causes Hibernate to re-delete the newly saved token when it
     * flushes the persistence context within the same transaction.
     */
    @Modifying
    @Query("DELETE FROM PasswordResetToken t WHERE t.userId = :userId")
    void deleteByUserId(@Param("userId") UUID userId);
}
