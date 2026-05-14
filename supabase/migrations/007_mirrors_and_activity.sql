-- Görev aynalama ve değişiklik geçmişi
-- Supabase SQL Editor'da çalıştırın

-- Aynalama desteği
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS mirror_of UUID REFERENCES tasks(id) ON DELETE SET NULL;
CREATE INDEX IF NOT EXISTS tasks_mirror_of_idx ON tasks(mirror_of);

-- Değişiklik / aktivite geçmişi tablosu
CREATE TABLE IF NOT EXISTS task_activities (
  id            UUID        DEFAULT gen_random_uuid() PRIMARY KEY,
  task_id       UUID        REFERENCES tasks(id) ON DELETE CASCADE NOT NULL,
  user_id       UUID        REFERENCES profiles(id) ON DELETE SET NULL,
  user_name     TEXT        NOT NULL,
  user_initials TEXT        NOT NULL,
  action_type   TEXT        NOT NULL,  -- 'created', 'field_changed', 'comment_added', 'mirrored'
  field_name    TEXT,
  old_value     TEXT,
  new_value     TEXT,
  created_at    TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

CREATE INDEX IF NOT EXISTS task_activities_task_id_idx ON task_activities(task_id);

ALTER TABLE task_activities ENABLE ROW LEVEL SECURITY;

CREATE POLICY "activity_select" ON task_activities FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM tasks t
    WHERE t.id = task_activities.task_id
      AND can_access_workspace(t.workspace_id)
  ));

CREATE POLICY "activity_insert" ON task_activities FOR INSERT
  WITH CHECK (EXISTS (
    SELECT 1 FROM tasks t
    WHERE t.id = task_activities.task_id
      AND can_access_workspace(t.workspace_id)
  ));
