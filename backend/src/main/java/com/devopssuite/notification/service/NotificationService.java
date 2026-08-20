package com.devopssuite.notification.service;

import com.devopssuite.notification.dto.NotificationDto;
import com.devopssuite.notification.model.Notification;
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

    /** Creates a notification, persists it, then broadcasts it over WebSocket. */
    @Transactional
    public NotificationDto.NotificationResponse createNotification(
            UUID userId, String type, String title, String message,
            UUID projectId, UUID taskId) {

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
