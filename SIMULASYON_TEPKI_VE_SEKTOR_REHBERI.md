# BitColosİa — Veri Tepkisi, Denge Sınırı ve 100 Varlık Rehberi

**Tarih:** 12 Ağustos 2026  
**Kapsam:** Bu belge, gerçek kripto piyasa verisinin BitColosİa ekranına ve sanal parsel ekonomisine nasıl yansıdığını açıklar. BitColosİa’da gerçek alım-satım, cüzdan, para transferi veya yatırım önerisi bulunmaz.

> **Temel ayrım:** Piyasa fiyatları, 24 saatlik değişimler ve grafikler gerçek dünyadaki veri sağlayıcısından gelir. Parsel, litre ve ülke toplamları ise bu verileri yalnızca sinyal olarak kullanan **kurgusal** bir ekonomi katmanıdır.

## 1. Simülasyon gerçek dünya verilerine ne kadar sürede tepki verir?

Tepki iki ayrı katmanda gerçekleşir. Piyasa ekranı, fiyat görünürlüğü için kısa aralıklı bir güncelleme döngüsü kullanır; parsel ekonomisi ise her gün tek bir planlı değerleme yapar. Bu nedenle ekranda görülen fiyat ile sanal parsel değerinin değiştiği an aynı değildir.[1] [2]

| Katman | Ne değişir? | Hedef tepki ritmi | Gerçek dünyaya bağlılık |
|---|---|---:|---|
| **Canlı piyasa ekranı** | USD fiyatı, 24 saatlik değişim, piyasa yönü, sparkline | Arayüz 60 saniyede bir sorgular; sunucu aynı snapshot’ı 60 saniye önbellekte tutar | CoinGecko piyasa yanıtı |
| **“Şimdi güncelle” düğmesi** | Ekrandaki sorgular yeniden istenir | Anlık istek başlatır; ancak 60 saniyelik önbellek penceresindeyse aynı snapshot dönebilir | CoinGecko yanıtı ve önbellek yaşı |
| **Sanal parsel değeri** | Her vatandaşın litre karşılığı | Her gün **10:30 Europe/Istanbul** | O anda alınan fiyat ile önceki günlük referans fiyat |
| **Piyasa yönü** | “Yükseliş / Düşüş / Denge” etiketi | Yeni snapshot geldiğinde | Piyasa değeri ağırlıklı 24 saatlik değişim |

### 1.1 Canlı ekrandaki tepki

Uygulama, 98 benzersiz sağlayıcı kimliği için tek toplu piyasa isteği oluşturur. Bu istekte USD fiyatı, piyasa değeri, 24 saatlik değişim ve sağlayıcının 7 günlük fiyat serisi istenir; arayüz çizgisi için bu serinin son 24 geçerli noktası kullanılır.[1] Ekran sorguları her 60 saniyede bir yenilenir; sunucu da dış kaynağa gereksiz tekrar çağrıları azaltmak için son başarılı snapshot’ı 60 saniye saklar.[1] Dolayısıyla normal koşulda kullanıcı, bir piyasa bilgisinin uygulamaya **en fazla yaklaşık bir önbellek periyodu** sonra yansımasını bekler. Sağlayıcının kendi güncelleme gecikmesi bunun dışındadır.

Piyasa yönü, varlıkların basit yüzdelik ortalaması değildir. Uygun piyasa değeri bulunan kayıtların 24 saatlik yüzdelik değişimleri, piyasa değerleriyle ağırlıklandırılır. Ağırlıklı sonuç **+%0,25 üzerindeyse “Yükseliş”**, **-%0,25 altındaysa “Düşüş”**, aradaki değerlerde ise “Denge” görünür. Piyasa değeri verisi tamamen yoksa eşit ağırlıklı ortalama yalnızca yedek yöntem olarak kullanılır.[1]

### 1.2 Parsel ekonomisinin tepki zamanı

Sanal parseller dakika dakika güncellenmez. Günlük planlı iş, **10:30 Europe/Istanbul** saatinde, yani mevcut UTC+3 karşılığıyla **07:30 UTC** zamanında çalışacak şekilde yapılandırılmıştır.[2] [3] Bu iş şu adımları uygular:

