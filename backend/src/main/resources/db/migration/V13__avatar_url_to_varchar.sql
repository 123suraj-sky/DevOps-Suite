-- Revert avatar_url from TEXT back to VARCHAR(512).
-- Avatars are now stored as files on a Docker volume; only the URL path is kept here.
-- Any existing base64 data URIs are cleared since they can't be served as file paths.
UPDATE users
SET avatar_url = NULL
WHERE avatar_url IS NOT NULL
  AND avatar_url LIKE 'data:%';

ALTER TABLE users
    ALTER COLUMN avatar_url TYPE VARCHAR(512);
