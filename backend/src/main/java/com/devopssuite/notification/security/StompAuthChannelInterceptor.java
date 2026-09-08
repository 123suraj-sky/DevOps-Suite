package com.devopssuite.notification.security;

import com.devopssuite.security.JwtUtils;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.messaging.Message;
import org.springframework.messaging.MessageChannel;
import org.springframework.messaging.MessagingException;
import org.springframework.messaging.simp.stomp.StompCommand;
import org.springframework.messaging.simp.stomp.StompHeaderAccessor;
import org.springframework.messaging.support.ChannelInterceptor;
import org.springframework.messaging.support.MessageHeaderAccessor;
import org.springframework.stereotype.Component;

import java.security.Principal;
import java.util.List;

/**
 * Validates the JWT supplied in the STOMP {@code CONNECT} frame's
 * {@code Authorization} header.
 *
 * <p>Flow:
 * <ol>
 *   <li>Client connects via SockJS and sends a STOMP CONNECT frame with
 *       {@code Authorization: Bearer <token>} in the STOMP headers.</li>
 *   <li>This interceptor fires before the frame is processed.</li>
 *   <li>If the token is missing, expired, or blacklisted → throw
 *       {@link MessagingException} which closes the STOMP session.</li>
 *   <li>If valid → attach a {@link Principal} (userId string) to the
 *       STOMP session so that {@code SimpMessagingTemplate.convertAndSendToUser()}
 *       can address it by userId.</li>
 * </ol>
 * </p>
 *
 * <p>Only CONNECT frames are inspected. SUBSCRIBE / SEND / DISCONNECT pass
 * through unchecked — the session-level principal established on CONNECT is
 * sufficient for the broker to enforce routing.</p>
 */
@Component
@RequiredArgsConstructor
@Slf4j
public class StompAuthChannelInterceptor implements ChannelInterceptor {

    private final JwtUtils jwtUtils;
    private final StringRedisTemplate redisTemplate;

    @Override
    public Message<?> preSend(Message<?> message, MessageChannel channel) {
        StompHeaderAccessor accessor = MessageHeaderAccessor.getAccessor(
                message, StompHeaderAccessor.class);

        if (accessor == null) {
            return message;
        }

        // Only authenticate the initial CONNECT command
        if (!StompCommand.CONNECT.equals(accessor.getCommand())) {
            return message;
        }

        String token = extractToken(accessor);

        if (token == null) {
            log.warn("STOMP CONNECT rejected: no Authorization header");
            throw new MessagingException("Missing Authorization header on STOMP CONNECT");
        }

        // Check Redis blacklist — same check as JwtRequestFilter for HTTP
        if (Boolean.TRUE.equals(redisTemplate.hasKey("blacklist:" + token))) {
            log.warn("STOMP CONNECT rejected: token is blacklisted");
            throw new MessagingException("Token has been revoked");
        }

        if (!jwtUtils.validateToken(token)) {
            log.warn("STOMP CONNECT rejected: invalid or expired token");
            throw new MessagingException("Invalid or expired JWT");
        }

        // Extract userId and attach as the STOMP session principal
        String userId = jwtUtils.getUserIdFromToken(token);
        accessor.setUser(new StompPrincipal(userId));
        log.debug("STOMP CONNECT authenticated: userId={}", userId);

        return message;
    }

    /**
     * Reads the bearer token from the STOMP {@code Authorization} native header.
     * The header is sent by the frontend websocketService as:
     * {@code connectHeaders: { Authorization: "Bearer <token>" }}
     */
    private String extractToken(StompHeaderAccessor accessor) {
        List<String> authHeaders = accessor.getNativeHeader("Authorization");
        if (authHeaders == null || authHeaders.isEmpty()) {
            return null;
        }
        String header = authHeaders.get(0);
        if (header != null && header.startsWith("Bearer ")) {
            return header.substring(7);
        }
        return null;
    }

    /**
     * Minimal {@link Principal} that carries the userId (UUID string) as its name.
     * This enables {@code SimpMessagingTemplate.convertAndSendToUser(userId, ...)}
     * to route messages to the correct STOMP session.
     */
    private record StompPrincipal(String name) implements Principal {
        @Override
        public String getName() {
            return name;
        }
    }
}