1. O anki toplu piyasa snapshot’ını alır.
2. Her vatandaş varlığı için o anki USD fiyatı ile önceki gün saklanan referans USD fiyatını karşılaştırır.
3. Farkı 1 USD = 1 L kuralıyla litre farkına dönüştürür.
4. Bu farkı vatandaş başına ±10 L koridorunda sınırlar.
5. Sonucu 1.000 L sabit parsel tabanına ekler.
6. Güncel USD fiyatını ertesi günün karşılaştırma referansı olarak saklar.[2]

Bu nedenle, 10:30’dan hemen sonra oluşan bir piyasa hareketi, normalde bir sonraki sabah 10:30 değerlemesine kadar parsel değerine yansımaz. 10:30’dan hemen önceki hareket ise o günkü snapshot’a girerse aynı değerleme turunda etkili olur. Başka deyişle, parsel katmanında gerçek dünya verisine tepki gecikmesi **0 ila yaklaşık 24 saat** aralığındadır; günlük çalışma anındaki sağlayıcı gecikmesi buna eklenebilir.

> Günlük job aynı yerel tarih ve `10:30` anahtarı için idempotenttir: bir iş platform tarafından tekrar denenirse aynı günün parsellerini ikinci kez değerlemez.[2]

### 1.3 Önemli nüans: Değer birikimli değildir

Her parselin `baselineValueLitres` değeri 1.000 L olarak korunur. Günlük değer, bir önceki günün **parsel değerinden** değil, önceki günün **referans USD fiyatından** hesaplanır:[2]

```text
ham fark (L)       = yuvarla_0,001(güncel USD fiyatı − referans USD fiyatı)
uygulanan fark (L) = min(10, max(−10, ham fark))
güncel parsel (L)  = yuvarla_0,001(1.000 + uygulanan fark)
```

Bu tasarımda, örneğin bir varlık bugün +10 L tavana çarptı diye ertesi gün 1.010 L üzerinden tekrar artmaz. Ertesi gün yeniden 1.000 L taban ile yeni günlük fiyat farkı ölçülür. Bu, parsel değerlerini fiyatın mutlak büyüklüğüne veya geçmişteki sınırsız birikime bağlamaz.

## 2. ±10 L sınırı simülasyon dengesini nasıl korur?

Her vatandaşın parseli 1.000 L taban değeriyle başlar. ±10 L sınırı, bir vatandaşın tek günlük parsel hareketini en fazla **%1** ile sınırlar. Böylece Bitcoin, ETH veya küçük fiyatlı bir token gibi farklı nominal fiyat düzeyleri, ülke bütçesini tek bir günde kontrolsüz biçimde büyütemez veya küçültemez.[2]

| Ölçü | Hesap | Sonuç | Anlamı |
|---|---:|---:|---|
| Bir parsel için günlük azami hareket | 10 / 1.000 | **%1** | Vatandaş parseli 990–1.010 L koridorunda kalır. |
| 100 parsel için teorik günlük azami toplam hareket | 100 × 10 L | **±1.000 L** | 100.000 L başlangıç ülke bütçesinin teorik **%1’i**. |
| Mevcut 99 fiyat referanslı kapsamda azami toplam hareket | 99 × 10 L | **±990 L** | SANG için doğrulanmış canlı fiyat olmadığı için mevcut pratik tavan **%0,99**. |
| Mevcut pratik ülke alt–üst bandı | 100.000 ± 990 L | **99.010–100.990 L** | Tüm erişilebilir varlıklar aynı yönde tavan hareket yapsa bile oluşabilecek band. |

### 2.1 Neden fiyat yüzdesi değil, USD fiyat farkı kullanılıyor?

Parsel hesabı, 24 saatlik yüzde değişimden değil USD fiyat farkından beslenir. Örneğin $0,001’den $0,002’ye geçişte fark **+0,001 L**’dir; sonuç 1.000,001 L olur. Bu küçük fiyatlı varlıkların gerçek farkını korur, fakat güncel modelde başlangıç tabanı 1.000 L olduğundan parsel değeri doğrudan token fiyatının üstüne eklenmez.[2]

