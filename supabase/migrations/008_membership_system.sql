-- ============================================================
-- 008: Workspace & Board Membership System
-- Supabase SQL Editor'da çalıştırın
-- ============================================================

-- ── 1. Tabloları oluştur ──────────────────────────────────

CREATE TABLE IF NOT EXISTS public.workspace_memberships (
  id           UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  user_id      UUID NOT NULL REFERENCES public.profiles(id)   ON DELETE CASCADE,
  role         TEXT NOT NULL CHECK (role IN ('admin','observer')),
  invited_by   UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at   TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(workspace_id, user_id)
);

CREATE TABLE IF NOT EXISTS public.board_memberships (
  id           UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  board_name   TEXT NOT NULL,
  user_id      UUID NOT NULL REFERENCES public.profiles(id)   ON DELETE CASCADE,
  role         TEXT NOT NULL CHECK (role IN ('admin','observer')),
  invited_by   UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at   TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(workspace_id, board_name, user_id)
);

-- ── 2. Yardımcı fonksiyonları oluştur (RLS'den önce) ──────

-- is_workspace_admin: RLS politikaları bunu kullandığından önce tanımlanmalı
CREATE OR REPLACE FUNCTION public.is_workspace_admin(ws_id UUID)
RETURNS BOOLEAN LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE v_role TEXT;
BEGIN
  SELECT role INTO v_role FROM public.profiles WHERE id = auth.uid();
  IF v_role IN ('yk_baskani','yk_uyesi') THEN RETURN TRUE; END IF;
  IF EXISTS (
    SELECT 1 FROM public.workspace_memberships
    WHERE workspace_id = ws_id AND user_id = auth.uid() AND role = 'admin'
  ) THEN RETURN TRUE; END IF;
  RETURN FALSE;
END;
$$;

-- can_access_workspace: mevcut fonksiyonu güncelle, üyelik tablosunu da kontrol et
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
  IF v_role = 'yk_baskani' THEN RETURN TRUE; END IF;
  IF EXISTS (
    SELECT 1 FROM public.workspace_memberships
    WHERE workspace_id = ws_id AND user_id = auth.uid()
  ) THEN RETURN TRUE; END IF;
  IF auth.uid() = ANY(ws_users) THEN RETURN TRUE; END IF;
  IF v_role = ANY(ws_roles) THEN RETURN TRUE; END IF;
  RETURN FALSE;
END;
$$;

-- ── 3. RLS etkinleştir ────────────────────────────────────

ALTER TABLE public.workspace_memberships ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.board_memberships     ENABLE ROW LEVEL SECURITY;

-- ── 4. RLS politikaları (fonksiyonlar zaten tanımlı) ─────

-- workspace_memberships
DROP POLICY IF EXISTS "ws_mem_select" ON public.workspace_memberships;
DROP POLICY IF EXISTS "ws_mem_insert" ON public.workspace_memberships;
DROP POLICY IF EXISTS "ws_mem_update" ON public.workspace_memberships;
DROP POLICY IF EXISTS "ws_mem_delete" ON public.workspace_memberships;

-- SELECT: kendi kaydını veya yk rolü veya workspace admin görebilir
-- (can_access_workspace kullanılmıyor — o da workspace_memberships'e bakıyor, döngü riski)
CREATE POLICY "ws_mem_select" ON public.workspace_memberships FOR SELECT
  USING (
    user_id = auth.uid()
    OR (SELECT role FROM public.profiles WHERE id = auth.uid()) IN ('yk_baskani','yk_uyesi')
    OR public.is_workspace_admin(workspace_id)
  );

CREATE POLICY "ws_mem_insert" ON public.workspace_memberships FOR INSERT
  WITH CHECK (
    (SELECT role FROM public.profiles WHERE id = auth.uid()) IN ('yk_baskani','yk_uyesi')
    OR public.is_workspace_admin(workspace_id)
  );

CREATE POLICY "ws_mem_update" ON public.workspace_memberships FOR UPDATE
  USING (
    (SELECT role FROM public.profiles WHERE id = auth.uid()) IN ('yk_baskani','yk_uyesi')
    OR public.is_workspace_admin(workspace_id)
  );

CREATE POLICY "ws_mem_delete" ON public.workspace_memberships FOR DELETE
  USING (
    user_id = auth.uid()
    OR (SELECT role FROM public.profiles WHERE id = auth.uid()) IN ('yk_baskani','yk_uyesi')
    OR public.is_workspace_admin(workspace_id)
  );

-- board_memberships
DROP POLICY IF EXISTS "brd_mem_select" ON public.board_memberships;
DROP POLICY IF EXISTS "brd_mem_insert" ON public.board_memberships;
DROP POLICY IF EXISTS "brd_mem_update" ON public.board_memberships;
DROP POLICY IF EXISTS "brd_mem_delete" ON public.board_memberships;

CREATE POLICY "brd_mem_select" ON public.board_memberships FOR SELECT
  USING (
    user_id = auth.uid()
    OR (SELECT role FROM public.profiles WHERE id = auth.uid()) IN ('yk_baskani','yk_uyesi')
    OR public.is_workspace_admin(workspace_id)
  );

CREATE POLICY "brd_mem_insert" ON public.board_memberships FOR INSERT
  WITH CHECK (
    (SELECT role FROM public.profiles WHERE id = auth.uid()) IN ('yk_baskani','yk_uyesi')
    OR public.is_workspace_admin(workspace_id)
  );

CREATE POLICY "brd_mem_update" ON public.board_memberships FOR UPDATE
  USING (
    (SELECT role FROM public.profiles WHERE id = auth.uid()) IN ('yk_baskani','yk_uyesi')
    OR public.is_workspace_admin(workspace_id)
  );

CREATE POLICY "brd_mem_delete" ON public.board_memberships FOR DELETE
  USING (
    user_id = auth.uid()
    OR (SELECT role FROM public.profiles WHERE id = auth.uid()) IN ('yk_baskani','yk_uyesi')
    OR public.is_workspace_admin(workspace_id)
  );

-- ── 5. Trigger: workspace admin → tüm board'larda admin ──

CREATE OR REPLACE FUNCTION public.auto_board_admin_on_ws_admin()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
DECLARE
  b         TEXT;
  ws_boards TEXT[];
BEGIN
  IF NEW.role = 'admin' THEN
    SELECT boards INTO ws_boards FROM public.workspaces WHERE id = NEW.workspace_id;
    IF ws_boards IS NOT NULL THEN
      FOREACH b IN ARRAY ws_boards LOOP
        INSERT INTO public.board_memberships (workspace_id, board_name, user_id, role, invited_by)
        VALUES (NEW.workspace_id, b, NEW.user_id, 'admin', NEW.invited_by)
        ON CONFLICT (workspace_id, board_name, user_id) DO UPDATE SET role = 'admin';
      END LOOP;
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_auto_board_admin ON public.workspace_memberships;
CREATE TRIGGER trg_auto_board_admin
  AFTER INSERT OR UPDATE ON public.workspace_memberships
  FOR EACH ROW EXECUTE FUNCTION public.auto_board_admin_on_ws_admin();

-- ── 6. İndeksler ──────────────────────────────────────────

CREATE INDEX IF NOT EXISTS ws_mem_workspace_idx  ON public.workspace_memberships(workspace_id);
CREATE INDEX IF NOT EXISTS ws_mem_user_idx        ON public.workspace_memberships(user_id);
CREATE INDEX IF NOT EXISTS brd_mem_workspace_idx  ON public.board_memberships(workspace_id);
CREATE INDEX IF NOT EXISTS brd_mem_user_idx       ON public.board_memberships(user_id);
