-- Add pending_lead_id for sub-project lead invitation workflow
ALTER TABLE projects ADD COLUMN pending_lead_id BIGINT NULL REFERENCES users(id) ON DELETE SET NULL;

CREATE INDEX idx_projects_pending_lead_id ON projects(pending_lead_id);