| Senaryo | Referans fiyat | Güncel fiyat | Ham fark | Uygulanan fark | Parsel sonucu |
|---|---:|---:|---:|---:|---:|
| Küçük fiyatlı varlık | $0,001 | $0,002 | +0,001 L | +0,001 L | **1.000,001 L** |
| Orta ölçekli günlük artış | $100,00 | $105,20 | +5,200 L | +5,200 L | **1.005,200 L** |
| Çok büyük artış | $40,00 | $75,00 | +35,000 L | **+10,000 L** | **1.010,000 L** |
| Büyük düşüş | $4,00 | $0,50 | −3,500 L | −3,500 L | **996,500 L** |
| Doğrulanmış fiyatı olmayan kayıt | — | — | — | 0 L etkisi | **1.000,000 L** |

Bu mekanizma **volatilite sönümleyicisi** gibi çalışır. Gerçek piyasadaki ani bir +%50 veya −%50 hareket, BitColosİa’da tek başına parseli ±10 L’den fazla değiştiremez. Ancak bu, gerçek dünyadaki fiyat hareketini yok saymak anlamına gelmez: ham fark ve 24 saatlik değişim bilgisi yine veri ekranında görünür; sadece oyun içi litre etkisi kural gereği sınırlandırılır.

### 2.2 Sektör düzeyinde denge etkisi

| Sektör | Parsel sayısı | Teorik günlük azami etkisi | Mevcut doğrulanmış fiyat kapsamı | Mevcut pratik azami etki |
|---|---:|---:|---:|---:|
| Sektör 1 | 1 | ±10 L | 1 / 1 | ±10 L |
| Sektör 2 | 34 | ±340 L | 33 / 34 | ±330 L |
| Sektör 3 | 15 | ±150 L | 15 / 15 | ±150 L |
| Sektör 4 | 20 | ±200 L | 20 / 20 | ±200 L |
| Sektör 5 | 15 | ±150 L | 15 / 15 | ±150 L |
| Sektör 6 | 15 | ±150 L | 15 / 15 | ±150 L |
| **Toplam** | **100** | **±1.000 L** | **99 / 100** | **±990 L** |

Bu dağılım nedeniyle, en yüksek tek sektör tavanı altyapı sektöründedir; bu durum daha çok vatandaş/parsel sayısından kaynaklanır, varlıkların gerçek piyasa değeri büyüklüğünden değil. Aynı varlık olan LINK’in raporda iki ayrı satırı bulunduğundan, biri Sektör 2’de, diğeri Sektör 4’te ayrı vatandaş/parsel olarak korunur. Bu iki parsel aynı sağlayıcı fiyat sinyalini alır, fakat rapor yapısına bağlı olarak iki farklı parsel olarak sayılır.[4] [5]

## 3. 100 varlığın altı sektör arasındaki dağılımı

Her rapor satırı BitColosİa’da bir vatandaş ve bir sanal parseli temsil eder. Toplam 100 satır; 100 vatandaş ve 100 parseldir. Dağılım rapor sırası bakımından 1, 34, 15, 20, 15 ve 15 şeklindedir.[4]

| Sektör | Uygulama kimliği | Rapor sıra aralığı | Vatandaş / parsel | Başlangıç toplamı |
|---|---|---:|---:|---:|
| **Sektör 1: Global Rezerv ve Dijital Altın** | `reserve` | 1 | 1 | 1.000 L |
| **Sektör 2: Altyapı, Akıllı Sözleşmeler ve Katman-1** | `infrastructure` | 2–35 | 34 | 34.000 L |
| **Sektör 3: Yapay Zekâ ve Gelecek Teknolojileri** | `frontier` | 36–50 | 15 | 15.000 L |
| **Sektör 4: Kurumsal Finans, RWA ve Likidite** | `liquidity` | 51–70 | 20 | 20.000 L |
| **Sektör 5: Depolama, Veri Güvenliği ve Gizlilik** | `archive` | 71–85 | 15 | 15.000 L |
| **Sektör 6: Küresel Topluluk, GameFi ve Kültür Varlıkları** | `commons` | 86–100 | 15 | 15.000 L |
| **Toplam** | — | 1–100 | **100** | **100.000 L** |

### Sektör 1 — Global Rezerv ve Dijital Altın

| Sıra | Sembol | Varlık | Canlı veri durumu |
|---:|---|---|---|
| 1 | BTC | Bitcoin | Kullanılabilir |

### Sektör 2 — Altyapı, Akıllı Sözleşmeler ve Katman-1

