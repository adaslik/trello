-- =============================================
-- Katılma İsteği Sistemi
-- =============================================

-- Katılma istekleri tablosu
CREATE TABLE IF NOT EXISTS public.join_requests (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  email         TEXT NOT NULL,
  full_name     TEXT NOT NULL,
  message       TEXT DEFAULT '',
  status        TEXT NOT NULL DEFAULT 'pending'
                CHECK (status IN ('pending', 'approved', 'rejected')),
  requested_at  TIMESTAMPTZ DEFAULT NOW(),
  processed_by  UUID REFERENCES public.profiles(id),
  processed_at  TIMESTAMPTZ
);

ALTER TABLE public.join_requests ENABLE ROW LEVEL SECURITY;

-- Herkes görebilir ve oluşturabilir
CREATE POLICY "join_requests_select" ON public.join_requests
  FOR SELECT USING (true);

CREATE POLICY "join_requests_insert" ON public.join_requests
  FOR INSERT WITH CHECK (true);

-- Sadece YK başkanı onaylayabilir/reddedebilir
CREATE POLICY "join_requests_update" ON public.join_requests
  FOR UPDATE USING (
    EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.role = 'yk_baskani')
  );

-- Realtime ekle
ALTER PUBLICATION supabase_realtime ADD TABLE public.join_requests;

-- =============================================
-- Storage: Avatar bucket
-- =============================================
INSERT INTO storage.buckets (id, name, public)
VALUES ('avatars', 'avatars', true)
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "avatars_select" ON storage.objects
  FOR SELECT USING (bucket_id = 'avatars');

CREATE POLICY "avatars_insert" ON storage.objects
  FOR INSERT WITH CHECK (bucket_id = 'avatars');

CREATE POLICY "avatars_update" ON storage.objects
  FOR UPDATE USING (bucket_id = 'avatars');

CREATE POLICY "avatars_delete" ON storage.objects
  FOR DELETE USING (bucket_id = 'avatars');