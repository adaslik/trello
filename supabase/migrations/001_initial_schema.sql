-- =============================================
-- Meslek Odası Görev Yönetim Sistemi
-- Supabase Schema
-- =============================================

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- =============================================
-- PROFILES
-- =============================================
CREATE TABLE IF NOT EXISTS public.profiles (
  id            UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email         TEXT NOT NULL,
  full_name     TEXT NOT NULL DEFAULT '',
  initials      TEXT NOT NULL DEFAULT '',
  role          TEXT NOT NULL DEFAULT 'calisan'
                  CHECK (role IN ('yk_baskani','yk_uyesi','komisyon_baskani','calisan','temsilci')),
  workspace_ids TEXT[] DEFAULT '{}',
  avatar_url    TEXT,
  created_at    TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "profiles_select" ON public.profiles
  FOR SELECT USING (true);

CREATE POLICY "profiles_update" ON public.profiles
  FOR UPDATE USING (auth.uid() = id);

-- Auto-create profile on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name, initials, role)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', split_part(NEW.email,'@',1)),
    UPPER(LEFT(COALESCE(NEW.raw_user_meta_data->>'full_name', split_part(NEW.email,'@',1)), 2)),
    'calisan'
  );
  RETURN NEW;
END;
$$;

CREATE OR REPLACE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- =============================================
-- WORKSPACES
-- =============================================
CREATE TABLE IF NOT EXISTS public.workspaces (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name            TEXT NOT NULL,
  category        TEXT NOT NULL DEFAULT 'birim'
                    CHECK (category IN ('yk','komisyon','temsilcilik','birim')),
  color           TEXT NOT NULL DEFAULT '#534AB7',
  access_roles    TEXT[] DEFAULT ARRAY['yk_baskani'],
  access_user_ids UUID[] DEFAULT '{}',
  boards          TEXT[] DEFAULT ARRAY['Genel'],
  created_by      UUID REFERENCES public.profiles(id),
  created_at      TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.workspaces ENABLE ROW LEVEL SECURITY;

-- Access check function
CREATE OR REPLACE FUNCTION public.can_access_workspace(ws_id UUID)
RETURNS BOOLEAN LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  user_role TEXT;
  ws_roles  TEXT[];
  ws_users  UUID[];
BEGIN
  SELECT role INTO user_role FROM public.profiles WHERE id = auth.uid();
  SELECT access_roles, access_user_ids INTO ws_roles, ws_users
    FROM public.workspaces WHERE id = ws_id;
  -- YK başkanı her şeye erişir
  IF user_role = 'yk_baskani' THEN RETURN TRUE; END IF;
  -- Kullanıcı doğrudan erişim listesinde mi?
  IF auth.uid() = ANY(ws_users) THEN RETURN TRUE; END IF;
  -- Rolü erişim listesinde mi?
  IF user_role = ANY(ws_roles) THEN RETURN TRUE; END IF;
  RETURN FALSE;
END;
$$;

CREATE POLICY "workspaces_select" ON public.workspaces
  FOR SELECT USING (public.can_access_workspace(id));

CREATE POLICY "workspaces_insert" ON public.workspaces
  FOR INSERT WITH CHECK (
    (SELECT role FROM public.profiles WHERE id = auth.uid()) IN ('yk_baskani','yk_uyesi')
  );

CREATE POLICY "workspaces_update" ON public.workspaces
  FOR UPDATE USING (
    (SELECT role FROM public.profiles WHERE id = auth.uid()) IN ('yk_baskani','yk_uyesi')
    OR created_by = auth.uid()
  );

CREATE POLICY "workspaces_delete" ON public.workspaces
  FOR DELETE USING (
    (SELECT role FROM public.profiles WHERE id = auth.uid()) = 'yk_baskani'
    OR created_by = auth.uid()
  );

-- =============================================
-- LABELS (per workspace, 10 max)
-- =============================================
CREATE TABLE IF NOT EXISTS public.labels (
  id           SERIAL PRIMARY KEY,
  workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  name         TEXT NOT NULL,
  color        TEXT NOT NULL,
  position     INT NOT NULL DEFAULT 0
);

ALTER TABLE public.labels ENABLE ROW LEVEL SECURITY;

CREATE POLICY "labels_select" ON public.labels
  FOR SELECT USING (public.can_access_workspace(workspace_id));

CREATE POLICY "labels_all" ON public.labels
  FOR ALL USING (public.can_access_workspace(workspace_id));

-- =============================================
-- TASKS
-- =============================================
CREATE TABLE IF NOT EXISTS public.tasks (
  id                UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  workspace_id      UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  title             TEXT NOT NULL,
  description       TEXT DEFAULT '',
  status            TEXT NOT NULL DEFAULT 'bekleyen'
                      CHECK (status IN ('bekleyen','devam_ediyor','incelemede','tamamlandi')),
  priority          TEXT NOT NULL DEFAULT 'orta'
                      CHECK (priority IN ('dusuk','orta','yuksek','acil')),
  assignee_id       UUID REFERENCES public.profiles(id),
  assignee_name     TEXT,
  assignee_initials TEXT,
  start_date        DATE,
  end_date          DATE,
  board             TEXT,
  label_ids         INT[] DEFAULT '{}',
  drive_links       JSONB DEFAULT '[]',
  comments          JSONB DEFAULT '[]',
  cover_pattern     INT DEFAULT 0,
  position          INT DEFAULT 0,
  created_by        UUID REFERENCES public.profiles(id),
  created_at        TIMESTAMPTZ DEFAULT NOW(),
  updated_at        TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.tasks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "tasks_select" ON public.tasks
  FOR SELECT USING (public.can_access_workspace(workspace_id));

CREATE POLICY "tasks_insert" ON public.tasks
  FOR INSERT WITH CHECK (public.can_access_workspace(workspace_id));

CREATE POLICY "tasks_update" ON public.tasks
  FOR UPDATE USING (public.can_access_workspace(workspace_id));

CREATE POLICY "tasks_delete" ON public.tasks
  FOR DELETE USING (public.can_access_workspace(workspace_id));

-- Auto-update updated_at
CREATE OR REPLACE FUNCTION public.update_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN NEW.updated_at = NOW(); RETURN NEW; END;
$$;

CREATE TRIGGER tasks_updated_at
  BEFORE UPDATE ON public.tasks
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

-- =============================================
-- NOTIFICATIONS
-- =============================================
CREATE TABLE IF NOT EXISTS public.notifications (
  id             UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id        UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  workspace_id   UUID REFERENCES public.workspaces(id) ON DELETE CASCADE,
  workspace_name TEXT,
  text           TEXT NOT NULL,
  is_read        BOOLEAN DEFAULT FALSE,
  created_at     TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "notifs_select" ON public.notifications
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "notifs_update" ON public.notifications
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "notifs_insert" ON public.notifications
  FOR INSERT WITH CHECK (true);

-- =============================================
-- REALTIME
-- =============================================
ALTER PUBLICATION supabase_realtime ADD TABLE public.tasks;
ALTER PUBLICATION supabase_realtime ADD TABLE public.notifications;
ALTER PUBLICATION supabase_realtime ADD TABLE public.workspaces;

-- =============================================
-- SEED: Default workspaces
-- =============================================
-- Run this after creating your first admin user
-- and replacing <ADMIN_USER_ID> with their UUID:
--
-- INSERT INTO public.workspaces (name, category, color, access_roles, boards, created_by) VALUES
--   ('Yönetim Kurulu','yk','#534AB7',ARRAY['yk_baskani','yk_uyesi'],ARRAY['YK Kararları','Bütçe & Finans','Stratejik Planlama'],'<ADMIN_USER_ID>'),
--   ('Denetim Komisyonu','komisyon','#993C1D',ARRAY['yk_baskani','yk_uyesi','komisyon_baskani'],ARRAY['Denetim Takvimi','Raporlar'],'<ADMIN_USER_ID>'),
--   ('Eğitim Birimi','birim','#185FA5',ARRAY['yk_baskani','calisan'],ARRAY['Eğitim Takvimi','Sertifikalar'],'<ADMIN_USER_ID>'),
--   ('Periyodik Kontrol','birim','#3B6D11',ARRAY['yk_baskani','calisan'],ARRAY['PK Takvimi','Raporlar'],'<ADMIN_USER_ID>'),
--   ('Muhasebe','birim','#854F0B',ARRAY['yk_baskani','calisan'],ARRAY['Gelir-Gider','Aidat Takibi'],'<ADMIN_USER_ID>'),
--   ('Üye İlişkileri','birim','#534AB7',ARRAY['yk_baskani','calisan'],ARRAY['Üye Sicil','Başvurular'],'<ADMIN_USER_ID>'),
--   ('Basın Birimi','birim','#993556',ARRAY['yk_baskani','calisan'],ARRAY['Bültenler','Sosyal Medya'],'<ADMIN_USER_ID>'),
--   ('Temsilcilikler','temsilcilik','#0F6E56',ARRAY['yk_baskani','temsilci'],ARRAY['İlçe Temsilcileri','Toplantılar'],'<ADMIN_USER_ID>');
