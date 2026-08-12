# BitColosİa Üç Koboltlu Haber Odası Veri Sözleşmesi

**Durum:** Tasarım önerisi  
**Kapsam:** Haber odasındaki üç yardımcı koboltun veri toplama, filtreleme, kanıtlama ve yorumcuya sunma standardı  
**Temel kural:** Bu belge yalnızca BitColosİa'nın kurgusal parsel ekonomisindeki dış dünya sinyallerini düzenler. Hiçbir paket alım-satım talimatı veya kişiselleştirilmiş finansal tavsiye değildir.

## 1. Tasarım ilkesi

Her kobolt yalnızca farklı türde **gözlem** toplar; baş yorumcu gözlem ile yorumu birbirinden ayırır. Bir veri paketi, kaynak URL'si ya da zincir kanıtı, olay zamanı, filtre sonucu ve güven skoru olmadan haber odasına kabul edilmez. Ethereum JSON-RPC arayüzü, blok sorgularında `safe` ve `finalized` durumlarını ayırt etmeyi; işlem geçmişi içinde makbuzları kullanmayı mümkün kılar.[1] Etherscan'ın ERC-20 uç noktası ise belirli adres veya sözleşmeye ait transferleri filtreleyebilir; ancak bu tek başına adres sahibinin kimliğini kanıtlamaz.[2]

> **Gözlem ≠ yorum ≠ projeksiyon.** Koboltun getirdiği kâğıtta zincir olayı veya kaynaklanan haber gözlemdir; yorumcu tarafından yazılan bağlam yorumdur; Teknik Matris'in sayısal bandı ise her zaman belirsizlik etiketi taşıyan projeksiyondur.

## 2. Ortak paket sözleşmesi

Aşağıdaki JSON, üç koboltun da aynı veri zarfını kullanmasını sağlar. Yalnızca `observation` alanının içeriği kobolt rolüne göre değişir. Örnek değerler şemayı açıklamak içindir; canlı piyasa veya zincir olayı temsil etmez.

```json
{
  "schemaVersion": "1.0",
  "packetId": "kb-2026-08-12-reserve-btc-onchain-0001",
  "room": {
    "sectorId": "reserve",
    "assetReportIndex": 1,
    "assetSymbol": "BTC"
  },
  "koboldRole": "news_sentiment | onchain_watch | technical_matrix",
  "generatedAt": "2026-08-12T17:00:00Z",
  "observationWindow": {
    "from": "2026-08-12T16:00:00Z",
    "to": "2026-08-12T17:00:00Z",
    "timezone": "UTC"
  },
  "source": {
    "class": "official | verified_news | social_signal | chain_rpc | chain_explorer | exchange_api",
    "provider": "provider-name",
    "sourceUrl": "https://example.org/evidence",
    "publishedAt": "2026-08-12T16:30:00Z",
    "retrievedAt": "2026-08-12T16:35:00Z",
    "licenseOrAccess": "public | authenticated_api",
    "sourceHash": "sha256-hex"
  },
  "evidence": {
    "kind": "article | social_post | transaction | order_book_snapshot | candle_series",
    "canonicalRef": "article-url-or-chain:txHash:logIndex",
    "finality": "not_applicable | pending | safe | finalized",
    "corroborators": [
      {
        "provider": "independent-provider-name",
        "reference": "url-or-event-id",
        "matches": true
      }
    ]
  },
  "filter": {
    "decision": "accepted | quarantined | rejected",
    "reasonCodes": ["SOURCE_ALLOWED", "FRESH", "EVIDENCE_COMPLETE"],
    "duplicateKey": "chainId:txHash:logIndex-or-sourceHash",
    "policyVersion": "kobold-policy-v1"
  },
  "observation": {
    "metricFamily": "role-specific",
    "values": {},
    "units": {},
    "rawDataCompleteness": 1.0
  },
  "interpretation": {
    "summary": "Kanıtlanan gözlemin nötr ve kısa açıklaması.",
    "direction": "positive | negative | neutral | ambiguous",
    "timeHorizonHours": 24,
    "causalClaim": "not_proven",
    "advice": "none"
  },
  "confidence": {
    "score": 0.0,
    "sourceQuality": 0.0,
    "evidenceCompleteness": 0.0,
    "freshness": 0.0,
    "crossCheck": 0.0,
    "labelCertainty": 0.0
  },
  "audit": {
    "rawPayloadHash": "sha256-hex",
    "acceptedBy": "automated-policy",
    "humanReview": "not_required | requested | completed",
    "immutableAt": "2026-08-12T17:00:00Z"
  }
}
```

