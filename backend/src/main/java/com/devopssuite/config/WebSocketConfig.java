package com.devopssuite.config;

import com.devopssuite.notification.security.StompAuthChannelInterceptor;
import lombok.RequiredArgsConstructor;
import org.springframework.context.annotation.Configuration;
import org.springframework.messaging.simp.config.ChannelRegistration;
import org.springframework.messaging.simp.config.MessageBrokerRegistry;
import org.springframework.web.socket.config.annotation.EnableWebSocketMessageBroker;
import org.springframework.web.socket.config.annotation.StompEndpointRegistry;
import org.springframework.web.socket.config.annotation.WebSocketMessageBrokerConfigurer;

/**
 * Configures the STOMP over SockJS WebSocket message broker.
 *
 * Topics:
 *   /topic/notifications/{userId}  - in-app toast notifications
 *   /topic/logs/{projectId}        - real-time log streaming
 *   /topic/tasks/{projectId}       - live Kanban task updates
 *
 * Security:
 *   JWT validation on STOMP CONNECT via {@link StompAuthChannelInterceptor}.
 *   The HTTP-level /ws/** is permitAll (required for SockJS handshake), but
 *   every STOMP session must present a valid, non-blacklisted JWT to connect.
 */
@Configuration
@EnableWebSocketMessageBroker
@RequiredArgsConstructor
public class WebSocketConfig implements WebSocketMessageBrokerConfigurer {

    private final StompAuthChannelInterceptor stompAuthChannelInterceptor;

    @Override
    public void configureMessageBroker(MessageBrokerRegistry registry) {
        registry.enableSimpleBroker("/topic");
        registry.setApplicationDestinationPrefixes("/app");
    }

    @Override
    public void registerStompEndpoints(StompEndpointRegistry registry) {
        registry.addEndpoint("/ws")
                .setAllowedOriginPatterns("http://localhost:5173", "http://localhost:*")
                .withSockJS();
    }

    /** Attach the JWT interceptor to the inbound channel (client → broker). */
    @Override
    public void configureClientInboundChannel(ChannelRegistration registration) {
        registration.interceptors(stompAuthChannelInterceptor);
    }
}
