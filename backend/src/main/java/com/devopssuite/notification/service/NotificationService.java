package com.devopssuite.notification.service;

import com.devopssuite.notification.dto.NotificationDto;
import com.devopssuite.notification.model.Notification;
import com.devopssuite.notification.model.NotificationPreference;
import com.devopssuite.notification.repository.NotificationRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.UUID;

@Service
@RequiredArgsConstructor
@Slf4j
public class NotificationService {

    private final NotificationRepository notificationRepository;
    private final SimpMessagingTemplate messagingTemplate;
    private final NotificationPreferenceService preferenceService;

    /**
     * Creates an in-app notification, persists it, and broadcasts it over WebSocket —
     * but only if the user's preference for this type has {@code inApp = true}.
     *
     * <p>Returns {@code null} if the preference suppresses the in-app channel.</p>
     */
    @Transactional
    public NotificationDto.NotificationResponse createNotification(
            UUID userId, String type, String title, String message,
            UUID projectId, UUID taskId) {

        NotificationPreference pref = preferenceService.getEffective(userId, type);

        if (!pref.isInApp()) {
            log.debug("In-app notification suppressed by preference: userId={} type={}", userId, type);
            return null;
        }

        Notification notification = Notification.builder()
                .userId(userId)
                .type(type)
                .title(title)
                .message(message)
                .projectId(projectId)
                .taskId(taskId)
                .build();

        notification = notificationRepository.save(notification);
        NotificationDto.NotificationResponse response = toResponse(notification);

        // Broadcast to the user's personal WebSocket topic
        try {
            messagingTemplate.convertAndSend("/topic/notifications/" + userId, response);
        } catch (Exception e) {
            log.warn("Failed to send WebSocket notification to user {}: {}", userId, e.getMessage());
        }

        return response;
    }

    /**
     * Returns {@code true} if the user's email preference for this type is enabled.
     * Used by {@link com.devopssuite.notification.event.NotificationEventListener}
     * to decide whether to call {@link EmailNotificationService}.
     */
    public boolean isEmailEnabled(UUID userId, String type) {
        return preferenceService.getEffective(userId, type).isEmail();
    }

    @Transactional(readOnly = true)
    public Page<NotificationDto.NotificationResponse> getNotifications(UUID userId, Pageable pageable) {
        return notificationRepository.findByUserIdOrderByCreatedAtDesc(userId, pageable)
                .map(this::toResponse);
    }

    @Transactional(readOnly = true)
    public long getUnreadCount(UUID userId) {
        return notificationRepository.countByUserIdAndRead(userId, false);
    }

    @Transactional
    public NotificationDto.NotificationResponse markAsRead(UUID notificationId, UUID userId) {
        Notification notification = notificationRepository.findById(notificationId)
                .orElseThrow(() -> new IllegalArgumentException("Notification not found: " + notificationId));

        if (!notification.getUserId().equals(userId)) {
            throw new IllegalArgumentException("Notification does not belong to user");
        }

        notification.setRead(true);
        return toResponse(notificationRepository.save(notification));
    }

    @Transactional
    public int markAllAsRead(UUID userId) {
        return notificationRepository.markAllReadByUserId(userId);
    }

    @Transactional
    public void deleteNotification(UUID notificationId, UUID userId) {
        Notification notification = notificationRepository.findById(notificationId)
                .orElseThrow(() -> new IllegalArgumentException("Notification not found: " + notificationId));

        if (!notification.getUserId().equals(userId)) {
            throw new IllegalArgumentException("Notification does not belong to user");
        }

        notificationRepository.delete(notification);
    }

    private NotificationDto.NotificationResponse toResponse(Notification n) {
        return new NotificationDto.NotificationResponse(
                n.getId(), n.getUserId(), n.getType(), n.getTitle(),
                n.getMessage(), n.getProjectId(), n.getTaskId(),
                n.isRead(), n.getCreatedAt()
        );
    }
}