| Sıra | Sembol | Varlık | Canlı veri durumu |
|---:|---|---|---|
| 2 | ETH | Ethereum | Kullanılabilir |
| 3 | SOL | Solana | Kullanılabilir |
| 4 | BNB | BNB | Kullanılabilir |
| 5 | ADA | Cardano | Kullanılabilir |
| 6 | AVAX | Avalanche | Kullanılabilir |
| 7 | DOT | Polkadot | Kullanılabilir |
| 8 | MATIC / POL | Polygon | Kullanılabilir |
| 9 | TRX | TRON | Kullanılabilir |
| 10 | LINK | Chainlink | Kullanılabilir |
| 11 | TON | Toncoin | Kullanılabilir |
| 12 | NEAR | Near Protocol | Kullanılabilir |
| 13 | APT | Aptos | Kullanılabilir |
| 14 | SUI | Sui | Kullanılabilir |
| 15 | ALGO | Algorand | Kullanılabilir |
| 16 | ATOM | Cosmos | Kullanılabilir |
| 17 | ICP | Internet Computer | Kullanılabilir |
| 18 | HBAR | Hedera | Kullanılabilir |
| 19 | EGLD | MultiversX | Kullanılabilir |
| 20 | FTM | Fantom | Kullanılabilir |
| 21 | INJ | Injective | Kullanılabilir |
| 22 | SEI | Sei | Kullanılabilir |
| 23 | OP | Optimism | Kullanılabilir |
| 24 | ARB | Arbitrum | Kullanılabilir |
| 25 | IMX | Immutable X | Kullanılabilir |
| 26 | KAS | Kaspa | Kullanılabilir |
| 27 | STX | Stacks | Kullanılabilir |
| 28 | TIA | Celestia | Kullanılabilir |
| 29 | MINA | Mina Protocol | Kullanılabilir |
| 30 | SANG | Sango Coin | **Erişilemez; yanlış eşleşme yapılmadı** |
| 31 | CRO | Cronos | Kullanılabilir |
| 32 | VET | VeChain | Kullanılabilir |
| 33 | XLM | Stellar | Kullanılabilir |
| 34 | ASTR | Astar | Kullanılabilir |
| 35 | KAVA | Kava | Kullanılabilir |

### Sektör 3 — Yapay Zekâ ve Gelecek Teknolojileri

| Sıra | Sembol | Varlık | Canlı veri durumu |
|---:|---|---|---|
| 36 | FET | Artificial Superintelligence Alliance / Fetch.ai | Kullanılabilir |
| 37 | RNDR / RENDER | Render Network | Kullanılabilir |
| 38 | TAO | Bittensor | Kullanılabilir |
| 39 | GRT | The Graph | Kullanılabilir |
| 40 | AGIX | SingularityNET | Kullanılabilir |
| 41 | OCEAN | Ocean Protocol | Kullanılabilir |
| 42 | AKT | Akash Network | Kullanılabilir |
| 43 | WLD | Worldcoin | Kullanılabilir |
| 44 | ARKM | Arkham | Kullanılabilir |
| 45 | THETA | Theta Network | Kullanılabilir |
| 46 | GLM | Golem | Kullanılabilir |
| 47 | AIOZ | AIOZ Network | Kullanılabilir |
| 48 | PRIME | Echelon Prime | Kullanılabilir |
| 49 | NFP | NFPrompt | Kullanılabilir |
| 50 | AI | Sleepless AI | Kullanılabilir |

### Sektör 4 — Kurumsal Finans, RWA ve Likidite

| Sıra | Sembol | Varlık | Canlı veri durumu |
|---:|---|---|---|
| 51 | XRP | Ripple | Kullanılabilir |
| 52 | LTC | Litecoin | Kullanılabilir |
| 53 | BCH | Bitcoin Cash | Kullanılabilir |
| 54 | MKR | Maker | Kullanılabilir |
| 55 | LINK | Chainlink | Kullanılabilir — raporda tekrar kayıt |
| 56 | ONDO | Ondo Finance | Kullanılabilir |
| 57 | PENDLE | Pendle | Kullanılabilir |
| 58 | OM | MANTRA | Kullanılabilir |
| 59 | AAVE | Aave | Kullanılabilir |
| 60 | UNI | Uniswap | Kullanılabilir |
| 61 | COMP | Compound | Kullanılabilir |
| 62 | CRV | Curve DAO | Kullanılabilir |
| 63 | FXS | Frax Share | Kullanılabilir |
| 64 | RBN | Ribbon Finance | Kullanılabilir |
| 65 | SNX | Synthetix | Kullanılabilir |
| 66 | JUP | Jupiter | Kullanılabilir |
| 67 | RAY | Raydium | Kullanılabilir |
| 68 | LDO | Lido DAO | Kullanılabilir |
| 69 | ENA | Ethena | Kullanılabilir |
| 70 | RPL | Rocket Pool | Kullanılabilir |

