# Kaynak Doğrulamalı Araştırma Ajanı Mimarisi

## Haber adaptörü için doğrulanan kaynak

Vercel dağıtımında anahtarsız başlangıç adapteri olarak **GDELT DOC 2.0** değerlendirilir. GDELT’nin resmî açıklaması, DOC API’nin tam metin arama işlevi ve JSON çıktı sunduğunu; sonuçların kaynak URL’si üzerinden denetlenebileceğini belirtir. GDELT’nin ana veri sayfası ayrıca DOC, GEO ve TV için canlı JSON API’lerinin bulunduğunu, GDELT 2.0 verilerinin 15 dakikada bir güncellendiğini açıklar.

Bu kaynak, tek başına bir güven notu değildir. Adapterin döndürdüğü her URL; BitColosİa kaynak güven politikası, yayın zamanı/freshness kuralı, içerik hash denetimi ve alan adı sınıflamasıyla yeniden değerlendirilir. Kaynağın yalnızca URL, başlık ve yayın tarihi sağladığı durumlarda LLM’in yazısı kaynakta bulunmayan iddia ekleyemez.

| Kaynak | Doğrulanan kullanım | Uygulama sınırı |
|---|---|---|
| [GDELT DOC 2.0 API](https://blog.gdeltproject.org/gdelt-doc-2-0-api-debuts/) | JSON biçiminde haber araması ve `domainis:` gibi alan adı daraltması | Arama sonucu adaydır; güven derecesi uygulama kodunda belirlenir. |
| [GDELT Data](https://www.gdeltproject.org/data.html) | Canlı JSON API’leri ve GDELT 2.0 güncelleme ritmi | Nihai not için URL, yayın zamanı ve kaynak içeriği denetimi gerekir. |

## Hedef güven hattı

```text
Haber adapteri → URL/freshness denetimi → alan adı güven katmanı
→ kaynak metni/özet bağlamı → yapılandırılmış LLM çıkarımı
→ hash deduplikasyonu → kabul/red kaydı → günlük araştırma endpoint’i
```

Bu hattın her aşaması denetlenebilir kayıt bırakır. Bilinmeyen alan adları sosyal sinyal diye otomatik kabul edilmez; açıkça reddedilir.

## Uygulanan üç aşama

| Aşama | Kod parçaları | Zorunlu kural | Kalıcı kanıt |
|---|---|---|---|
| 1. Kaynak güveni | `server/commentators/researchTrust.ts`, `commentator_journal_entries` | HTTPS, özel ağ reddi, alan adı/tier eşleşmesi, 48 saat freshness | `publishedAt`, `trustPolicyVersion`, `contentHash` |
| 2. Kabul-red ve denetim | `addScheduledResearch`, `commentator_research_runs`, `commentator_research_rejections` | Sektör başına en fazla 2 not, SHA-256 dedup, kabul/red gerekçesi | Aday, kabul, red, tekrar, eski kaynak, güvenilmeyen alan adı sayaçları |
| 3. Vercel adapteri | `researchAdapters.ts`, `researchAgent.ts`, `VERCEL_CRON_SECRET` | GDELT aday kaynağı → güvenli URL/metin → LLM özeti → giriş endpoint’i | Adapter, arama ve LLM çağrı sayaçları |

### 1. Kaynak güveni

`trustedSourceTier()` kaynak URL’sini `URL` sınıfıyla ayrıştırır. Yalnızca `https:` kabul edilir; `localhost`, özel IPv4/IPv6 aralıkları ve `.local` alan adları reddedilir. Alan adı kontrolü tam veya alt alan adı eşleşmesidir; örneğin `blog.ethereum.org` resmî kaynak sayılırken `ethereum.org.example.test` reddedilir.

Sınıflama yalnızca uygulama kodundaki allowlist ile yapılır. `official` ve `verified_news` için bilinen resmî proje ve seçilmiş yayın alanları; `social_signal` için ayrı sosyal alan listesi vardır. Bilinmeyen alan adı `social_signal` olarak otomatik düşürülmez, `untrusted_domain` gerekçesiyle reddedilir.

### 2. Kabul-red ve günlük denetim

Araştırma endpoint’i her not için `sourceUrl`, `sourceTitle`, `publishedAt`, `sourceTier` ve en az 12 karakterlik `body` ister. `contentHash`, URL + başlık + temizlenmiş not gövdesi + yayın zamanından SHA-256 ile üretilir. Aynı yorumcu için eş hash ikinci kez yazılamaz. Sektörün o İstanbul günündeki araştırma sayısı ikiye ulaştığında ek not `sector_quota` gerekçesiyle denetim tablosuna gider.

`commentator_research_runs` günlük çalışmanın adapterini, kabul/red/tekrar/eskimiş/güvenilmeyen kaynak sayaçlarını ve arama/LLM kullanımını saklar. `commentator_research_rejections` ise reddedilen adayın URL’sini, alan adını ve gerekçesini saklar. Bu kayıtlar kullanıcı arayüzündeki araştırma notlarından ayrıdır; reddedilen kaynak hiçbir zaman kobolt haber kâğıdı olmaz.

### 3. Vercel adapteri

`researchAdapters.ts`, GDELT DOC 2.0’dan en fazla tanımlı günlük arama bütçesi kadar aday çeker. Her adayın URL’si güven katmanından geçer, kamuya açık metni zaman aşımı ve boyut sınırıyla çekilir, ardından yalnızca bu metinden kısa Türkçe not üretilir. Vercel’de `RESEARCH_LLM_API_URL`, `RESEARCH_LLM_API_KEY` ve `RESEARCH_LLM_MODEL` tanımlanırsa OpenAI-uyumlu bir sunucu sağlayıcısı kullanılır. Bu değişkenler yoksa Manus ortamında mevcut Forge LLM yardımcı işlevi fallback olur.

Vercel Cron, `CRON_SECRET` tanımlıysa `Authorization: Bearer <CRON_SECRET>` ile aynı `/api/scheduled/commentator-research` girişini çağırır. Uygulama geçmiş uyumluluğu için `VERCEL_CRON_SECRET` değerini de kabul eder. Önce zamanlayıcı kimliği doğrulanır; ardından GDELT → güven politikası → kısa özet → hash/dedup → denetim kayıt zinciri çalışır. Manus Heartbeat ile Vercel Cron aynı gün aynı işi eşzamanlı çalıştırmamalıdır.

## Vercel geçiş kontrol listesi

1. Vercel’e `DATABASE_URL`, `JWT_SECRET`, `CRON_SECRET`, `RESEARCH_ADAPTER=gdelt`, `RESEARCH_LLM_API_URL`, `RESEARCH_LLM_API_KEY` ve `RESEARCH_LLM_MODEL` eklenir.
2. Drizzle migrasyonu, haricî üretim veritabanında güvenli dağıtım aracınızla uygulanır; yeni araştırma tabloları ve indeksler doğrulanır.
3. Önce Preview ortamında yalnızca araştırma cron’u test edilir. `commentator_research_runs` satırında adapter, kabul/red ve çağrı sayaçları görülmelidir.
4. İlk başarılı Vercel araştırma çalışmasında `commentator_research_rejections` üzerinden eski, tekrar eden ve güvenilmeyen adayların gerekçeleri denetlenir.
5. Aynı gün Manus Heartbeat veya Vercel Cron’dan yalnızca biri etkin bırakılır. Ödül ve tahmin cron’ları ayrı geçiş ve dry-run tamamlanana kadar Manus’ta kalır.

## Hata davranışı

Bir sektör için uygun kaynak yoksa sistem not uydurmaz. Adapter ilgili adayları reddedilmiş olarak kaydeder veya sektör için sonuç üretmeden tamamlanır. Bir kaynağın metni çekilemezse diğer sektörlerin çalışması durmaz. LLM yapılandırılmış JSON döndürmezse kaynak alıntısını aşmayan, kısa bir fallback notu kullanılır; kaynakta bulunmayan iddia eklenmez.
