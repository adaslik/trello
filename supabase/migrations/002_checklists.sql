-- Alt görev (checklist) tablosu
-- Supabase SQL Editor'da çalıştırın

CREATE TABLE IF NOT EXISTS task_checklists (
  id           UUID    DEFAULT gen_random_uuid() PRIMARY KEY,
  task_id      UUID    REFERENCES tasks(id) ON DELETE CASCADE NOT NULL,
  title        TEXT    NOT NULL,
  is_completed BOOLEAN DEFAULT FALSE NOT NULL,
  assigned_to  UUID    REFERENCES profiles(id) ON DELETE SET NULL,
  position     INTEGER DEFAULT 0 NOT NULL,
  created_by   UUID    REFERENCES profiles(id) ON DELETE SET NULL,
  created_at   TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

ALTER TABLE task_checklists ENABLE ROW LEVEL SECURITY;

CREATE POLICY "checklist_select" ON task_checklists FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM tasks t
    WHERE t.id = task_checklists.task_id
      AND can_access_workspace(t.workspace_id)
  ));

CREATE POLICY "checklist_insert" ON task_checklists FOR INSERT
  WITH CHECK (EXISTS (
    SELECT 1 FROM tasks t
    WHERE t.id = task_checklists.task_id
      AND can_access_workspace(t.workspace_id)
  ));

CREATE POLICY "checklist_update" ON task_checklists FOR UPDATE
  USING (EXISTS (
    SELECT 1 FROM tasks t
    WHERE t.id = task_checklists.task_id
      AND can_access_workspace(t.workspace_id)
  ));

CREATE POLICY "checklist_delete" ON task_checklists FOR DELETE
  USING (EXISTS (
    SELECT 1 FROM tasks t
    WHERE t.id = task_checklists.task_id
      AND can_access_workspace(t.workspace_id)
  ));

-- Realtime
ALTER PUBLICATION supabase_realtime ADD TABLE task_checklists;