### Sektör 5 — Depolama, Veri Güvenliği ve Gizlilik

| Sıra | Sembol | Varlık | Canlı veri durumu |
|---:|---|---|---|
| 71 | FIL | Filecoin | Kullanılabilir |
| 72 | AR | Arweave | Kullanılabilir |
| 73 | STORJ | Storj | Kullanılabilir |
| 74 | XMR | Monero | Kullanılabilir |
| 75 | ZEC | Zcash | Kullanılabilir |
| 76 | DASH | Dash | Kullanılabilir |
| 77 | ENS | Ethereum Name Service | Kullanılabilir |
| 78 | JASMY | JasmyCoin | Kullanılabilir |
| 79 | SC | Siacoin | Kullanılabilir |
| 80 | ANKR | Ankr | Kullanılabilir |
| 81 | HOT | Holo | Kullanılabilir |
| 82 | BAT | Basic Attention Token | Kullanılabilir |
| 83 | MASK | Mask Network | Kullanılabilir |
| 84 | WMT | World Mobile Token | Kullanılabilir |
| 85 | BTT | BitTorrent | Kullanılabilir |

### Sektör 6 — Küresel Topluluk, GameFi ve Kültür Varlıkları

| Sıra | Sembol | Varlık | Canlı veri durumu |
|---:|---|---|---|
| 86 | DOGE | Dogecoin | Kullanılabilir |
| 87 | SHIB | Shiba Inu | Kullanılabilir |
| 88 | SAND | The Sandbox | Kullanılabilir |
| 89 | MANA | Decentraland | Kullanılabilir |
| 90 | GALA | Gala Games | Kullanılabilir |
| 91 | AXS | Axie Infinity | Kullanılabilir |
| 92 | CHZ | Chiliz | Kullanılabilir |
| 93 | APE | ApeCoin | Kullanılabilir |
| 94 | BEAM | Beam | Kullanılabilir |
| 95 | RON | Ronin | Kullanılabilir |
| 96 | FLOKI | Floki | Kullanılabilir |
| 97 | FLOW | Flow | Kullanılabilir |
| 98 | SUPER | SuperVerse | Kullanılabilir |
| 99 | GMT | STEPN | Kullanılabilir |
| 100 | ENJ | Enjin Coin | Kullanılabilir |

## 4. Sonuç

BitColosİa, gerçek piyasa verisini iki zaman ölçeğinde kullanır: ekran tarafında yaklaşık 60 saniyelik yenileme ve parsel tarafında her sabah 10:30 tek günlük değerleme. Gerçek dünyadaki fiyat sinyali korunur; ancak ülke ekonomisinin oynanabilir ve okunabilir kalması için her vatandaşın günlük sonucu ±10 L ile sınırlandırılır. Böylece 100.000 L başlangıç bütçesi, mevcut 99 fiyat referanslı kapsamda teorik olarak tek günde 99.010–100.990 L bandının dışına çıkmaz.

Bu nedenle sistem, gerçek dünyayı bire bir finansal portföy olarak yeniden üretmek yerine, gerçek veri akışının BitColosİa’daki kurgusal vatandaş/parsel düzenini **kontrollü şekilde etkilediği** bir gözlem ve simülasyon modelidir.

## Kaynaklar

[1]: ./server/market/marketData.ts "Canlı piyasa snapshot, 60 saniyelik önbellek, sparkline ve piyasa yönü hesabı"
[2]: ./server/parcels/parcelEconomy.ts "1.000 L taban, USD farkı formülü, ±10 L sınırı ve saat dilimi kuralları"
[3]: ./server/parcels/parcelService.ts "Günlük değerleme akışı, referans fiyat güncellemesi ve idempotent job kaydı"
[4]: ./SECTOR_MAPPING.md "Altı sektör, rapor sıra aralıkları ve vatandaş/parsel sayıları"
[5]: ./server/market/assetManifest.ts "100 varlığın isim, sembol, sektör ve sağlayıcı eşleştirmeleri"
