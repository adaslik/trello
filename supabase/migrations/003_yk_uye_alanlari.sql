-- =============================================
-- YK Üyesi Profil Alanları Ekleme
-- =============================================

-- Profiles tablosuna YK üyesi alanlarını ekle
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS sicil_no TEXT,
ADD COLUMN IF NOT EXISTS gorev TEXT,
ADD COLUMN IF NOT EXISTS dogum_tarihi DATE,
ADD COLUMN IF NOT EXISTS telefon TEXT,
ADD COLUMN IF NOT EXISTS sosyal_medya JSONB DEFAULT '{}'::JSONB,
ADD COLUMN IF NOT EXISTS web_sayfasi TEXT,
ADD COLUMN IF NOT EXISTS kimdir TEXT;

-- Mevcut profiller için güncelleme policy'si (profili kendisi güncelleyebilsin)
DROP POLICY IF EXISTS "profiles_update" ON public.profiles;

CREATE POLICY "profiles_update" ON public.profiles
  FOR UPDATE USING (auth.uid() = id);

-- YK başkanı tüm profilleri güncelleyebilsin
CREATE POLICY "profiles_update_by_yk" ON public.profiles
  FOR UPDATE USING (
    EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.role = 'yk_baskani')
  );