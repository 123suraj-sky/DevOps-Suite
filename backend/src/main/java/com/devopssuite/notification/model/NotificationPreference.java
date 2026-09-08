package com.devopssuite.notification.model;

import jakarta.persistence.*;
import lombok.*;

import java.util.UUID;

/**
 * Stores a user's opt-in / opt-out preference for a single notification type
 * and delivery channel.
 *
 * <p>If a row is absent for a given (user, type) pair the system uses the
 * defaults: {@code in_app = true}, {@code email = false}.</p>
 */
@Entity
@Table(
    name = "notification_preferences",
    uniqueConstraints = @UniqueConstraint(
        name = "uq_notif_pref_user_type",
        columnNames = {"user_id", "type"}
    )
)
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class NotificationPreference {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @Column(name = "user_id", nullable = false)
    private UUID userId;

    /** Matches the {@code type} strings used in {@link Notification} entities. */
    @Column(nullable = false, length = 50)
    private String type;

    /** Whether to persist and push via WebSocket. Default: true. */
    @Column(nullable = false)
    @Builder.Default
    private boolean inApp = true;

    /** Whether to send an email. Default: false. */
    @Column(nullable = false)
    @Builder.Default
    private boolean email = false;
}
