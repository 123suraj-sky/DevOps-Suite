-- Add optional reference to the IDE file that was run (IDE mode submissions).
-- NULL for classic inline-code submissions.
ALTER TABLE execution_requests
    ADD COLUMN IF NOT EXISTS file_id UUID NULL;

CREATE INDEX IF NOT EXISTS idx_exec_file ON execution_requests(file_id);
