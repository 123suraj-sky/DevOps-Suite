ALTER TABLE tasks
    ALTER COLUMN priority TYPE VARCHAR(20)
    USING CASE
        WHEN priority IS NULL THEN 'MEDIUM'
        WHEN priority = 0 THEN 'LOW'
        WHEN priority = 1 THEN 'MEDIUM'
        WHEN priority = 2 THEN 'HIGH'
        ELSE priority::text
    END;

UPDATE tasks
SET priority = 'MEDIUM'
WHERE priority IS NULL OR priority = '';
