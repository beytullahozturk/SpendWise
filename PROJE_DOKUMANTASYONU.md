# 📘 SpendWise - Proje Dokümantasyonu

**Sürüm:** v1.1.0
**Oluşturulma Tarihi:** 01 Ocak 2026

## 1. Proje Özeti
**SpendWise**, bireysel kullanıcıların finansal durumlarını (gelir, gider, yatırım ve abonelikler) tek bir merkezden yönetmelerini sağlayan, modern web teknolojileri ile geliştirilmiş kapsamlı bir **Kişisel Finans ve E-Cüzdan** uygulamasıdır. Kullanıcı dostu arayüzü, mobil uyumluluğu ve gelişmiş analiz araçları ile finansal farkındalığı artırmayı hedefler.

---

## 2. Kullanılan Teknolojiler ve Diller

Proje geliştirilirken güncel front-end standartları ve sunucusuz (serverless) mimari tercih edilmiştir.

### 💻 Yazılım Dilleri
*   **JavaScript (ES6+):** Uygulamanın temel mantığı ve interaktivitesi.
*   **HTML5:** Anlamsal (semantic) iskelet yapısı.
*   **CSS3:** Stil ve görsel tasarım.

### 🛠️ Kütüphaneler ve Framework'ler
*   **React.js (v18):** Kullanıcı arayüzü (UI) oluşturmak için kullanılan ana kütüphane.
*   **Vite:** Hızlı geliştirme ortamı ve build (derleme) aracı.
*   **Tailwind CSS:** Hızlı, modern ve responsive stil tanımlamaları için (Utility-first CSS).
*   **React Router DOM:** Sayfa yönlendirmeleri ve navigasyon yönetimi (SPA mimarisi).
*   **Recharts:** Veri görselleştirme, pasta ve çizgi grafikler.
*   **Lucide React:** Modern, vektörel ikon seti.
*   **Date-fns:** Tarih formatlama ve hesaplama işlemleri.
*   **React Calendar:** Takvim bileşeni entegrasyonu.

### ☁️ Altyapı ve Servisler
*   **Firebase Authentication:** Güvenli kullanıcı kimlik doğrulama, kayıt ve e-posta doğrulama süreçleri.
*   **Firebase Firestore:** NoSQL tabanlı, gerçek zamanlı bulut veritabanı. Veriler her kullanıcıya özel (UID bazlı) saklanır.
*   **GitHub Pages:** Uygulamanın canlıya alınması (Deployment) ve hosting hizmeti.

---

## 3. Geliştirilen Modüller ve Özellikler

Uygulama, her biri belirli bir finansal ihtiyacı karşılayan 7 ana modülden oluşmaktadır:

### 🔐 A. Kimlik Doğrulama (Auth Modülü)
*   **Kayıt ve Giriş:** E-posta ve şifre ile güvenli giriş.
*   **E-posta Doğrulama:** Sahte hesapları önlemek için kayıt sonrası zorunlu mail aktivasyonu. Doğrulanmayan hesaplar uygulamaya erişemez.
*   **Güvenlik:** Kullanıcı oturumu kapandığında otomatik yönlendirme.

### 🏠 B. Dashboard (Ana Sayfa)
*   **Genel Bakış:** Toplam bakiye, anlık gelir/gider durumu ve finansal trend butonu.
*   **Son İşlemler:** Eklenen harcamaların listesi (filtreleme ve düzenleme/silme seçenekleriyle).
*   **Hızlı Ekleme:** Gelir veya gider kalemlerinin (nakit/kredi kartı seçimiyle) hızlıca sisteme girilmesi.
*   **Bildirim Merkezi:** Yaklaşan abonelik ödemeleri ve planlı harcamalar için akıllı uyarı sistemi (süre dolumuna 3 gün kala uyarı).
*   **CSV Dışa Aktar:** İşlem geçmişinin Excel/CSV formatında indirilmesi.

### 📅 C. Takvim (Calendar)
*   **Görsel Takip:** Ay görünümünde harcama yapılan veya ödeme planlanan günlerin işaretlenmesi.
*   **Planlı Ödemeler:** Tek seferlik veya tekrarlı (haftalık/aylık) ödemelerin ileriye dönük planlanması.
*   **Entegrasyon:** Aboneliklerin de takvim üzerinde otomatik olarak gösterilmesi.

