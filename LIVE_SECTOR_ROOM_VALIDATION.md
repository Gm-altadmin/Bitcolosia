# Canlı Sektör Akışı — Tarayıcı Doğrulaması

**Doğrulama zamanı:** 12 Ağustos 2026  
**Doğrulanan rota:** `/haber-odalari/infrastructure?live=1`

Altyapı Odası’nda ana ekranla aynı CoinGecko canlı snapshot’ı başarıyla yüklendi. Sol akışta ETH, BNB, AVAX, MATIC/POL ve diğer sektör varlıkları; sağ akışta SOL, ADA, DOT, TRX ve diğer sektör varlıkları, USD fiyatları ile 24 saatlik değişim yüzdeleriyle gösterildi. SANG kaydı erişilemeyen sağlayıcı verisini `— / veri yok` biçiminde dürüstçe korudu.

Sol koboltun kâğıdında kaynak bağlantılı araştırma notu, sağ koboltun kâğıdında ise kilitli tahmin/öğrenme gerekçesi görüntülendi. Oda durumu `Tahmin kilitli` olarak gerçek yorumcu kaydından türetildi. Bu doğrulama, canlı varlık akışının oda görselinden bağımsız olarak gerçek araştırma ve yorumcu verisiyle aynı ekranda çalıştığını gösterir.

## Etkileşim doğrulaması

`/haber-odalari/infrastructure?interactions=1` rotasında üç sıralama denetimi (`Rapor sırası`, `En çok kazandıran`, `En çok kaybettiren`) görünür ve klavyeyle erişilebilir düğmeler olarak yüklendi. ETH, BNB, SOL ve ADA gibi canlı varlık satırları ayrıntı analizini açacak düğmeler olarak; iki kobolt kâğıdı ise canlı snapshot ve oda günlüğüne dayalı kısa özet eylemi olarak göründü. Bu denetimler, gerçek canlı fiyat ve 24 saatlik değişim satırları yüklendikten sonra doğrulandı.

## Oda içi analiz penceresi

`/haber-odalari/infrastructure?inline-modal=1` sayfasında ETH satırına tıklanınca oda içinde yüksek katmanlı erişilebilir analiz penceresi açıldı. Pencere, gerçek snapshot’tan **$1.888,32** son fiyatı, **+0,70%** 24 saatlik değişimi, güncelleme saatini ve sağlayıcı fiyat noktalarından oluşturulmuş sparkline grafiğini gösterdi. Radix portal katmanıyla görünmeyen önceki uygulama, oda içinde render edilen modal ile değiştirildi; kapatma düğmesi görünür ve erişilebilir durumdadır.

## Yapay zekâ kobolt özeti

Sol koboltun kaynak notuna tıklanınca oda içi özet penceresi açıldı. Sunucu, canlı altyapı snapshot’ı ile Solana resmî kapasite artışı notunu kullanarak tarafsız Türkçe piyasa özeti üretti; ETH, SOL, LINK, NEAR, ALGO, ADA, APT ve STX için anlık değişimleri veri olarak açıkladı. Özet, yatırım tavsiyesi olmadığını açıkça belirtiyor ve kaynak notunun URL’sine erişim sağlıyor. JSON şeması kuralına uymayan fakat geçerli Türkçe model metinleri de güvenli şekilde kısa özet biçimine dönüştürülüyor.
