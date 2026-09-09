package com.devopssuite.auth.model;

import jakarta.persistence.*;
import lombok.*;

import java.time.Instant;
import java.util.UUID;

/**
 * Maps the user_follows join table.
 * PK is a composite of (follower_id, following_id).
 */
@Entity
@Table(name = "user_follows")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
@IdClass(UserFollowId.class)
public class UserFollow {

    @Id
    @Column(name = "follower_id", nullable = false)
    private UUID followerId;

    @Id
    @Column(name = "following_id", nullable = false)
    private UUID followingId;

    @Column(name = "followed_at", nullable = false)
    @Builder.Default
    private Instant followedAt = Instant.now();

    @PrePersist
    protected void onCreate() {
        if (followedAt == null) followedAt = Instant.now();
    }
}
