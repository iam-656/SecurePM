-- Add sub-project support: parent_project_id and lead_id
ALTER TABLE projects ADD COLUMN parent_project_id BIGINT NULL REFERENCES projects(id) ON DELETE CASCADE;
ALTER TABLE projects ADD COLUMN lead_id BIGINT NULL REFERENCES users(id);

-- Backfill existing projects: lead_id = created_by
UPDATE projects SET lead_id = created_by WHERE lead_id IS NULL;

-- Index for fast lookup of child projects and leads
CREATE INDEX idx_projects_parent_project_id ON projects(parent_project_id);
CREATE INDEX idx_projects_lead_id ON projects(lead_id);
