-- Add project_id column to execution_requests for log streaming context
ALTER TABLE execution_requests ADD COLUMN project_id UUID;
