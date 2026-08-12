# BitColosİa — VS Code, GitHub ve Vercel Geçiş Rehberi

Bu depo, **Vite istemcisi** ve aynı kod tabanındaki **Express/tRPC API** ile çalışır. `api/index.ts`, Vercel’in Node.js serverless çalıştırma modelinde bu API’yi açar; `vercel.json` ise Vite çıktısını ve `/api/*` yönlendirmesini tanımlar.

> Bu hazırlık dosyaları, kaynak kodun GitHub ve Vercel’e taşınmasını sağlar. Mevcut Manus OAuth, Forge/LLM ve Heartbeat cron servisleri platforma özeldir; Vercel’de üretime geçmeden önce aşağıdaki eşleştirmeler tamamlanmalıdır.

| Mevcut bileşen              | Vercel karşılığı                                                                          | Taşıma durumu                          |
| --------------------------- | ----------------------------------------------------------------------------------------- | -------------------------------------- |
| React + Vite arayüzü        | Vercel Static Deployment                                                                  | Hazır                                  |
| Express + tRPC `/api/*`     | `api/index.ts` Node.js serverless giriş noktası                                           | Hazır; çevresel değişken gerektirir    |
| MySQL/TiDB + Drizzle        | SSL destekli haricî MySQL/TiDB                                                            | `DATABASE_URL` sağlanmalı              |
| Manus OAuth                 | Aynı sağlayıcının Vercel alan adı izinli callback’i veya Auth.js/Clerk gibi bir sağlayıcı | Alan adı ve callback ayarı gerekli     |
| Heartbeat zamanlayıcıları   | Vercel Cron veya haricî scheduler                                                         | Cron kimlik doğrulama adaptörü gerekli |
| Forge LLM / araştırma ajanı | GDELT aday kaynağı + OpenAI-uyumlu sunucu LLM adapteri                                  | Araştırma adapteri eklendi; anahtarlar gerekli |
| Forge depolama proxy’si     | S3, Vercel Blob veya başka bir object storage                                             | Adaptör gerekli                        |

## 1. VS Code’da açma

Depoyu bilgisayarınıza klonlayın ve kök klasörü VS Code ile açın. İlk kurulumda Node.js 22 ve pnpm 10 kullanın.

```bash
corepack enable
pnpm install --frozen-lockfile
# docs/ENVIRONMENT_TEMPLATE.md içindeki değişkenleri .env.local dosyanıza yazın.
pnpm dev
```

`.env.local` içine yalnızca kendi gizli değerlerinizi yazın. Bu dosya Git tarafından izlenmez. Kod kalitesi için aşağıdaki komutları kullanın.

```bash
pnpm test
pnpm check
pnpm build:vercel
```

## 2. GitHub’a yükleme

GitHub’da boş bir depo oluşturun. Ardından yerel proje kökünde aşağıdaki komutları çalıştırın. İlk kez gönderiyorsanız varsayılan dalı `main` olarak adlandırın.

```bash
git init
git add .
git commit -m "Prepare BitColosia for GitHub and Vercel"
git branch -M main
git remote add origin https://github.com/KULLANICI_ADI/bitcolosia-water-operation.git
git push -u origin main
```

GitHub Actions, her `main` gönderiminde testleri, tür denetimini ve Vercel statik derlemesini çalıştırır. `.env`, `.env.local` ve gerçek anahtarlar depoya gönderilmemelidir.

## 3. Vercel proje ayarları

Vercel’de **Add New → Project** seçeneğiyle GitHub deponuzu bağlayın. Ayarları aşağıdaki gibi bırakın.

| Ayar             | Değer                            |
| ---------------- | -------------------------------- |
| Framework Preset | Vite                             |
| Install Command  | `pnpm install --frozen-lockfile` |
| Build Command    | `pnpm build:vercel`              |
| Output Directory | `dist/public`                    |
| Node.js          | 22.x                             |

Vercel Project Settings → Environment Variables bölümüne [`ENVIRONMENT_TEMPLATE.md`](./ENVIRONMENT_TEMPLATE.md) içindeki gerekli değişkenleri girin. `DATABASE_URL`, `JWT_SECRET` ve bütün sunucu tarafı anahtarlar yalnızca Vercel sunucu ortamında kalmalıdır. `VITE_` ile başlayan değerler istemci derlemesine girebilir; bunlara gizli değer koymayın.

## 4. OAuth ve alan adı

Vercel’in ürettiği alan adını ve daha sonra özel alan adınızı OAuth sağlayıcısında callback izin listesine ekleyin:

```text
https://SIZIN-ALAN-ADINIZ/api/oauth/callback
```

