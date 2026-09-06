-- V10: Add created_by and last_modified_by audit columns to tasks
-- Both are nullable FKs so that existing rows remain valid (NULL = unknown/pre-migration)
-- ON DELETE SET NULL: deleting a user preserves the task audit history as NULL rather than cascading

ALTER TABLE tasks
    ADD COLUMN IF NOT EXISTS created_by       UUID REFERENCES users(id) ON DELETE SET NULL,
    ADD COLUMN IF NOT EXISTS last_modified_by UUID REFERENCES users(id) ON DELETE SET NULL;