| Ortak alan | Zorunlu kural | Haber odasındaki karşılığı |
|---|---|---|
| `source` | HTTPS, izinli alan adı/sağlayıcı, alma ve yayın zamanı | Kâğıdın altındaki kaynak mührü |
| `evidence.canonicalRef` | URL veya zincir olayına benzersiz işaretçi | İncelenebilir kanıt düğmesi |
| `filter` | Kabul, karantina veya red; gerekçe kodu ile birlikte | Kâğıdın yeşil/sarı/kırmızı mühürü |
| `confidence` | Tek sayı yanında beş bileşen saklanır | Güven göstergesi; tek başına yön sinyali değildir |
| `interpretation` | Nedensellik iddiası varsayılan olarak `not_proven` | Baş yorumcu için yorum sınırı |
| `audit` | Ham yük özeti ve politika sürümü saklanır | Sonradan denetlenebilir hafıza günlüğü |

## 3. Kobolt bazında filtre formatı

### 3.1 Yardımcı 1 — Haber ve sosyal medya duyarlılığı

Haber koboltu, yalnızca kaynaklanabilir olay ve açıklamaları kabul eder. Sosyal medya girdisi hiçbir zaman tek başına yön hükmü üretmez; `social_signal` etiketiyle ayrı tutulur. Mevcut kaynak güven katmanındaki HTTPS, yayın tarihi, alan adı izin listesi ve içerik hash'i bu kobolt için ilk savunma hattıdır.

```json
{
  "koboldRole": "news_sentiment",
  "observation": {
    "metricFamily": "news_sentiment",
    "values": {
      "eventType": "protocol_release | burn | security_incident | listing | regulation | macro",
      "sentimentScore": -1.0,
      "mentionVelocityZ": 0.0,
      "independentSourceCount": 0,
      "officialConfirmation": false
    },
    "units": {
      "sentimentScore": "[-1,1]",
      "mentionVelocityZ": "robust_z_score"
    }
  },
  "filter": {
    "decision": "accepted",
    "reasonCodes": ["PUBLISHED_AT_PRESENT", "ALLOWLISTED_HOST", "NOT_DUPLICATE"]
  }
}
```

Kabul için en az birincil duyuru veya birbirinden bağımsız iki doğrulanmış haber kaynağı gerekir. Haber başlığı, içerik özeti ve sosyal tekrarlar aynı iddianın çoğaltılmış sürümleri ise `sourceHash` veya olay anahtarı altında tek olaya indirilir. Duyarlılık puanı, yön kararı değil yalnızca **haber yoğunluğu ve ton** bağlamıdır.

### 3.2 Yardımcı 2 — Balina ve zincir üstü izleme

Balina koboltu, “büyük transfer gördüm” demek yerine, zincir üstünde doğrulanmış olayı ve **yorumlanamayan kısımları** ayrı yazar. Adres etiketleri doğrudan doğrulama, davranış örüntüsü, kümeleme ve açık kaynaklarla eşleştirme gibi yöntemlerden türetilebilir; dolayısıyla etiket kesin kimlik kabul edilmemelidir.[3]

```json
{
  "koboldRole": "onchain_watch",
  "evidence": {
    "kind": "transaction",
    "canonicalRef": "eip155:1:0xtransactionhash:logIndex",
    "finality": "finalized",
    "corroborators": [
      {
        "provider": "second-chain-provider",
        "reference": "same-tx-or-log",
        "matches": true
      }
    ]
  },
  "observation": {
    "metricFamily": "onchain_flow",
    "values": {
      "chainId": 1,
      "txHash": "0x...",
      "logIndex": 0,
      "tokenContract": "0x...",
      "fromAddress": "0x...",
      "toAddress": "0x...",
      "amountBaseUnits": "0",
      "amountUsdAtEvent": 0.0,
      "fromLabel": "unknown | exchange | bridge | protocol | treasury",
      "toLabel": "unknown | exchange | bridge | protocol | treasury",
      "fromLabelConfidence": 0.0,
      "toLabelConfidence": 0.0,
      "flowClassification": "unclassified | exchange_inflow | exchange_outflow | internal_transfer | bridge_transfer",
      "nettable": false
    },
    "units": {
      "amountBaseUnits": "token_base_unit",
      "amountUsdAtEvent": "USD"
    }
  },
  "filter": {
    "decision": "quarantined",
    "reasonCodes": ["LABEL_NOT_CONFIRMED", "DIRECTION_NOT_INFERRED"]
  }
}
```

