package com.devopssuite.auth.model;

import lombok.*;

import java.io.Serializable;
import java.util.UUID;

/**
 * Composite primary key class for {@link UserFollow}.
 */
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@EqualsAndHashCode
public class UserFollowId implements Serializable {
    private UUID followerId;
    private UUID followingId;
}
