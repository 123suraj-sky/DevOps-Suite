-- V14: Per-user notification preferences
-- Each row stores whether a specific notification type should be delivered
-- as an in-app (WebSocket) notification and/or an email.
-- Missing rows are treated as defaults: in_app=true, email=false.

CREATE TABLE notification_preferences (
    id         UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id    UUID        NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    type       VARCHAR(50) NOT NULL,
    in_app     BOOLEAN     NOT NULL DEFAULT TRUE,
    email      BOOLEAN     NOT NULL DEFAULT FALSE,
    CONSTRAINT uq_notif_pref_user_type UNIQUE (user_id, type)
);

CREATE INDEX idx_notif_pref_user_id ON notification_preferences (user_id);

COMMENT ON TABLE notification_preferences IS
    'User-level opt-in/out settings for each notification type and delivery channel.';