#### Balina verisi için kabul/red matrisi

| Kontrol katmanı | Kabul koşulu | Karantina / red nedeni |
|---|---|---|
| **İşlem kanıtı** | Zincir kimliği, `txHash`, `logIndex`, sözleşme ve token ondalığı doğrulanır; makbuz başarılıdır. | Bekleyen işlem, başarısız makbuz, eksik log, farklı ağ veya yinelenen olay. |
| **Kesinlik** | EVM ağlarında en az `safe`, tercih olarak `finalized` blok durumu kullanılır.[1] | Reorg riski taşıyan ya da başlığı değişebilen çok yeni blok. |
| **Varlık kimliği** | Sembol yerine izinli `chainId + contractAddress` çifti kullanılır. | Aynı sembollü sahte token, airdrop tozu, sıfır/çok küçük değerli log. |
| **Adres etiketi** | Resmî borsa/adres duyurusu veya iki bağımsız etiket sağlayıcısının aynı varlık/rol sonucu. | Tek, kaynağı belirsiz etiket; uyuşmayan iki sağlayıcı; adsız cüzdan. |
| **Yön yorumu** | Kaynak ve hedef farklı, yeterli güvenliğe sahip varlık kümeleridir; transfer köprü/kasa içi değildir. | Aynı kuruluşun sıcak–soğuk cüzdan aktarımı, borsa içi yeniden dengeleme, köprü veya akıllı sözleşme rotası. |
| **Ekonomik büyüklük** | Tutar, varlığın kendi son 24 saatlik doğrulanmış hacmine göre göreli eşiği aşar. | Mutlak tutar büyük görünse de ilgili varlık için sıradan ise; fiyat bilgisi eskiyse. |
| **Çoğaltma/manipülasyon** | `chainId:txHash:logIndex` anahtarı tekildir; aynı kümeler arası mikro transferler saatlik netleştirilir. | Döngüsel transfer, aynı küme içinde ping-pong, aynı olayın iki sağlayıcıdan tekrarı. |

**Sahte transfer savunması.** Token sözleşme izin listesi olmadan yalnızca sembole güvenilmez. İşlem tutarı, olay anındaki fiyat snapshot'ı ile değerlenir ve fiyat zaman damgası da saklanır. Adres etiketinin tek sağlayıcıdan gelmesi, kâğıdı “teyit bekliyor” durumuna geçirir; `exchange_inflow` veya `exchange_outflow` etiketi üretmez. Aynı kuruluş kümeleri arasındaki aktarımlar `internal_transfer` olarak işaretlenir ve net borsa akışına katılmaz.

### 3.3 Yardımcı 3 — Tarih ve Teknik Matris

Teknik Matris koboltu bir “tek fiyat hedefi” üretmez. Bunun yerine son 24 saat için P05–P95 ve P20–P80 gibi aralıklar, orta senaryo ve veri kalitesi notu verir. Kripto getirilerinde koşullu volatilite için GARCH ailesi ve asimetrik varyantlar literatürde incelenmektedir; bu yüzden bu yapı ortalama yön tahmininden çok **belirsizlik ölçeğini** modellemeye odaklanır.[4] Emir defteri bağlamında da spread, derinlik ve dengesizlik ölçüleri ayrı ölçülebilir likidite boyutlarıdır.[5]

```json
{
  "koboldRole": "technical_matrix",
  "observation": {
    "metricFamily": "probabilistic_24h_band",
    "values": {
      "barInterval": "1h",
      "lookbackHours": 720,
      "currentPrice": 0.0,
      "logReturnMedian": 0.0,
      "realizedVolatility24h": 0.0,
      "ewmaVolatility": 0.0,
      "atrPercent14": 0.0,
      "volumeRobustZ": 0.0,
      "vwapDeviation": 0.0,
      "spreadBps": 0.0,
      "depthUsd": 0.0,
      "orderBookImbalance": 0.0,
      "benchmarkCorrelation": 0.0,
      "band": {
        "p05": 0.0,
        "p20": 0.0,
        "p50": 0.0,
        "p80": 0.0,
        "p95": 0.0
      },
      "modelState": "calibrated | cautious | suppressed"
    },
    "units": {
      "realizedVolatility24h": "decimal_return",
      "ewmaVolatility": "decimal_return",
      "atrPercent14": "decimal_return",
      "volumeRobustZ": "robust_z_score",
      "spreadBps": "basis_points",
      "depthUsd": "USD",
      "orderBookImbalance": "[-1,1]"
    }
  },
  "interpretation": {
    "summary": "Aralık, geçmiş gözlem penceresi ve güncel likidite koşullarına bağlı koşullu belirsizlik ifadesidir.",
    "direction": "ambiguous",
    "timeHorizonHours": 24,
    "causalClaim": "not_proven",
    "advice": "none"
  }
}
```

