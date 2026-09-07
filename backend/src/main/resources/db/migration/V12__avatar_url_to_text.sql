-- Widen avatar_url to TEXT so base64-encoded image data URLs can be stored.
-- A 256×256 PNG data URL is typically 50–100 KB; TEXT (up to 1 GB) handles that comfortably.
ALTER TABLE users
    ALTER COLUMN avatar_url TYPE TEXT;