Manus OAuth’ı kullanmaya devam edecekseniz bu redirect URI’nin sağlayıcı tarafından kabul edildiğini doğrulayın. Kabul edilmiyorsa OAuth katmanını Vercel’de desteklenen bağımsız bir kimlik sağlayıcıyla değiştirin. Yeni `JWT_SECRET` üretin; mevcut canlı anahtarı taşımayın.

## 5. Kaynak güveni araştırma hattı

Araştırma endpoint’i artık her not için HTTPS URL, yayın zamanı, alan adı güven derecesi ve SHA-256 içerik hash’i zorunlu tutar. Bilinmeyen alan adları reddedilir; `official`, `verified_news` ve `social_signal` sınıflaması model tarafından değil kod tarafından yapılır. Notlar sektör başına günde en fazla iki kayıtla sınırlıdır. Her çalıştırmada kabul, red, tekrar, eski kaynak, arama ve LLM çağrısı sayıları denetim tablolarına yazılır.

Vercel Project Settings → Environment Variables bölümünde aşağıdaki **sunucu tarafı** değişkenlerini Production ve Preview için girin:

| Değişken | Amaç |
|---|---|
| `CRON_SECRET` | Vercel Cron isteğinin otomatik `Authorization: Bearer` doğrulaması |
| `RESEARCH_ADAPTER=gdelt` | Anahtarsız GDELT aday kaynak adapteri |
| `RESEARCH_LLM_API_URL` | OpenAI-uyumlu LLM servis kökü |
| `RESEARCH_LLM_API_KEY` | LLM servisinin yalnızca sunucuda tutulan anahtarı |
| `RESEARCH_LLM_MODEL` | Kısa JSON üretebilen ekonomik model kimliği |

> `RESEARCH_LLM_API_KEY`, `CRON_SECRET` ve veritabanı URL’si asla `VITE_` ile başlamamalıdır. Vercel Cron yolu yalnızca araştırma işini tanımlar; aynı anda Manus Heartbeat’i açık tutarsanız, iki zamanlayıcıyı aynı endpoint’e yazdırmayın. Geçişte önce Manus araştırma jobunu devre dışı bırakın veya Vercel Cron’u kapalı bırakın.

## 6. Vercel Cron kurulumu

Mevcut sistem dört işi Istanbul saatine göre yürütür. `vercel.crons.example.json`, UTC eşdeğerlerini kaydeder; **doğrudan aktif değildir**.

| Istanbul zamanı |     UTC cron | İş                                         |
| --------------: | -----------: | ------------------------------------------ |
|           10:30 | `30 7 * * *` | Parsel değerlemesi ve yorumcu sonuç kesiti |
|           10:45 | `45 7 * * *` | Yorumcu ödülleri ve su barajı              |
|           11:30 | `30 8 * * *` | Yeni kilitli tahmin turu                   |
|           20:00 | `0 17 * * *` | Kaynaklı yorumcu araştırma günlüğü         |

`vercel.json` kaynak araştırması için `0 17 * * *` UTC cron satırını içerir. Vercel bu isteği `/api/scheduled/commentator-research` yoluna gönderir; Vercel’in otomatik gönderdiği `CRON_SECRET` Bearer değeriyle uygulama doğrulanır ve GDELT → kaynak güveni → LLM özeti → hash dedup hattı çalışır. İlk Vercel çalışmasında Project Logs içinden `commentator_research_runs` kabul/red sayaçlarını denetleyin.

Diğer üç oyun işi (10:30 değerleme, 10:45 ödül, 11:30 tahmin) Manus Heartbeat üzerinde kalır. Bunların Vercel’e taşınması için her endpoint’e aynı `VERCEL_CRON_SECRET` doğrulamasını ekleyin, önce dry-run yapın ve yalnızca sonrasında ilgili Manus jobunu kapatın.

## 7. Güvenli geçiş sırası

1. GitHub CI’ın geçtiğini, ardından Vercel preview dağıtımında arayüzün ve `/api/trpc` isteklerinin çalıştığını doğrulayın.
2. Haricî veritabanı bağlantısını ve OAuth callback’ini deneyin.
3. `CRON_SECRET`, `RESEARCH_ADAPTER`, LLM URL/anahtarı/modeli ekleyin.
4. Önce yalnızca araştırma cron’unu dry-run ile çağırın; `commentator_research_runs` ve `commentator_research_rejections` tablolarında kabul/red sayaçlarını görün.
5. Aynı gün yalnızca **bir** araştırma zamanlayıcısını etkin bırakın: Manus veya Vercel.
6. Diğer cron işleri için aynı geçişi bağımsız dry-run ve job kapatma sırasıyla tamamlayın.

Bu proje şu anda Manus üzerinde yayında kalabilir. Vercel’e geçişi tamamlamadan önce geri dönüş için çalışır bir Manus checkpoint’ini koruyun.
