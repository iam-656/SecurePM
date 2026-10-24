-- Migration V6: Add user email, creator hierarchy, and active username index
ALTER TABLE users ADD COLUMN IF NOT EXISTS email VARCHAR(150);

-- Backfill super admin email
UPDATE users SET email = 'superadmin@pm.local' WHERE username = 'admin' AND (email IS NULL OR email = '');

-- Backfill any remaining existing users
UPDATE users SET email = LOWER(username) || '@pm.local' WHERE email IS NULL OR email = '';

ALTER TABLE users ALTER COLUMN email SET NOT NULL;
ALTER TABLE users ADD CONSTRAINT users_email_unique UNIQUE (email);

-- Add created_by hierarchy reference
ALTER TABLE users ADD COLUMN IF NOT EXISTS created_by BIGINT REFERENCES users(id);

-- Drop absolute unique constraint and index on username
ALTER TABLE users DROP CONSTRAINT IF EXISTS users_username_key;
DROP INDEX IF EXISTS idx_users_username;

-- Create partial unique index on LOWER(username) for active users only
-- When active = false (soft deleted), the username becomes available for reuse
CREATE UNIQUE INDEX IF NOT EXISTS idx_users_active_username ON users (LOWER(username)) WHERE active = true;
