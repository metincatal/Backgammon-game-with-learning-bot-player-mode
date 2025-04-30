# Tavla Oyunu - Ürün Gereksinimleri Dokümanı

## 1. Ürün Özeti
Modern web teknolojileri kullanılarak geliştirilecek, aynı cihaz üzerinden iki kişinin oynayabileceği klasik Türk tavlası oyunu.

## 2. Temel Özellikler

### 2.1 Oyun Tahtası
- 24 üçgen nokta (pip)
- Her oyuncu için 15 pul (siyah ve beyaz)
- Orta çubuk (bar)
- Zar atma alanı
- Puan göstergesi
- Mars ve kapı göstergesi

### 2.2 Oyun Mekaniği
- Başlangıç pozisyonları:
  - Beyaz: 24(2), 13(5), 8(3), 6(5)
  - Siyah: 1(2), 12(5), 17(3), 19(5)
- Zar atma sistemi
- Pul hareket mekanizması
- Kırık taş sistemi
- Toplama mekanizması

### 2.3 Kullanıcı Arayüzü
- Oyun başlatma ekranı
- Oyuncu sırası göstergesi
- Zar atma butonu
- Geçerli hamle göstergeleri
- Oyun sonu ekranı

## 3. Teknik Gereksinimler

### 3.1 Frontend Teknolojileri
- React.js
- TypeScript
- HTML5 Canvas/SVG (oyun tahtası için)
- CSS3 (animasyonlar ve stil için)

### 3.2 State Yönetimi
- Redux veya Context API
- Oyun durumu:
  - Aktif oyuncu
  - Pul pozisyonları
  - Zar değerleri
  - Kırık taşlar
  - Toplanan taşlar
  - Oyun skoru

### 3.3 Oyun Mantığı Sınıfları
- `GameBoard`: Tahta durumu ve oyun kuralları
- `Dice`: Zar atma mantığı
- `Move`: Hamle validasyonu
- `Player`: Oyuncu bilgileri
- `GameState`: Oyun durumu yönetimi

## 4. Kullanıcı Hikayeleri

### 4.1 Oyun Başlangıcı
- Kullanıcılar oyunu başlatabilir
- İlk oyuncu belirleme için zar atılır
- Pullar başlangıç pozisyonlarına yerleştirilir

### 4.2 Oyun Akışı
- Sırası gelen oyuncu zar atar
- Geçerli hamleler görsel olarak gösterilir
- Pullar tıklama ile hareket ettirilir
- Kırık taşlar otomatik olarak bara alınır
- Toplama fazında pullar dışarı çıkarılabilir

### 4.3 Oyun Sonu
- Kazanan oyuncu belirlenir
- Mars/Kapı durumu kontrol edilir
- Yeni oyun başlatma seçeneği sunulur

## 5. Geliştirme Fazları

### Faz 1: Temel Oyun
- Oyun tahtası tasarımı
- Temel pul hareketi
- Zar atma mekanizması

### Faz 2: Oyun Kuralları
- Hamle validasyonu
- Kırık taş sistemi
- Toplama kuralları

### Faz 3: Kullanıcı Deneyimi
- Animasyonlar
- Ses efektleri
- Hata mesajları
- Yardım sistemi

### Faz 4: Test ve Optimizasyon
- Oyun mantığı testleri
- Performans optimizasyonu
- Tarayıcı uyumluluğu

## 6. Gelecek Özellikler
- Online multiplayer desteği
- Yapay zeka rakip
- Oyun kaydetme/yükleme
- İstatistikler ve başarımlar
