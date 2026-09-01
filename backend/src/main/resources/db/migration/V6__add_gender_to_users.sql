-- Add gender column to users table
-- Stored as VARCHAR to keep migrations simple; enum constraint enforced at the Java layer
ALTER TABLE users ADD COLUMN gender VARCHAR(20) NOT NULL DEFAULT 'PREFER_NOT_TO_SAY';
