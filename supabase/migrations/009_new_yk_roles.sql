-- ============================================================
-- 009: Yeni YK rolleri — YK Başkanı ile aynı yetkiler
-- Supabase SQL Editor'da çalıştırın
-- ============================================================

-- ── 1. profiles.role CHECK kısıtını güncelle ──────────────

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
    'temsilci'
  ));

-- ── 2. is_workspace_admin: yeni rolleri ekle ──────────────

CREATE OR REPLACE FUNCTION public.is_workspace_admin(ws_id UUID)
RETURNS BOOLEAN LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE v_role TEXT;
BEGIN
  SELECT role INTO v_role FROM public.profiles WHERE id = auth.uid();
  IF v_role IN ('yk_baskani','yk_baskan_vekili','yk_sekreteri','yk_it_sorumlusu','yk_saymani','yk_uyesi') THEN
    RETURN TRUE;
  END IF;
  IF EXISTS (
    SELECT 1 FROM public.workspace_memberships
    WHERE workspace_id = ws_id AND user_id = auth.uid() AND role = 'admin'
  ) THEN RETURN TRUE; END IF;
  RETURN FALSE;
END;
$$;

-- ── 3. can_access_workspace: yeni rolleri ekle ────────────

CREATE OR REPLACE FUNCTION public.can_access_workspace(ws_id UUID)
RETURNS BOOLEAN LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_role   TEXT;
  ws_roles TEXT[];
  ws_users UUID[];
BEGIN
  SELECT role INTO v_role FROM public.profiles WHERE id = auth.uid();
  SELECT access_roles, access_user_ids INTO ws_roles, ws_users
    FROM public.workspaces WHERE id = ws_id;
  IF v_role IN ('yk_baskani','yk_baskan_vekili','yk_sekreteri','yk_it_sorumlusu','yk_saymani') THEN
    RETURN TRUE;
  END IF;
  IF EXISTS (
    SELECT 1 FROM public.workspace_memberships
    WHERE workspace_id = ws_id AND user_id = auth.uid()
  ) THEN RETURN TRUE; END IF;
  IF auth.uid() = ANY(ws_users) THEN RETURN TRUE; END IF;
  IF v_role = ANY(ws_roles) THEN RETURN TRUE; END IF;
  RETURN FALSE;
END;
$$;

-- ── 4. Workspace RLS: yeni rolleri ekle ───────────────────

-- workspaces INSERT/UPDATE için mevcut politikaları güncelle
-- (mevcut politikaları yeniden oluşturmak gerekirse aşağıdaki bloğu çalıştırın)

-- workspace_memberships SELECT: yeni roller
DROP POLICY IF EXISTS "ws_mem_select" ON public.workspace_memberships;
CREATE POLICY "ws_mem_select" ON public.workspace_memberships FOR SELECT
  USING (
    user_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid()
      AND role IN ('yk_baskani','yk_baskan_vekili','yk_sekreteri','yk_it_sorumlusu','yk_saymani','yk_uyesi')
    )
  );

DROP POLICY IF EXISTS "ws_mem_insert" ON public.workspace_memberships;
CREATE POLICY "ws_mem_insert" ON public.workspace_memberships FOR INSERT
  WITH CHECK (
    (SELECT role FROM public.profiles WHERE id = auth.uid())
      IN ('yk_baskani','yk_baskan_vekili','yk_sekreteri','yk_it_sorumlusu','yk_saymani','yk_uyesi')
    OR public.is_workspace_admin(workspace_id)
  );

DROP POLICY IF EXISTS "ws_mem_update" ON public.workspace_memberships;
CREATE POLICY "ws_mem_update" ON public.workspace_memberships FOR UPDATE
  USING (
    (SELECT role FROM public.profiles WHERE id = auth.uid())
      IN ('yk_baskani','yk_baskan_vekili','yk_sekreteri','yk_it_sorumlusu','yk_saymani','yk_uyesi')
    OR public.is_workspace_admin(workspace_id)
  );

DROP POLICY IF EXISTS "ws_mem_delete" ON public.workspace_memberships;
CREATE POLICY "ws_mem_delete" ON public.workspace_memberships FOR DELETE
  USING (
    user_id = auth.uid()
    OR (SELECT role FROM public.profiles WHERE id = auth.uid())
      IN ('yk_baskani','yk_baskan_vekili','yk_sekreteri','yk_it_sorumlusu','yk_saymani','yk_uyesi')
    OR public.is_workspace_admin(workspace_id)
  );

-- board_memberships
DROP POLICY IF EXISTS "brd_mem_select" ON public.board_memberships;
CREATE POLICY "brd_mem_select" ON public.board_memberships FOR SELECT
  USING (
    user_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid()
      AND role IN ('yk_baskani','yk_baskan_vekili','yk_sekreteri','yk_it_sorumlusu','yk_saymani','yk_uyesi')
    )
  );

DROP POLICY IF EXISTS "brd_mem_insert" ON public.board_memberships;
CREATE POLICY "brd_mem_insert" ON public.board_memberships FOR INSERT
  WITH CHECK (
    (SELECT role FROM public.profiles WHERE id = auth.uid())
      IN ('yk_baskani','yk_baskan_vekili','yk_sekreteri','yk_it_sorumlusu','yk_saymani','yk_uyesi')
    OR public.is_workspace_admin(workspace_id)
  );

DROP POLICY IF EXISTS "brd_mem_update" ON public.board_memberships;
CREATE POLICY "brd_mem_update" ON public.board_memberships FOR UPDATE
  USING (
    (SELECT role FROM public.profiles WHERE id = auth.uid())
      IN ('yk_baskani','yk_baskan_vekili','yk_sekreteri','yk_it_sorumlusu','yk_saymani','yk_uyesi')
    OR public.is_workspace_admin(workspace_id)
  );

DROP POLICY IF EXISTS "brd_mem_delete" ON public.board_memberships;
CREATE POLICY "brd_mem_delete" ON public.board_memberships FOR DELETE
  USING (
    user_id = auth.uid()
    OR (SELECT role FROM public.profiles WHERE id = auth.uid())
      IN ('yk_baskani','yk_baskan_vekili','yk_sekreteri','yk_it_sorumlusu','yk_saymani','yk_uyesi')
    OR public.is_workspace_admin(workspace_id)
  );
