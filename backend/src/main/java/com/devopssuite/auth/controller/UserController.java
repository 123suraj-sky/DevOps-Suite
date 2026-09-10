package com.devopssuite.auth.controller;

import com.devopssuite.auth.dto.AuthDto.*;
import com.devopssuite.auth.model.User;
import com.devopssuite.auth.model.UserFollow;
import com.devopssuite.auth.repository.UserFollowRepository;
import com.devopssuite.auth.repository.UserRepository;
import com.devopssuite.config.RedisCacheService;
import com.fasterxml.jackson.core.type.TypeReference;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.authentication.AuthenticationCredentialsNotFoundException;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.UUID;
import java.util.stream.Collectors;

/**
 * Public user profile endpoints.
 *
 * All routes are under /api/users and require a valid JWT.
 *
 * GET  /api/users/{id}           — fetch public profile (increments view count for non-self views)
 * POST /api/users/{id}/follow    — follow a user
 * DELETE /api/users/{id}/follow  — unfollow a user
 * GET  /api/users/{id}/followers — list of users who follow {id}
 * GET  /api/users/{id}/following — list of users {id} follows
 */
@RestController
@RequestMapping("/api/users")
@RequiredArgsConstructor
public class UserController {

    private final UserRepository userRepository;
    private final UserFollowRepository followRepository;
    private final RedisCacheService cacheService;

    // ── GET /api/users/{id} ───────────────────────────────────────────────────

