-- ────────────────────────────────────────────────────────────────
-- 014_meetings_it_sorumlusu.sql
-- yk_it_sorumlusu toplantılarda yk_baskani ile aynı yetkiler
-- ────────────────────────────────────────────────────────────────

DROP POLICY IF EXISTS "meetings_insert" ON public.meetings;
CREATE POLICY "meetings_insert" ON public.meetings FOR INSERT TO authenticated
  WITH CHECK (
    (SELECT role FROM public.profiles WHERE id = auth.uid())
      IN ('yk_baskani','yk_baskan_vekili','yk_sekreteri','yk_it_sorumlusu')
  );

DROP POLICY IF EXISTS "meetings_update" ON public.meetings;
CREATE POLICY "meetings_update" ON public.meetings FOR UPDATE TO authenticated
  USING (
    (SELECT role FROM public.profiles WHERE id = auth.uid())
      IN ('yk_baskani','yk_baskan_vekili','yk_sekreteri','yk_it_sorumlusu')
  );

DROP POLICY IF EXISTS "meetings_delete" ON public.meetings;
CREATE POLICY "meetings_delete" ON public.meetings FOR DELETE TO authenticated
  USING (
    (SELECT role FROM public.profiles WHERE id = auth.uid())
      IN ('yk_baskani','yk_it_sorumlusu')
  );
