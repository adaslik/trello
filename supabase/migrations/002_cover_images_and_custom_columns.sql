-- =============================================
-- 002: Cover images & custom Kanban columns
-- Supabase SQL Editor'a yapıştırıp çalıştırın
-- =============================================

-- 1) tasks tablosuna kapak resmi URL sütunu ekle
ALTER TABLE public.tasks
  ADD COLUMN IF NOT EXISTS cover_image_url TEXT;

-- 2) status sütunundaki CHECK kısıtını kaldır
--    (özel/custom sütunlar için serbest metin değerlerine izin ver)
ALTER TABLE public.tasks
  DROP CONSTRAINT IF EXISTS tasks_status_check;

-- =============================================
-- Supabase Storage kurulumu
-- Aşağıdaki adımları Supabase Dashboard'dan yapın:
--
-- 1. Storage > New bucket > "task-covers"
--    Public bucket: AÇIK
--
-- 2. Storage > task-covers > Policies > New policy:
--    Policy name : allow_public_read
--    Allowed operation : SELECT
--    Policy definition: true
--
-- 3. Storage > task-covers > Policies > New policy:
--    Policy name : allow_auth_upload
--    Allowed operation : INSERT
--    Policy definition: auth.role() = 'authenticated'
--
-- 4. Storage > task-covers > Policies > New policy:
--    Policy name : allow_auth_delete
--    Allowed operation : DELETE
--    Policy definition: auth.role() = 'authenticated'
-- =============================================
