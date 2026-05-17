-- ============================================================
-- 010: Çalışan & Danışma Kurulu Üyesi Görünürlük Kısıtlaması
-- calisan ve danisman rolleri yalnızca görevli oldukları
-- workspace ve kartları görebilir.
-- Supabase SQL Editor'da çalıştırın
-- NOT: 011_danisman_role.sql bu politikaları tekrar günceller;
--      ikisini de çalıştırıyorsanız 011 yeterli olacaktır.
-- ============================================================

-- ── 1. workspaces_select ─────────────────────────────────────

DROP POLICY IF EXISTS "workspaces_select" ON public.workspaces;
CREATE POLICY "workspaces_select" ON public.workspaces
  FOR SELECT USING (
    CASE
      WHEN (SELECT role FROM public.profiles WHERE id = auth.uid()) IN ('calisan', 'danisman')
      THEN EXISTS (
        SELECT 1 FROM public.tasks t
        WHERE t.workspace_id = workspaces.id
          AND t.assignees @> jsonb_build_array(
                jsonb_build_object('id', auth.uid()::text)
              )
      )
      ELSE public.can_access_workspace(id)
    END
  );

-- ── 2. tasks_select ──────────────────────────────────────────

DROP POLICY IF EXISTS "tasks_select" ON public.tasks;
CREATE POLICY "tasks_select" ON public.tasks
  FOR SELECT USING (
    CASE
      WHEN (SELECT role FROM public.profiles WHERE id = auth.uid()) IN ('calisan', 'danisman')
      THEN assignees @> jsonb_build_array(
             jsonb_build_object('id', auth.uid()::text)
           )
      ELSE public.can_access_workspace(workspace_id)
    END
  );

-- ── 3. labels_select ─────────────────────────────────────────

DROP POLICY IF EXISTS "labels_select" ON public.labels;
CREATE POLICY "labels_select" ON public.labels
  FOR SELECT USING (
    CASE
      WHEN (SELECT role FROM public.profiles WHERE id = auth.uid()) IN ('calisan', 'danisman')
      THEN EXISTS (
        SELECT 1 FROM public.tasks t
        WHERE t.workspace_id = labels.workspace_id
          AND t.assignees @> jsonb_build_array(
                jsonb_build_object('id', auth.uid()::text)
              )
      )
      ELSE public.can_access_workspace(workspace_id)
    END
  );

-- ── 4. checklist_select ──────────────────────────────────────

DROP POLICY IF EXISTS "checklist_select" ON public.task_checklists;
CREATE POLICY "checklist_select" ON public.task_checklists
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.tasks t
      WHERE t.id = task_checklists.task_id
        AND (
          CASE
            WHEN (SELECT role FROM public.profiles WHERE id = auth.uid()) IN ('calisan', 'danisman')
            THEN t.assignees @> jsonb_build_array(
                   jsonb_build_object('id', auth.uid()::text)
                 )
            ELSE public.can_access_workspace(t.workspace_id)
          END
        )
    )
  );

-- ── 5. activity_select ───────────────────────────────────────

DROP POLICY IF EXISTS "activity_select" ON public.task_activities;
CREATE POLICY "activity_select" ON public.task_activities
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.tasks t
      WHERE t.id = task_activities.task_id
        AND (
          CASE
            WHEN (SELECT role FROM public.profiles WHERE id = auth.uid()) IN ('calisan', 'danisman')
            THEN t.assignees @> jsonb_build_array(
                   jsonb_build_object('id', auth.uid()::text)
                 )
            ELSE public.can_access_workspace(t.workspace_id)
          END
        )
    )
  );

-- ── Notlar ───────────────────────────────────────────────────
-- INSERT / UPDATE / DELETE politikaları değiştirilmedi.