    /**
     * Returns the public profile for any user.
     * - Increments profile_view_count for non-self visits.
     * - Populates isFollowing relative to the requesting user.
     */
    @GetMapping("/{id}")
    @Transactional
    public ResponseEntity<ApiResponse<UserResponse>> getProfile(@PathVariable("id") UUID targetId) {
        UUID requesterId = getCurrentUserId();
        boolean isSelf = requesterId.equals(targetId);

        // Non-self visits increment the view count — must bypass cache and evict after
        if (!isSelf) {
            User target = userRepository.findById(targetId).orElse(null);
            if (target == null) {
                return ResponseEntity.status(HttpStatus.NOT_FOUND)
                        .body(ApiResponse.<UserResponse>builder()
                                .status("error")
                                .message("User not found")
                                .build());
            }
            userRepository.incrementProfileViewCount(targetId);
            target = userRepository.findById(targetId).orElse(target);
            // Evict stale cache entry so the updated view count is visible next time
            cacheService.evict(RedisCacheService.userKey(targetId.toString()));

            long followersCount = followRepository.countByFollowingId(targetId);
            long followingCount = followRepository.countByFollowerId(targetId);
            Boolean isFollowing = followRepository.existsByFollowerIdAndFollowingId(requesterId, targetId);
            UserResponse response = buildResponse(target, followersCount, followingCount, isFollowing);
            return ResponseEntity.ok(ApiResponse.<UserResponse>builder()
                    .message("Profile retrieved")
                    .data(response)
                    .build());
        }

        // Self-view: serve from cache (follow counts rarely change for self-view)
        String cacheKey = RedisCacheService.userKey(targetId.toString());
        UserResponse response = cacheService.getOrLoad(
                cacheKey,
                "user",
                RedisCacheService.USER_TTL_MINUTES,
                new TypeReference<UserResponse>() {},
                () -> {
                    User target = userRepository.findById(targetId).orElse(null);
                    if (target == null) return null;
                    long fc = followRepository.countByFollowingId(targetId);
                    long fg = followRepository.countByFollowerId(targetId);
                    return buildResponse(target, fc, fg, null);
                }
        );

        if (response == null) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND)
                    .body(ApiResponse.<UserResponse>builder()
                            .status("error")
                            .message("User not found")
                            .build());
        }

        return ResponseEntity.ok(ApiResponse.<UserResponse>builder()
                .message("Profile retrieved")
                .data(response)
                .build());
    }

    // ── POST /api/users/{id}/follow ───────────────────────────────────────────

    /**
     * Follow the user identified by {id}.
     * Returns 409 if already following, 400 if trying to follow yourself.
     */
    @PostMapping("/{id}/follow")
    @Transactional
    public ResponseEntity<ApiResponse<Void>> follow(@PathVariable("id") UUID targetId) {
        UUID followerId = getCurrentUserId();

        if (followerId.equals(targetId)) {
            return ResponseEntity.badRequest()
                    .body(ApiResponse.<Void>builder()
                            .status("error")
                            .message("You cannot follow yourself")
                            .build());
        }

        if (!userRepository.existsById(targetId)) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND)
                    .body(ApiResponse.<Void>builder()
                            .status("error")
                            .message("User not found")
                            .build());
        }

        if (followRepository.existsByFollowerIdAndFollowingId(followerId, targetId)) {
            return ResponseEntity.status(HttpStatus.CONFLICT)
                    .body(ApiResponse.<Void>builder()
                            .status("error")
                            .message("Already following this user")
                            .build());
        }

        followRepository.save(UserFollow.builder()
                .followerId(followerId)
                .followingId(targetId)
                .build());

        // Evict cached profiles for both parties — follow counts changed
        cacheService.evict(RedisCacheService.userKey(followerId.toString()));
        cacheService.evict(RedisCacheService.userKey(targetId.toString()));

        return ResponseEntity.ok(ApiResponse.<Void>builder()
                .message("Successfully followed user")
                .build());
    }

    // ── DELETE /api/users/{id}/follow ─────────────────────────────────────────

    /**
     * Unfollow the user identified by {id}.
     * Returns 404 if not currently following.
     */
    @DeleteMapping("/{id}/follow")
    @Transactional
    public ResponseEntity<ApiResponse<Void>> unfollow(@PathVariable("id") UUID targetId) {
        UUID followerId = getCurrentUserId();

        if (!followRepository.existsByFollowerIdAndFollowingId(followerId, targetId)) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND)
                    .body(ApiResponse.<Void>builder()
                            .status("error")
                            .message("You are not following this user")
                            .build());
        }

        followRepository.deleteByFollowerIdAndFollowingId(followerId, targetId);

        // Evict cached profiles for both parties — follow counts changed
        cacheService.evict(RedisCacheService.userKey(followerId.toString()));
        cacheService.evict(RedisCacheService.userKey(targetId.toString()));

        return ResponseEntity.ok(ApiResponse.<Void>builder()
                .message("Successfully unfollowed user")
                .build());
    }

    // ── GET /api/users/{id}/followers ─────────────────────────────────────────

    /**
     * Returns the list of users who follow {id}.
     */
    @GetMapping("/{id}/followers")
    @Transactional(readOnly = true)
    public ResponseEntity<ApiResponse<List<UserResponse>>> getFollowers(
            @PathVariable("id") UUID targetId) {

        UUID requesterId = getCurrentUserId();

        List<UUID> followerIds = followRepository.findFollowerIdsByFollowingId(targetId);
        List<UserResponse> followers = userRepository.findAllById(followerIds).stream()
                .map(u -> {
                    long fc  = followRepository.countByFollowingId(u.getId());
                    long fg  = followRepository.countByFollowerId(u.getId());
                    Boolean isFollowing = u.getId().equals(requesterId)
                            ? null
                            : followRepository.existsByFollowerIdAndFollowingId(requesterId, u.getId());
                    return buildResponse(u, fc, fg, isFollowing);
                })
                .collect(Collectors.toList());

        return ResponseEntity.ok(ApiResponse.<List<UserResponse>>builder()
                .message("Followers retrieved")
                .data(followers)
                .build());
    }

    // ── GET /api/users/{id}/following ─────────────────────────────────────────

    /**
     * Returns the list of users that {id} follows.
     */
    @GetMapping("/{id}/following")
    @Transactional(readOnly = true)
    public ResponseEntity<ApiResponse<List<UserResponse>>> getFollowing(
            @PathVariable("id") UUID targetId) {

        UUID requesterId = getCurrentUserId();

        List<UUID> followingIds = followRepository.findFollowingIdsByFollowerId(targetId);
        List<UserResponse> following = userRepository.findAllById(followingIds).stream()
                .map(u -> {
                    long fc  = followRepository.countByFollowingId(u.getId());
                    long fg  = followRepository.countByFollowerId(u.getId());
                    Boolean isFollowing = u.getId().equals(requesterId)
                            ? null
                            : followRepository.existsByFollowerIdAndFollowingId(requesterId, u.getId());
                    return buildResponse(u, fc, fg, isFollowing);
                })
                .collect(Collectors.toList());

        return ResponseEntity.ok(ApiResponse.<List<UserResponse>>builder()
                .message("Following retrieved")
                .data(following)
                .build());
    }

    // ── Helpers ───────────────────────────────────────────────────────────────

    private UserResponse buildResponse(User user, long followersCount, long followingCount,
                                       Boolean isFollowing) {
        return UserResponse.builder()
                .userId(user.getId())
                .id(user.getId())
                .email(user.getEmail())
                .displayName(user.getDisplayName())
                .avatarUrl(user.getAvatarUrl())
                .gender(user.getGender())
                .roles(user.getRoles().stream()
                        .map(com.devopssuite.auth.model.Role::getName)
                        .collect(Collectors.toList()))
                .createdAt(user.getCreatedAt())
                .lastLoginAt(user.getLastLoginAt())
                .followersCount(followersCount)
                .followingCount(followingCount)
                .isFollowing(isFollowing)
                .profileViewCount(user.getProfileViewCount())
                .build();
    }

    private UUID getCurrentUserId() {
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        if (auth == null || !auth.isAuthenticated()) {
            throw new AuthenticationCredentialsNotFoundException("Authentication required");
        }
        return UUID.fromString((String) auth.getPrincipal());
    }
}
