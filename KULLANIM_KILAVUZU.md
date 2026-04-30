# Meslek Odası — Kullanım Kılavuzu

## İçindekiler

1. [Genel Bakış](#genel-bakış)
2. [Giriş ve Hesap İşlemleri](#giriş-ve-hesap-i̇şlemleri)
3. [Kullanıcı Rolleri ve Yetkiler](#kullanıcı-rolleri-ve-yetkiler)
4. [Çalışma Alanları (Workspace)](#çalışma-alanları-workspace)
5. [Görevler](#görevler)
6. [Görünümler](#görünümler)
7. [Bildirimler](#bildirimler)
8. [Sık Sorulan Sorular](#sık-sorulan-sorular)

---

## Genel Bakış

Meslek Odası, kurum içi görev yönetimi ve iş takibi için tasarlanmış bir web uygulamasıdır. Çalışma alanları (workspace) üzerinden organize edilen görevleri Kanban panosu, Gantt şeması veya Takvim görünümünde takip edebilir; ekip üyeleriyle anlık olarak iş birliği yapabilirsiniz.

**Temel kavramlar:**

- **Çalışma Alanı:** Bir birimin, komisyonun veya temsilciliğin görev tahtası.
- **Görev:** Çalışma alanı içindeki yapılacak iş birimi.
- **Pano:** Çalışma alanı içinde görevleri gruplamak için kullanılan alt bölüm (ör. "Toplantılar", "Kararlar").

---

## Giriş ve Hesap İşlemleri

### Giriş Yapma

Uygulamaya üç farklı yöntemle giriş yapabilirsiniz:

| Yöntem | Nasıl? |
|--------|--------|
| E-posta / Şifre | "Giriş Yap" sekmesinde e-posta ve şifrenizi girin. |
| Google ile Giriş | "Google ile devam et" butonuna tıklayın. |
| GitHub ile Giriş | "GitHub ile devam et" butonuna tıklayın. |

### Yeni Hesap Oluşturma

1. Giriş ekranında **"Kayıt Ol"** sekmesine geçin.
2. Adınızı, soyadınızı, e-posta adresinizi ve şifrenizi girin.
3. **"Kayıt Ol"** butonuna tıklayın.
4. Hesabınız oluşturulur; rolünüz sistem yöneticisi tarafından atanır.

### Şifremi Unuttum

1. Giriş ekranında **"Şifremi unuttum"** bağlantısına tıklayın.
2. Kayıtlı e-posta adresinizi girin.
3. Gelen kutunuzdaki sıfırlama bağlantısına tıklayarak yeni şifrenizi belirleyin.

### Çıkış Yapma

Sol kenar çubuğunun (sidebar) en altındaki **"Çıkış Yap"** butonuna tıklayın.

---

## Kullanıcı Rolleri ve Yetkiler

Sistemde beş farklı kullanıcı rolü bulunmaktadır:

| Rol | Açıklama | Workspace Oluşturma | Workspace Silme | Görev Yönetimi |
|-----|----------|:-------------------:|:---------------:|:--------------:|
| **YK Başkanı** | Tam yönetici erişimi | ✓ | ✓ | ✓ |
| **YK Üyesi** | Yönetim seviyesi | ✓ | — | ✓ |
| **Komisyon Başkanı** | Komisyon yöneticisi | — | — | Erişim varsa ✓ |
| **Çalışan** | Standart kullanıcı | — | — | Erişim varsa ✓ |
| **Temsilci** | Sınırlı erişim | — | — | Erişim varsa ✓ |

> **Not:** YK Başkanı, erişim ayarlarından bağımsız olarak tüm çalışma alanlarına girebilir ve düzenleyebilir.

---

## Çalışma Alanları (Workspace)

### Sidebar Navigasyonu

Sol kenar çubuğunda çalışma alanları dört kategoriye ayrılmış olarak listelenir:

- **YÖNETİM** — Yönetim Kurulu'na ait alanlar
- **KOMİSYONLAR** — Komisyon bazlı çalışma alanları
- **TEMSİLCİLİKLER** — Temsilcilik alanları
- **BİRİMLER** — Departman/birim alanları

Bir çalışma alanına gitmek için sidebar'daki adına tıklayın. Okunmamış bildirim varsa adın yanında kırmızı rozet görünür.

### Yeni Çalışma Alanı Oluşturma *(YK Başkanı / YK Üyesi)*

1. Sol sidebar'ın altındaki **"+ Yeni Workspace"** butonuna tıklayın.
2. Açılan formda şunları doldurun:
   - **Ad:** Çalışma alanının adı (ör. "Hukuk Komisyonu")
   - **Kategori:** YÖNETİM, Komisyon, Temsilcilik veya Birim
   - **Renk:** 10 renk seçeneğinden birini seçin
   - **Panolar:** Virgülle ayrılmış panel adları (ör. "Toplantılar, Kararlar, Bütçe")
   - **Erişim Rolleri:** Bu alana erişebilecek roller
3. **Kaydet** butonuna tıklayın.

### Çalışma Alanını Düzenleme / Silme *(YK Başkanı)*

1. Sol sidebar'ın altındaki **"Yönet"** butonuna tıklayın.
2. Listeden ilgili workspace'i bulun.
3. Düzenlemek için **kalem** ikonuna, silmek için **çöp kutusu** ikonuna tıklayın.

> **Uyarı:** Silinen çalışma alanı ve içindeki tüm görevler kalıcı olarak silinir.

---

## Görevler

### Yeni Görev Oluşturma

Bir çalışma alanı açıkken görev eklemek için:

- Kanban görünümündeki herhangi bir sütunun altındaki **"+ Görev ekle"** butonuna, veya
- Üst araç çubuğundaki **"Görev"** butonuna tıklayın.

### Görev Alanları

| Alan | Açıklama |
|------|----------|
| **Başlık** | Görevin adı (zorunlu) |
| **Açıklama** | Detaylı görev tanımı |
| **Durum** | Bekleyen / Devam Ediyor / İncelemede / Tamamlandı (veya özel durum) |
| **Öncelik** | Düşük / Orta / Yüksek / Acil |
| **Sorumlu** | Görevi üstlenen kullanıcı |
| **Başlangıç Tarihi** | Görevin başlama tarihi |
| **Bitiş Tarihi** | Görevin son tarihi |
| **Etiketler** | Workspace'e özgü renkli etiketler (en fazla 10) |
| **Drive Bağlantıları** | Google Drive dosya bağlantıları (ad + URL) |
| **Yorumlar** | Ekip içi mesajlaşma ve notlar |

### Kapak Görseli

Görev modalında üst kısımda görünen kapak:

- **Varsayılan:** 4 farklı SVG deseni arasından seçim yapılır (yenile butonuyla değiştirin).
- **Özel Görsel:** "Resmi Değiştir" butonuyla bilgisayarınızdan fotoğraf yükleyin.
- Görseli kaldırmak için **"Resmi Kaldır"** butonuna tıklayın.

### Görev Düzenleme

Herhangi bir görev kartına tıkladığınızda detay modalı açılır. Değişikliklerinizi yapıp **"Kaydet"** butonuna basın.

### Görev Silme

Görev modalının alt kısmındaki kırmızı **"Görevi sil"** butonuna tıklayın. Bu işlem geri alınamaz.

### Yorum Ekleme

1. Görev modalını açın.
2. Sol panelin alt kısmındaki yorum alanına mesajınızı yazın.
3. **Enter** tuşuna basın veya gönder butonuna tıklayın.

### Google Drive Bağlantısı Ekleme

1. Görev modalında **"Drive Bağlantıları"** bölümüne gidin.
2. Bağlantı adını ve Drive URL'ini girin.
3. **"+"** butonuna tıklayın.

### Etiket Yönetimi

- Görev modalındaki **Etiketler** bölümünden mevcut etiketleri seçin/kaldırın.
- Etiket adına tıklayarak etiketi yeniden adlandırabilirsiniz (bu değişiklik tüm workspace için geçerli olur).
- Her workspace'in 10 adede kadar özel etiketi olabilir; varsayılan etiketler: **Acil, Takip, Onay Bekliyor, Bilgi, Toplantı, Belge, Dış Paydaş, Yasal, Bütçe, Teknik**

---

## Görünümler

Çalışma alanı açıkken üst araç çubuğundaki ikonlarla görünüm arasında geçiş yapın.

---

### Ana Sayfa (Dashboard)

Uygulamaya giriş yaptığınızda açılan genel durum ekranıdır.

**İçerir:**
- Tamamlanma oranı (%)
- KPI Kartları: Toplam görev, tamamlanan, devam eden, gecikmiş görev sayısı
- Durum dağılımı: Her statüdeki görev sayısı ve ilerleme çubukları
- Workspace'lere göre özet (tamamlanma %, toplam görev, gecikmiş görev)
- Yaklaşan son tarihler (7 gün içinde)
- Son eklenen görevler
- Son bildirimler

---

### Kanban Görünümü

Görevleri sütunlar halinde kartlar şeklinde görüntüler. Sürükle-bırak ile görevleri farklı durumlara taşıyabilirsiniz.

**Varsayılan sütunlar:**

```
Bekleyen → Devam Ediyor → İncelemede → Tamamlandı
```

**Temel işlemler:**

| İşlem | Nasıl Yapılır? |
|-------|---------------|
| Görev taşıma | Kartın sağındaki tutma ikonundan sürükleyip istediğiniz sütuna bırakın |
| Sütun yeniden adlandırma | Sütun başlığına tıklayın (düzenleme yetkisi gerekir) |
| Yeni sütun ekleme | En sağdaki **"+ Sütun Ekle"** butonuna tıklayın |
| Sütun silme | Özel sütunun başlığındaki çöp kutusu ikonuna tıklayın |
| Görev oluşturma | Sütun altındaki **"+ Görev ekle"** butonuna tıklayın |

> **Not:** Varsayılan 4 sütun (Bekleyen, Devam Ediyor, İncelemede, Tamamlandı) silinemez; yalnızca eklenen özel sütunlar silinebilir.

---

### Gantt Görünümü

Görevleri başlangıç ve bitiş tarihlerine göre yatay zaman çizelgesinde gösterir.

**Gereksinim:** Görevlerin Gantt'ta görünebilmesi için hem **Başlangıç Tarihi** hem de **Bitiş Tarihi** girilmiş olmalıdır.

**Özellikler:**
- Bugünün tarihini gösteren kırmızı dikey çizgi
- Görev çubukları workspace rengiyle renklendirilir
- Geniş çubuklarda sorumlu kullanıcının baş harfleri görünür
- Bir göreve tıkladığınızda detay modalı açılır

---

### Takvim Görünümü

Görevleri aylık takvim üzerinde gösterir.

**Gereksinim:** Görevlerin takvimde görünmesi için hem **Başlangıç Tarihi** hem de **Bitiş Tarihi** girilmiş olmalıdır.

**Özellikler:**
- İleri/geri okları ile aylar arasında gezinin
- Bugünün tarihi mor/indigo renkle vurgulanır
- Her gün en fazla 3 görev gösterilir; fazlası **"+N daha"** olarak listelenir
- Görev rengi; ilk etiket renginden, etiket yoksa workspace renginden alınır
- Göreve tıklayarak detay modalı açılır

---

## Bildirimler

### Bildirim Paneli

- Üst sağ köşedeki **zil ikonu** bildirimleri açar.
- Okunmamış bildirim varsa zilin üzerinde kırmızı nokta belirir.
- Sidebar'da workspace adlarının yanında da okunmamış bildirim sayısı görünür.

### Bildirimlerle Çalışma

| İşlem | Nasıl Yapılır? |
|-------|---------------|
| Bildirimi görüntüleme | Bildirim panelinde ilgili satıra tıklayın; sizi o workspace'e yönlendirir |
| Tümünü okundu işaretleme | Panelin üstündeki **"Tümü okundu"** butonuna tıklayın |

> Başka bir kullanıcı sizin workspace'inizde görev oluşturduğunda veya güncellediğinde gerçek zamanlı bildirim alırsınız.

---

## Sık Sorulan Sorular

**Bir workspace'i göremiyorum, neden?**  
Rolünüzün veya kullanıcı hesabınızın o workspace'in erişim listesinde olması gerekir. YK Başkanı veya sistem yöneticinizle iletişime geçin.

**Kanban'da sütun adını değiştiremiyorum.**  
Workspace üzerinde düzenleme yetkiniz olması gerekir. Bu yetki yalnızca YK Başkanı, YK Üyesi ve workspace erişim rollerine dahil edilmiş kullanıcılarda bulunur.

**Görev Gantt veya Takvim görünümünde çıkmıyor.**  
Görevin hem "Başlangıç Tarihi" hem de "Bitiş Tarihi" alanları dolu olmalıdır. Görev modalını açıp bu alanları doldurun.

**Gerçek zamanlı güncelleme nedir?**  
Ekibinizden biri görev ekler/günceller/silerse, sayfayı yenilemeden değişiklikler otomatik olarak ekranınıza yansır.

**Silinen bir görevi geri alabilir miyim?**  
Hayır. Görev silme işlemi kalıcıdır ve geri alınamaz.

**Etiket rengini nasıl değiştirebilirim?**  
Etiket renkleri workspace oluşturulurken sisteme otomatik atanır. Renk değişikliği şu anda arayüzden yapılamamaktadır; veritabanı üzerinden güncellenebilir.

---

*Son güncelleme: Nisan 2026*
