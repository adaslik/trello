-- join_requests UPDATE policy'sini düzelt
-- YK üyesi de onaylayabilsin/reddedebilsin

DROP POLICY IF EXISTS "join_requests_update" ON public.join_requests;

CREATE POLICY "join_requests_update" ON public.join_requests
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid()
        AND p.role IN ('yk_baskani', 'yk_uyesi')
    )
  );
