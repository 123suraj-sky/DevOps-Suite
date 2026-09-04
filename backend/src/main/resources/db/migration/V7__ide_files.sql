-- IDE file storage: each row is one file belonging to a project
CREATE TABLE IF NOT EXISTS ide_files (
    id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id  UUID        NOT NULL REFERENCES projects(id)  ON DELETE CASCADE,
    user_id     UUID        NOT NULL REFERENCES users(id)     ON DELETE CASCADE,
    path        TEXT        NOT NULL,           -- full relative path, e.g. "src/utils.py"
    name        TEXT        NOT NULL,           -- filename only, e.g. "utils.py"
    content     TEXT        NOT NULL DEFAULT '',
    language    TEXT        NOT NULL DEFAULT 'plaintext',
    is_folder   BOOLEAN     NOT NULL DEFAULT FALSE,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at  TIMESTAMPTZ NOT NULL DEFAULT now(),

    -- No two entries can share the same path within a project
    CONSTRAINT uq_ide_file_path UNIQUE (project_id, path)
);

CREATE INDEX IF NOT EXISTS idx_ide_files_project   ON ide_files(project_id);
CREATE INDEX IF NOT EXISTS idx_ide_files_user       ON ide_files(user_id);
CREATE INDEX IF NOT EXISTS idx_ide_files_proj_path  ON ide_files(project_id, path);
