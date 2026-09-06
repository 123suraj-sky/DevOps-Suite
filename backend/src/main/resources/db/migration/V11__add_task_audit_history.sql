-- V11: Task audit history — every create/update/status-change writes one row.
-- snapshot stores a JSON representation of the task fields at that point in time.
-- action: CREATED | UPDATED | STATUS_CHANGED | DUPLICATED

CREATE TABLE IF NOT EXISTS task_audit_history (
    id           UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
    task_id      UUID         NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
    changed_by   UUID         REFERENCES users(id) ON DELETE SET NULL,
    changed_at   TIMESTAMPTZ  NOT NULL DEFAULT now(),
    action       VARCHAR(32)  NOT NULL,
    snapshot     JSONB        NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_task_audit_history_task_id    ON task_audit_history(task_id);
CREATE INDEX IF NOT EXISTS idx_task_audit_history_changed_at ON task_audit_history(changed_at DESC);
