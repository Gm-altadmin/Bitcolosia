# BitColosİa — Gerçek Dünya Piyasa Verisi Notları

BitColosİa, gerçek piyasa verisini yalnızca **kurgusal su simülasyonunu etkileyen dış sinyal** olarak kullanır. Bu katman, emir oluşturmaz; cüzdan bağlamaz; gerçek para tutmaz; yatırım tavsiyesi üretmez.

## Kaynaklar ve Yenileme

| Kaynak | Kullanım | Doğrulanan sınır / not | URL |
|---|---|---|---|
| CoinGecko Coins Markets | 100 rapor satırının USD fiyatı, piyasa değeri, 24 saatlik değişimi ve hacmi | Tek istekte en fazla 250 ID; demo/keyless veri 60 saniye, ücretli API 30 saniye yenilenir | https://docs.coingecko.com/reference/coins-markets |
| CoinGecko API | Genel REST/WebSocket/Webhook kapsamı | Bu ilk sürüm yalnızca sunucu tarafı REST snapshot kullanır | https://docs.coingecko.com/ |
| CoinMarketCap API | İleride alternatif sağlayıcı | Keyless public uç noktalar ve yaklaşık 1 dakikalık güncelleme seçenekleri vardır | https://coinmarketcap.com/api/documentation |
| Coinbase Exchange API | İleride borsa odaklı alternatif | Piyasa verisi uç noktaları herkese açıktır; kapsama ilgili borsadaki çiftlerle sınırlıdır | https://docs.cdp.coinbase.com/exchange/introduction/welcome |

## İlk Doğrulama — 2026-08-12 UTC

Gemini raporundaki 100 satırdan **99’u CoinGecko kimliğiyle doğrulandı**. `LINK / Chainlink` iki rapor satırında yer aldığından tek sağlayıcı kimliğine indirildi; sonuçta tek toplu istekte **98 benzersiz CoinGecko ID’si** çağrılır. `SANG / Sango Coin`, güncel sağlayıcı listesinde doğrulanamadığı için yanlış eşleştirme yapılmadan `unavailable` olarak işaretlendi.

İlk tRPC snapshot çağrısı 2026-08-12T06:42:59.802Z tarihinde 98 sağlayıcı varlığı, boş `missingProviderIds` listesi ve bir erişilemeyen rapor satırı döndürdü. Sunucu aynı sonucu 60 saniye süreyle önbellekte tutar; ilk testte ikinci çağrı aynı `fetchedAt` değerini ve `cacheAgeMs: 1020` döndürdü.

## Sparkline ve Sıralama — 2026-08-12 UTC

`/coins/markets` isteği `sparkline=true` parametresiyle çağrılır. Sağlayıcının fiyat dizisinden son 24 geçerli nokta alınarak her rapor satırında mini çizgi grafik üretilir; veri gelmeyen kayıtlar uydurma grafik yerine `—` gösterir. Her kategori kendi içinde `change24hPct` değerine göre büyükten küçüğe otomatik sıralanır; erişilemeyen kayıtlar listenin sonuna bırakılır.

## Piyasa Yönü Metodolojisi — 2026-08-12 UTC

Piyasa yönü kartı artık küçük piyasa değerli varlıkların eşit ağırlıklı etkisine dayanmaz. Sağlayıcının `market_cap` alanıyla, erişilebilir varlıkların 24 saatlik değişimi **piyasa değeri ağırlıklı** hesaplanır. Piyasa değeri bulunmayan bir snapshot’ta, sistem yalnızca görünür bir `eşit ağırlıklı yedek hesap` notuyla aritmetik ortalamaya döner.

Canlı karşılaştırma, eşit ağırlıklı sonucun `-0,195%` iken piyasa değeri ağırlıklı sonucun `+0,279%` olabildiğini gösterdi. Bu farklılık, listede çok sayıda küçük varlığın genel piyasa yönünü aşırı temsil edebilmesinden kaynaklanır. Ekrandaki yön etiketi bu nedenle piyasa değeri ağırlıklı yöntemi açıkça belirtir.
