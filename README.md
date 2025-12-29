# SpendWise - Kişisel Gelir/Gider Takip Uygulaması

SpendWise, kullanıcıların finansal durumlarını kontrol altına almalarına yardımcı olmak için tasarlanmış modern, kullanıcı dostu ve kapsamlı bir E-Cüzdan uygulamasıdır. Gelir ve giderlerinizi takip edebilir, bütçe planlamaları yapabilir ve detaylı raporlarla harcama alışkanlıklarınızı analiz edebilirsiniz.

## 🎯 Projenin Amacı

Bu uygulamanın temel amacı, kullanıcıların finansal farkındalığını artırmak ve bütçe yönetimini kolaylaştırmaktır. Kullanıcılar SpendWise sayesinde:
- Tüm gelir ve giderlerini tek bir yerden takip edebilir.
- Kategori bazlı harcama limitleri belirleyerek bütçelerine sadık kalabilir.
- Takvim ve grafikler üzerinden finansal geçmişlerini görselleştirebilir.
- Kredi kartı harcamalarını ve ödemelerini düzenli bir şekilde yönetebilir.

## 🛠️ Kullanılan Teknolojiler

Bu proje, modern web geliştirme standartlarına uygun olarak, performans ve kullanıcı deneyimi ön planda tutularak geliştirilmiştir.

### Diller
- **JavaScript**: Uygulama mantığı ve dinamik özellikler için.
- **HTML5**: Semantik yapılandırma için.
- **CSS3**: Özelleştirilmiş stiller ve animasyonlar için.

### Framework ve Kütüphaneler
- **React**: Kullanıcı arayüzü (UI) geliştirme kütüphanesi.
- **Vite**: Hızlı geliştirme ve build aracı.
- **Tailwind CSS**: Hızlı ve modern arayüz tasarımı için utility-first CSS çatısı.
- **Firebase**: Backend servisi (Authentication ve Firestore veritabanı).
- **React Router DOM**: Sayfalar arası geçiş ve yönlendirme yönetimi.
- **Recharts**: Veri görselleştirme ve grafikler.
- **Lucide React**: Modern ve tutarlı ikon seti.
- **Date-fns**: Tarih ve zaman işlemleri.
- **React Calendar**: Takvim bileşeni.

## 📦 Modüller ve Özellikler

Uygulama aşağıdaki temel modüllerden oluşmaktadır:

1.  **Kimlik Doğrulama (Auth)**
    *   Güvenli kullanıcı girişi ve yeni kullanıcı kaydı (Firebase Auth).
    
2.  **Dashboard (Gösterge Paneli)**
    *   Toplam bakiye, gelir ve gider özeti.
    *   Son işlemler listesi.
    *   Hızlı işlem ekleme ve görünütüleme.

3.  **Bütçe Yönetimi**
    *   Kategorilere göre aylık bütçe tanımlama.
    *   Bütçe aşım uyarıları ve ilerleme çubukları.

4.  **Raporlar ve Analizler**
    *   Gelir ve giderlerin detaylı grafiksel dağılımı.
    *   Kredi kartı bazlı harcama raporları.
    *   Zaman içindeki finansal trendler.

5.  **Takvim Görünümü**
    *   Günlük bazda yapılan harcama ve gelirlerin takvim üzerinde görüntülenmesi.

6.  **Ayarlar ve Kart Yönetimi**
    *   Kullanıcı tercihleri.
    *   Kredi kartı ekleme, düzenleme ve silme işlemleri.

## 🤖 Geliştirici Hakkında (Antigravity)

Bu proje, Google Deepmind ekibi tarafından geliştirilen, gelişmiş bir yapay zeka kodlama asistanı olan **Antigravity** ile pair programming yapılarak hayata geçirilmiştir.

**Antigravity**, karmaşık kodlama görevlerini çözme, modern web mimarileri tasarlama ve kullanıcılara en iyi "best practice" yöntemleriyle rehberlik etme konusunda uzmanlaşmış bir AI ajanıdır. SpendWise projesinde, projenin sıfırdan kurulumundan, veritabanı yapısının tasarımına, UI/UX kararlarından karmaşık bileşenlerin kodlanmasına kadar tüm süreçlerde aktif rol oynamıştır.

---

## 🚀 Kurulum

Projeyi yerel ortamınızda çalıştırmak için:

1.  Repoyu klonlayın.
2.  Gerekli paketleri yükleyin:
    ```bash
    npm install
    ```
3.  Geliştirme sunucusunu başlatın:
    ```bash
    npm run dev
    ```

---
*SpendWise ile finansal özgürlüğünüze bir adım daha yaklaşın!*