## 4. 24 saatlik olasılık bandı: gösterge seti ve hesap akışı

| Katman | Gösterge | Hesap / rol | Neden bandı etkiler? |
|---|---|---|---|
| Getiri | Saatlik log getiri `r_t = ln(P_t / P_{t-1})` | Orta senaryo için medyan veya kırpılmış ortalama | Aşırı tek mumun merkezi tek başına sürüklemesini azaltır. |
| Gerçekleşmiş volatilite | `RV = sqrt(sum(r_t²))` | Son 24 saatlik oynaklık ölçeği | Yakın dönemdeki gözlenen hareket genişliğini taşır. |
| EWMA volatilite | `sigma²_t = λ sigma²_(t-1) + (1-λ) r²_t` | Son hareketlere daha fazla ağırlık veren ikinci volatilite görünümü | Volatilite kümelenmesine karşı daha duyarlıdır. `λ` varlık bazında geri test ile kalibre edilir. |
| Aralık oynaklığı | `ATR% = mean(TR_t / P_(t-1))` | Yüksek-düşük aralığını ek ölçü olarak kullanır | Kapanış getirilerinin kaçırdığı gün içi genişliği yakalar. |
| Hacim | `robustZ(log(volume))` | Medyan ve MAD üzerinden anomali ölçümü | Olağandışı hacim, geniş bandın gerekçesi olabilir; yön hükmü değildir. |
| Fiyat konumu | VWAP sapması ve kısa/orta dönem üstel hareketli ortalama farkı | Merkez tahmine sınırlı katkı | Fiyatın son işlem yoğunluğuna göre konumunu verir. |
| Likidite | Spread (bps), defter derinliği, bid/ask dengesizliği | Volatilite cezası ve güven indirimi | Sığ ya da geniş spread'li piyasada aynı fiyat hareketinin etkisi daha kırılgan olabilir. |
| Rejim | BTC/ana sektörle korelasyon, sektör getiri dağılımı | Tek varlık sinyalinin piyasa genelinden ayrışmasını kontrol eder | Varlık hareketinin genel piyasa rejiminden mi geldiğini açıklar. |
| Dış sinyal | Yalnızca doğrulanmış haber ve yeterli güvenli zincir olayı | Merkez kaymasını **sınırlandırılmış** biçimde etkiler | Tek haber veya tek transfer, bandın yönünü tek başına değiştiremez. |

### 4.1 Önerilen hesaplama

Bir saatlik mumlarla 24 saatlik ufukta, önce ham getiri serisi hazırlanır. Merkez için kırpılmış veya medyan getiri `mu_hat`; belirsizlik için gerçekleşmiş volatilite, EWMA volatilite ve ATR yüzdesinin kalibre edilmiş bileşimi `sigma_hat` alınır.

```text
sigma_hat² = w1 * RV² + w2 * sigma_EWMA² + w3 * ATR%²
mu_adjusted = clamp(mu_hat + signal_adjustment, -0.25 * sigma_hat, +0.25 * sigma_hat)
```

`signal_adjustment` yalnızca veri kalitesi yüksekse hesaplanır. Örneğin doğrulanmış haber, yeterli kesinlikte zincir gözlemi ve likidite verisi aynı yönü **zorunlu kılmadan** destekliyorsa küçük bir merkez düzeltmesi tanınabilir. Çelişkili ya da eksik veri varsa `signal_adjustment = 0` yapılır; band genişletilir veya tamamen bastırılır.

Log-normal varsayım kullanılacaksa `q` yüzdelik bandı aşağıdaki biçimde üretilebilir:

```text
P_q(24s) = P_0 * exp(mu_adjusted * H + z_q * sigma_hat * sqrt(H))
```

Burada `H`, kullanılan zaman adımı sayısıdır. Ancak kripto getirilerinde kuyruk riskleri normal dağılımdan sapabildiği için, üretimde tercih edilen yöntem aynı formülün yerine son 30–90 günlük saatlik getirilerden **blok bootstrap / ampirik yüzdelik** üretmektir. Normal dağılım sonucu ile ampirik sonuç anlamlı ölçüde ayrışırsa, geniş olan band gösterilir ve `modelState = cautious` atanır.

