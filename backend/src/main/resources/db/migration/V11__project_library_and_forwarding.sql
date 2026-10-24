-- Add project_id and provenance columns to attachments for Project Library and Forwarding
ALTER TABLE attachments ADD COLUMN project_id BIGINT REFERENCES projects(id) ON DELETE CASCADE;

-- Backfill project_id for existing attachments from their associated tasks
UPDATE attachments a
SET project_id = t.project_id
FROM tasks t
WHERE a.task_id = t.id AND a.project_id IS NULL;

-- Allow task_id to be NULL for direct library uploads and forwarded attachments
ALTER TABLE attachments ALTER COLUMN task_id DROP NOT NULL;

-- Enforce project_id NOT NULL
ALTER TABLE attachments ALTER COLUMN project_id SET NOT NULL;

-- Add provenance tracking columns
ALTER TABLE attachments ADD COLUMN uploaded_by BIGINT REFERENCES users(id) ON DELETE SET NULL;
ALTER TABLE attachments ADD COLUMN forwarded_by BIGINT REFERENCES users(id) ON DELETE SET NULL;
ALTER TABLE attachments ADD COLUMN forwarded_at TIMESTAMP WITH TIME ZONE NULL;
ALTER TABLE attachments ADD COLUMN source_project_id BIGINT REFERENCES projects(id) ON DELETE SET NULL;
ALTER TABLE attachments ADD COLUMN source_attachment_id BIGINT REFERENCES attachments(id) ON DELETE SET NULL;

-- Indexes for performance
CREATE INDEX idx_attachments_project_id ON attachments(project_id);
CREATE INDEX idx_attachments_forwarded_by ON attachments(forwarded_by);
