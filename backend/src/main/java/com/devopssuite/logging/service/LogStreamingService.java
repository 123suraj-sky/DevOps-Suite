package com.devopssuite.logging.service;

import com.devopssuite.logging.event.LogEvent;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.context.event.EventListener;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.scheduling.annotation.Async;
import org.springframework.stereotype.Service;

/**
 * Listens for {@link LogEvent}s that are associated with a project and
 * broadcasts them over WebSocket to {@code /topic/logs/{projectId}}
 * so the frontend LogsPage can display real-time request logs.
 */
@Service
@RequiredArgsConstructor
@Slf4j
public class LogStreamingService {

    private final SimpMessagingTemplate messagingTemplate;

    @Async
    @EventListener
    public void onLogEvent(LogEvent event) {
        if (event.projectId() == null) {
            return; // Only stream logs that are scoped to a project
        }
        try {
            messagingTemplate.convertAndSend(
                    "/topic/logs/" + event.projectId(),
                    event
            );
        } catch (Exception e) {
            log.warn("Failed to stream log event over WebSocket: {}", e.getMessage());
        }
    }
}
