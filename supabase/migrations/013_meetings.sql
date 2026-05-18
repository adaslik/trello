-- ────────────────────────────────────────────────────────────────
-- 013_meetings.sql  —  YK Toplantı Yönetim Sistemi
-- ────────────────────────────────────────────────────────────────

-- ── YK üyesi kontrolü ────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.is_yk_member()
RETURNS BOOLEAN LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  RETURN (SELECT role FROM public.profiles WHERE id = auth.uid())
    IN ('yk_baskani','yk_baskan_vekili','yk_sekreteri','yk_it_sorumlusu','yk_saymani','yk_uyesi');
END;
$$;

-- ── Toplantılar ───────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.meetings (
  id             UUID        DEFAULT gen_random_uuid() PRIMARY KEY,
  meeting_number INTEGER     NOT NULL,
  title          TEXT        NOT NULL DEFAULT 'YK Olağan Toplantısı',
  date           DATE        NOT NULL,
  start_time     TIME,
  end_time       TIME,
  location       TEXT        NOT NULL DEFAULT 'Oda Toplantı Salonu',
  status         TEXT        NOT NULL DEFAULT 'taslak'
                             CHECK (status IN ('taslak','aktif','tamamlandi')),
  decision_text  TEXT,
  created_by     UUID        REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at     TIMESTAMPTZ DEFAULT now() NOT NULL
);

ALTER TABLE public.meetings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "meetings_select" ON public.meetings FOR SELECT TO authenticated
  USING (public.is_yk_member());

CREATE POLICY "meetings_insert" ON public.meetings FOR INSERT TO authenticated
  WITH CHECK (
    (SELECT role FROM public.profiles WHERE id = auth.uid())
      IN ('yk_baskani','yk_baskan_vekili','yk_sekreteri','yk_it_sorumlusu')
  );

CREATE POLICY "meetings_update" ON public.meetings FOR UPDATE TO authenticated
  USING (
    (SELECT role FROM public.profiles WHERE id = auth.uid())
      IN ('yk_baskani','yk_baskan_vekili','yk_sekreteri','yk_it_sorumlusu')
  );

CREATE POLICY "meetings_delete" ON public.meetings FOR DELETE TO authenticated
  USING (
    (SELECT role FROM public.profiles WHERE id = auth.uid())
      IN ('yk_baskani','yk_it_sorumlusu')
  );

-- ── Yoklama ───────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.meeting_attendance (
  id          UUID        DEFAULT gen_random_uuid() PRIMARY KEY,
  meeting_id  UUID        NOT NULL REFERENCES public.meetings(id) ON DELETE CASCADE,
  profile_id  UUID        NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  status      TEXT        NOT NULL DEFAULT 'katilmadi'
                          CHECK (status IN ('katildi','katilmadi','mazeretli','gecikti')),
  notes       TEXT,
  updated_at  TIMESTAMPTZ DEFAULT now() NOT NULL,
  UNIQUE (meeting_id, profile_id)
);

ALTER TABLE public.meeting_attendance ENABLE ROW LEVEL SECURITY;

CREATE POLICY "attendance_select" ON public.meeting_attendance FOR SELECT TO authenticated
  USING (public.is_yk_member());

CREATE POLICY "attendance_insert" ON public.meeting_attendance FOR INSERT TO authenticated
  WITH CHECK (public.is_yk_member());

CREATE POLICY "attendance_update" ON public.meeting_attendance FOR UPDATE TO authenticated
  USING (public.is_yk_member());

-- ── Gündem maddeleri ──────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.meeting_agenda_items (
  id          UUID        DEFAULT gen_random_uuid() PRIMARY KEY,
  meeting_id  UUID        NOT NULL REFERENCES public.meetings(id) ON DELETE CASCADE,
  order_num   INTEGER     NOT NULL,
  title       TEXT        NOT NULL,
  notes       TEXT,
  is_fixed    BOOLEAN     NOT NULL DEFAULT true,
  status      TEXT        NOT NULL DEFAULT 'bekleyen'
                          CHECK (status IN ('bekleyen','tamamlandi','ertelendi')),
  created_at  TIMESTAMPTZ DEFAULT now() NOT NULL,
  UNIQUE (meeting_id, order_num)
);

ALTER TABLE public.meeting_agenda_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "agenda_select" ON public.meeting_agenda_items FOR SELECT TO authenticated
  USING (public.is_yk_member());

CREATE POLICY "agenda_insert" ON public.meeting_agenda_items FOR INSERT TO authenticated
  WITH CHECK (public.is_yk_member());

CREATE POLICY "agenda_update" ON public.meeting_agenda_items FOR UPDATE TO authenticated
  USING (public.is_yk_member());

-- ── Toplantı–Görev bağlantı tablosu ──────────────────────────────
-- Mevcut tasks tablosunu bozmadan toplantıda doğan görevleri izler
CREATE TABLE IF NOT EXISTS public.meeting_tasks (
  meeting_id     UUID NOT NULL REFERENCES public.meetings(id) ON DELETE CASCADE,
  task_id        UUID NOT NULL REFERENCES public.tasks(id)    ON DELETE CASCADE,
  agenda_item_id UUID REFERENCES public.meeting_agenda_items(id) ON DELETE SET NULL,
  created_at     TIMESTAMPTZ DEFAULT now() NOT NULL,
  PRIMARY KEY (meeting_id, task_id)
);

ALTER TABLE public.meeting_tasks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "meeting_tasks_select" ON public.meeting_tasks FOR SELECT TO authenticated
  USING (public.is_yk_member());

CREATE POLICY "meeting_tasks_insert" ON public.meeting_tasks FOR INSERT TO authenticated
  WITH CHECK (public.is_yk_member());

CREATE POLICY "meeting_tasks_delete" ON public.meeting_tasks FOR DELETE TO authenticated
  USING (public.is_yk_member());

-- ── Yeni toplantı açılınca 9 sabit gündem maddesini otomatik oluştur
CREATE OR REPLACE FUNCTION public.create_default_agenda_items()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  INSERT INTO public.meeting_agenda_items (meeting_id, order_num, title, is_fixed) VALUES
    (NEW.id, 1, 'Önceki Toplantıdan Kalan Gündemler',             true),
    (NEW.id, 2, 'Haftalık Şube Çalışmaları',                      true),
    (NEW.id, 3, 'Oda Genel Merkezinden Gelen Kararlar',           true),
    (NEW.id, 4, 'Haftalık Temsilcilik ve Çalışmaları Kararları',  true),
    (NEW.id, 5, 'Haftalık Komisyon Çalışmaları ve Kararları',     true),
    (NEW.id, 6, 'Haftalık Mali Durum',                            true),
    (NEW.id, 7, 'TMMOB İKK ve Kocaeli ÇEP Çalışmaları',          true),
    (NEW.id, 8, 'İşyeri Temsilcileri Çalışmaları',                true),
    (NEW.id, 9, 'Serbest Gündem Maddeleri',                       true);
  RETURN NEW;
END;
$$;

CREATE OR REPLACE TRIGGER on_meeting_created
  AFTER INSERT ON public.meetings
  FOR EACH ROW EXECUTE FUNCTION public.create_default_agenda_items();

-- ── Realtime ──────────────────────────────────────────────────────
ALTER PUBLICATION supabase_realtime ADD TABLE public.meetings;
ALTER PUBLICATION supabase_realtime ADD TABLE public.meeting_attendance;
ALTER PUBLICATION supabase_realtime ADD TABLE public.meeting_agenda_items;
