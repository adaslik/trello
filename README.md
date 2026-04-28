# 🏛 Meslek Odası — Görev Yönetim Sistemi

Next.js 14 + Supabase + Vercel ile tam özellikli görev yönetim platformu.

## Özellikler

- ✅ E-posta/şifre ve Google OAuth girişi
- ✅ Çalışma alanı bazlı erişim kontrolü (YK, Komisyon, Temsilci, Birimler)
- ✅ Kanban, Gantt ve Takvim görünümleri
- ✅ Sürükle-bırak görev yönetimi
- ✅ 10 özelleştirilebilir renkli etiket (per workspace)
- ✅ Görev detay modalı (açıklama, etiket, Google Drive, yorumlar)
- ✅ Gerçek zamanlı güncelleme (Supabase Realtime)
- ✅ Bildirim sistemi
- ✅ Rol bazlı erişim (Row Level Security)

---

## 🚀 Kurulum — Adım Adım

### 1. Supabase Projesi Oluşturun

1. [supabase.com](https://supabase.com) adresine gidin → **New Project**
2. Proje adı: `meslek-odasi` (istediğinizi yazabilirsiniz)
3. Proje oluşturulduktan sonra **Settings → API** bölümüne gidin
4. `Project URL` ve `anon public` key'i kopyalayın

### 2. Veritabanı Şemasını Uygulayın

Supabase Dashboard → **SQL Editor** → **New query** açın.

`supabase/migrations/001_initial_schema.sql` dosyasının tüm içeriğini yapıştırıp **Run** butonuna basın.

### 3. Google OAuth Ayarlayın (İsteğe Bağlı)

Supabase Dashboard → **Authentication → Providers → Google**:
1. Google Cloud Console'dan OAuth Client ID ve Secret alın
2. Callback URL: `https://PROJE_ID.supabase.co/auth/v1/callback`
3. Supabase'e yapıştırıp kaydedin

### 4. Projeyi Klonlayın ve Bağımlılıkları Yükleyin

```bash
git clone https://github.com/sizin-repo/meslek-odasi.git
cd meslek-odasi
npm install
```

### 5. Environment Variables Ayarlayın

```bash
cp .env.local.example .env.local
```

`.env.local` dosyasını açın ve Supabase değerlerini doldurun:

```env
NEXT_PUBLIC_SUPABASE_URL=https://PROJE_ID.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...
```

### 6. Geliştirme Sunucusunu Başlatın

```bash
npm run dev
```

[http://localhost:3000](http://localhost:3000) adresini açın.

### 7. İlk Admin Hesabını Oluşturun

1. Kayıt sayfasından hesap açın
2. Supabase Dashboard → **Table Editor → profiles** tablosunu açın
3. Kullanıcınızın `role` sütununu `yk_baskani` olarak güncelleyin
4. Sayfayı yenileyin — tüm çalışma alanlarına erişim açılacak

### 8. Seed Çalışma Alanları Oluşturun

`001_initial_schema.sql` dosyasının altındaki `SEED` bölümündeki yorumu kaldırın,
`<ADMIN_USER_ID>` yerine admin kullanıcının UUID'sini yazın ve SQL Editor'da çalıştırın.

---

## 🌐 Vercel'e Deploy

```bash
npm install -g vercel
vercel
```

Vercel sorarsa:
- Framework: **Next.js**
- Build command: `npm run build`
- Output: `.next`

Ardından Vercel Dashboard → **Project → Settings → Environment Variables** bölümüne
`.env.local` içindeki değerleri ekleyin.

---

## 👥 Rol Sistemi

| Rol | Erişim |
|-----|--------|
| `yk_baskani` | Tüm çalışma alanları, tam yetki |
| `yk_uyesi` | Tüm çalışma alanları, düzenleme |
| `komisyon_baskani` | YK + komisyon alanları |
| `calisan` | Atandığı birim alanları |
| `temsilci` | Temsilcilik alanı |

Profil rolleri Supabase Table Editor veya admin panelinden değiştirilebilir.

---

## 📁 Proje Yapısı

```
src/
├── app/             # Next.js App Router
├── components/
│   ├── Auth/        # Giriş sayfası
│   ├── Board/       # Kanban
│   ├── Calendar/    # Takvim
│   ├── Gantt/       # Gantt
│   ├── Layout/      # Sidebar
│   └── Task/        # Görev modalı
├── hooks/           # useAuth, useWorkspaces, useTasks
├── lib/             # Supabase client, sabitler
├── pages/           # Dashboard
└── types/           # TypeScript tipleri
```