### 📊 D. Bütçe Yönetimi (Budget)
*   **Kategori Bazlı Limit:** Her harcama kategorisi (Gıda, Ulaşım vb.) için aylık bütçe belirleme.
*   **İlerleme Çubukları:** Bütçenin ne kadarının harcandığını gösteren ve limit aşımında uyaran görsel barlar.

### ⚡ E. Abonelikler (Subscriptions)
*   **Servis Takibi:** Netflix, Spotify, Kira gibi düzenli ödemelerin yönetimi.
*   **Ön Tanımlı Servisler:** Popüler servisler için hazır logolar ve renkler.
*   **Şimdi Öde:** Abonelik gününde tek tuşla, verileri otomatik doldurarak aboneliği gidere dönüştürme ve mükerrer ödeme kontrolü.
*   **Hatırlatıcı:** Ödeme döngüsünün takip edilmesi ve Dashboard bildirimlerine yansıması.

### 💼 F. Portföy / Yatırım (Investments)
*   **Varlık Yönetimi:** Altın, Döviz (Dolar, Euro), Hisse Senedi ve Fon gibi varlıkların takibi (Kripto varlıklar kullanıcı tercihiyle kaldırıldı, sadece PAXG/Altın kaldı).
*   **İşlem Bazlı Takip (Yeni):** Varlıklar için "Alım" ve "Satım" işlemlerinin geçmişe dönük kaydedilmesi.
*   **Otomatik Maliyet Hesabı:** Alım işlemlerine göre ağırlıklı ortalama maliyetin (Weighted Average Cost) otomtatik güncellenmesi.
*   **Mobil Kart Görünümü:** Telefondan kolay takip için tablodan kart görünümüne geçiş yapan responsive yapı.
*   **Otomatik Piyasa Verisi:** Harici API'ler kullanılarak güncel kurların tek tuşla çekilmesi.

### 📈 G. Raporlar (Reports)
*   **Akıllı Rapor Analizi (AI):**
    *   **Yapay Zeka Özeti (Smart Narrative):** Finansal durumu doğal dille özetleyen ("Giderler %10 azaldı") dinamik metin alanı.
    *   **Anomali Dedektörü:** Normalin dışına çıkan ani harcama artışlarını tespit edip uyaran sistem.
    *   **İhtiyaç vs. İstek:** Harcamaların %50/30/20 kuralına göre "Zorunlu" ve "Keyfi" olarak analiz edilmesi.
    *   **Gelecek Tahmini:** Mevcut harcama hızıyla yıl sonu bakiye projeksiyonu.
*   **Detaylı Grafikler:** Gelir/Gider dağılımının zaman çizelgesi üzerinde analizi.

### ⚙️ H. Ayarlar (Settings)
*   **Kart Yönetimi:** Harcamalarda seçilmek üzere kredi kartlarının tanımlanması.
*   **Kişiselleştirme:** Özel gelir/gider kategorileri ekleme.
*   **Profil:** Şifre güncelleme ve tema (Karanlık/Aydınlık mod) ayarları.

---

## 4. UI/UX ve Tasarım Detayları
*   **Akıllı Finans Asistanı (Smart Insights):** Dashboard üzerinde kullanıcıya özel tasarruf önerileri, bütçe uyarıları ve abonelik analizleri sunan kaydırılabilir ipucu alanı.
*   **Mobil Uyumluluk (Responsive):** Uygulama hem masaüstü hem de mobil cihazlarda kusursuz çalışacak şekilde tasarlandı. Mobilde alt navigasyon barı, yatırım kartları ve gizlenebilir menüler eklendi.
*   **Karanlık Mod (Dark Mode):** Göz yormayan, sistem temasına duyarlı karanlık mod desteği.
*   **Modern Modal:** Kullanıcı etkileşimleri modern pop-up pencerelerle sağlandı.
*   **SEO ve Meta Veri:** "SpendWise - Akıllı Finans Asistanı" başlığı ve arama motorları için optimize edilmiş açıklamalar.

---

## 5. Gelecek Planları (Roadmap)
*   *Çoklu Dil Desteği (İngilizce/Almanca).*
*   *Banka API entegrasyonları (Open Banking).*
*   *Mobil Uygulama Paketi (Capacitor/React Native).*

Bu doküman, **SpendWise** projesinin geliştirme sürecini ve teknik detaylarını özetlemektedir.
