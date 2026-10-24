ALTER TABLE projects ADD COLUMN completed BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE projects ADD COLUMN completed_at TIMESTAMP WITH TIME ZONE NULL;
ALTER TABLE projects ADD COLUMN completed_by BIGINT NULL REFERENCES users(id) ON DELETE SET NULL;

CREATE INDEX idx_projects_completed ON projects(completed);
