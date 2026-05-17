-- ────────────────────────────────────────────────────────────────
-- 012_messages.sql  —  Mesajlaşma sistemi
-- ────────────────────────────────────────────────────────────────

-- notifications.workspace_id null olabilsin (mesaj bildirimleri için)
ALTER TABLE public.notifications ALTER COLUMN workspace_id DROP NOT NULL;

-- ── Mesajlar tablosu ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.messages (
  id           uuid        DEFAULT gen_random_uuid() PRIMARY KEY,
  sender_id    uuid        NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  content      text        NOT NULL CHECK (length(trim(content)) > 0),
  type         text        NOT NULL DEFAULT 'public'
                           CHECK (type IN ('public', 'dm', 'topic')),
  recipient_id uuid        REFERENCES public.profiles(id) ON DELETE CASCADE,
  topic        text,
  created_at   timestamptz DEFAULT now() NOT NULL,

  CONSTRAINT dm_needs_recipient  CHECK (type != 'dm'    OR recipient_id IS NOT NULL),
  CONSTRAINT topic_needs_topic   CHECK (type != 'topic' OR (topic IS NOT NULL AND topic != ''))
);

ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;

-- Herkese açık & konu mesajlarını tüm giriş yapmış kullanıcılar görebilir
-- DM'leri yalnızca gönderen veya alıcı görebilir
CREATE POLICY "messages_select" ON public.messages FOR SELECT TO authenticated
  USING (
    type IN ('public', 'topic')
    OR (type = 'dm' AND (sender_id = auth.uid() OR recipient_id = auth.uid()))
  );

CREATE POLICY "messages_insert" ON public.messages FOR INSERT TO authenticated
  WITH CHECK (sender_id = auth.uid());

-- Kendi mesajını silebilir
CREATE POLICY "messages_delete" ON public.messages FOR DELETE TO authenticated
  USING (sender_id = auth.uid());

ALTER PUBLICATION supabase_realtime ADD TABLE public.messages;

-- ── Konu abonelikleri tablosu ────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.topic_subscriptions (
  user_id    uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  topic      text NOT NULL,
  created_at timestamptz DEFAULT now() NOT NULL,
  PRIMARY KEY (user_id, topic)
);

ALTER TABLE public.topic_subscriptions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "topic_subs_all" ON public.topic_subscriptions FOR ALL TO authenticated
  USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());
