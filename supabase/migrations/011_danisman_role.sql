-- ============================================================
-- 011: Danışma Kurulu Üyesi rolü + Rol Değiştirme Yetkisi
-- Supabase SQL Editor'da çalıştırın
-- ============================================================

-- ── 1. profiles.role kısıtına 'danisman' ekle ─────────────

ALTER TABLE public.profiles
  DROP CONSTRAINT IF EXISTS profiles_role_check;

ALTER TABLE public.profiles
  ADD CONSTRAINT profiles_role_check CHECK (role IN (
    'yk_baskani',
    'yk_baskan_vekili',
    'yk_sekreteri',
    'yk_it_sorumlusu',
    'yk_saymani',
    'yk_uyesi',
    'komisyon_baskani',
    'calisan',
    'temsilci',
    'danisman'
  ));

-- ── 2. profiles_update: yk_baskani ve yk_it_sorumlusu başkalarının profilini güncelleyebilir ──

DROP POLICY IF EXISTS "profiles_update" ON public.profiles;
CREATE POLICY "profiles_update" ON public.profiles
  FOR UPDATE USING (
    auth.uid() = id
    OR (SELECT role FROM public.profiles p WHERE p.id = auth.uid())
         IN ('yk_baskani', 'yk_it_sorumlusu')
  );

-- ── 3. Görünürlük politikalarını calisan + danisman kapsayacak şekilde güncelle ──
-- (010_calisan_visibility.sql'den sonra çalıştırılmalıdır)

-- workspaces_select
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

-- tasks_select
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

-- labels_select
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

-- checklist_select
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

-- activity_select
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
