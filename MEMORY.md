# Haber Odası Notları

- Sahne prosedürel Babylon meshleri kullanır; haricî GLB modeli gerekmez. WebGL meshlerinin görünmediği istemcilerde, aynı masa/baş yorumcu/kobolt kompozisyonunu sunan hareketli CSS sahne katmanı görünür kalır.
- Referans görsel yalnızca arka duvar haritası/dokusu için kullanılır; büyük medya dosyası proje dizinine konmaz.
- Koboltlar bilgi notu taşır, ancak her not metni React katmanında erişilebilir olarak sunulur.
- Gerçek ödül verisi gelene kadar sahne araştırma/kilit durumunu temsil eder; sahte madalya veya baraj verisi üretmez.
- Altı bağımsız oda sürümü `/haber-odalari/:sectorId` altında çalışır. Oda notu; o yorumcunun gerçek araştırma günlüğü, hata dersi veya kilitli tahmin gerekçesinden güvenli şablonla üretilir; haricî haber veya ödül uydurmaz.
- Three.js motoru yalnızca oda sayfası açıldığında yüklenir. WebGL ortamı çalışmazsa CSS görünür sahne katmanı masa, baş yorumcu ve koboltları temsil etmeyi sürdürür.