### 4.2 Güven ve kalibrasyon kuralları

| Durum | Koboltun çıktısı | Baş yorumcunun ekran metni |
|---|---|---|
| Yeterli mum, taze hacim/defter verisi, sağlam kaynaklar | P05/P20/P50/P80/P95 bandı + bileşenler | “Koşullu band — veri kapsamı yeterli” |
| Hacim veya defter verisi eksik; kaynaklar çelişkili | Genişletilmiş P20/P80; P05/P95 bastırılabilir | “Temkinli — likidite veya kaynak kapsamı eksik” |
| Fiyat serisinde boşluk, varlık eşleşmesi belirsiz, zincir doğrulanmamış | Sayısal band yok | “Projeksiyon bastırıldı — teyitli veri yetersiz” |
| Sonuç bandın dışında sık tekrarlanıyorsa | Model ağırlıkları yeniden kalibre edilir; eski band korunmaz | “Kalibrasyon incelemesi gerekiyor” |

Her varlık için geriye dönük izleme kaydında modelin tahmin anındaki girdi özeti, ağırlıkları, ürettiği yüzdelikler ve gerçekleşen 24 saatlik sonuç saklanır. P20–P80 bandının hedef kapsaması %60, P05–P95 bandının hedef kapsaması %90'dır; bunlar bir **kalibrasyon testi** için referans kapsama oranlarıdır, performans vaadi değildir. Gerçekleşen kapsama bu hedeflerden kalıcı biçimde saparsa kobolt otomatik olarak `cautious` moduna geçmelidir.

## 5. Haber odası görünümünde önerilen kâğıt düzeni

| Kâğıt | Ön yüz | Arka yüz / ayrıntı |
|---|---|---|
| Haber koboltu | Olay başlığı, kaynak türü, yayın saati, güven mühürü | URL, bağımsız kaynak sayısı, sosyal sinyalin ayrı etiketi, red gerekçeleri |
| Balina koboltu | “Doğrulanmış zincir olayı” veya “teyit bekliyor”; yön sınıfı | Ağ, işlem özeti, blok kesinliği, token sözleşmesi, etiket güveni, iç transfer filtresi |
| Teknik Matris | P20–P80 ana bandı, P50, model durumu | RV/EWMA/ATR, hacim z-skoru, spread, derinlik, dengesizlik, kalibrasyon geçmişi |
| Baş yorumcu özeti | “Kanıtlananlar”, “belirsizler”, “bir sonraki kontrol noktası” | Kullandığı paket kimlikleri ve hiçbir pakete dönüşmeyen iddialar |

## 6. Uygulama sırası

1. Önce ortak paket sözleşmesi ve kabul/red kodları veri şemasına eklenir.
2. Haber koboltu, mevcut HTTPS izin listesi ve tazelik/hashi kullanan hattın üzerinde çalışır.
3. Balina koboltu, yalnızca kanıtlanabilir zincir kaydı sağlayan bir sağlayıcı ve iki kademeli etiket politikası bağlandıktan sonra etkinleştirilir.
4. Teknik Matris, ilk aşamada salt-okunur band hesaplar; sonuçları günlük değerlendirme ya da parsel değerleme formülünü değiştirmez.
5. En az 30 günlük kayıtlı çıktı/sonuç çifti oluşmadan teknik ağırlıklar sabit kabul edilmez; kalibrasyon raporu görünür kalır.

## Kaynaklar

[1] [ethereum.org — JSON-RPC API](https://ethereum.org/developers/docs/apis/json-rpc/)  
[2] [Etherscan — ERC-20 Token Transfers API](https://docs.etherscan.io/api-reference/endpoint/tokentx)  
[3] [Nansen — Address Labeling in Crypto](https://nansen.ai/post/what-is-address-labeling-in-crypto)  
[4] [Wang (2021) — Different GARCH Model Analysis on Returns and Volatility in Bitcoin](https://www.aimspress.com/article/doi/10.3934/DSFE.2021003)  
[5] [Angerer, Gramlich & Hanke (2025) — Order Book Liquidity on Crypto Exchanges](https://www.mdpi.com/1911-8074/18/3/124)

---

**Açıklama:** Bu belge araştırma ve oyun içi sinyal tasarımı içindir; kişiselleştirilmiş yatırım tavsiyesi değildir.
