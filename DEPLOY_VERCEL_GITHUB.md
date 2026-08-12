# BitColosİa — Bağımsız GitHub + Vercel Dağıtım Rehberi

Bu rehber, projeyi Manus platformundan bağımsız olarak, senin kendi GitHub + Vercel
hesabınla (belkagolf.com ve belkagolfapart.com'da kullandığın yöntemle aynı) canlıya
almak için gereken adımları anlatır.

## Bu sürümde neyi değiştirdim

1. **Dört zamanlanmış iş** (parsel değerleme 10:30, ödül/su barajı 10:45, yorumcu
   tahmin kilidi 11:30, haber araştırması 20:00 — hepsi İstanbul saatiyle) artık
   Vercel'in kendi Cron sistemiyle çalışacak şekilde `vercel.json` içine eklendi.
   Daha önce yalnızca araştırma işi tanımlıydı; diğer üçü hiç çalışmıyordu.
2. Bu dört uç nokta artık hem Manus'un eski kimlik doğrulamasını hem de Vercel
   Cron'un gönderdiği gizli anahtarı (`CRON_SECRET`) kabul ediyor.
3. Yorumcu tahminini üreten yapay zekâ çağrısı, artık Manus'un dahili servisine
   değil — sen hangi sağlayıcıyı tanımlarsan ona (örn. OpenAI) gidiyor.

## Gerekli Vercel Ortam Değişkenleri

Vercel projende **Settings → Environment Variables** bölümünden şunları ekle:

| Değişken | Ne için | Nereden alınır |
|---|---|---|
| `DATABASE_URL` | Oyun verisinin (yorumcular, tahminler, parseller) saklandığı veritabanı | PlanetScale, Railway veya benzeri bir **MySQL** veritabanı oluşturup bağlantı adresini buraya yapıştır |
| `JWT_SECRET` | Oturum çerezlerini imzalamak için rastgele, uzun bir metin | Kendin üret (örn. 40 karakterlik rastgele bir dize) |
| `CRON_SECRET` | Vercel Cron'un işleri tetiklerken kullandığı gizli anahtar | Kendin üret; Vercel'in "Cron Jobs" ayarında bu adı görürsen otomatik de kullanabilirsin |
| `RESEARCH_LLM_API_URL` | Yorumcu tahmini ve haber özeti üreten yapay zekâ servisinin adresi | Örn. OpenAI için: `https://api.openai.com` |
| `RESEARCH_LLM_API_KEY` | Yukarıdaki servisin API anahtarı | OpenAI hesabından alınır |
| `RESEARCH_LLM_MODEL` | Kullanılacak model adı | Örn. `gpt-4o-mini` |
| `RESEARCH_ADAPTER` | Haber kaynağı toplayıcı | `gdelt` yaz (GDELT ücretsiz ve anahtarsızdır) |

> `OAUTH_SERVER_URL`, `VITE_APP_ID`, `OWNER_OPEN_ID` gibi Manus'a özel değişkenleri
> **boş bırakabilirsin** — bunlar yalnızca eski Manus girişi için kullanılıyor,
> herkese açık haber odaları ve piyasa verisi ekranı bunlara ihtiyaç duymuyor.

## Adım adım

1. **Veritabanı oluştur:** PlanetScale (ücretsiz plan yeterli başlangıç için) veya
   benzer bir yerde yeni bir MySQL veritabanı aç, bağlantı adresini kopyala.
2. **GitHub'a yükle:** Bu klasörü (zip'i açtıktan sonra) `belkagolf-website`
   deposuna yaptığın gibi kendi GitHub hesabında yeni bir depoya (`bitcolosia`
   gibi) yükle.
3. **Vercel'de projeyi bağla:** Vercel panelinde "Add New Project" → GitHub
   deposunu seç → Framework otomatik "Vite" olarak algılanacak, dokunma.
4. **Ortam değişkenlerini gir:** Yukarıdaki tabloyu Vercel'in Environment
   Variables ekranına tek tek gir, sonra "Deploy" de.
5. **Veritabanı şemasını kur:** Deploy bittikten sonra, bilgisayarında bu
   klasörde `DATABASE_URL` değişkenini terminale tanımlayıp `pnpm db:push`
   komutunu bir kere çalıştır — bu, veritabanında gerekli tabloları oluşturur.
6. **Cron işlerini doğrula:** Vercel projenin "Cron Jobs" sekmesinde dört işin
   listelendiğini gör. Her birinin yanındaki "Run" (veya "Trigger") düğmesiyle
   elle bir kez çalıştırıp hata almadığından emin ol.
7. **24 saat izle:** Ertesi gün saat 10:30, 10:45 ve 11:30'da (İstanbul saati)
   haber odalarının gerçekten güncellendiğini kontrol et.

## Önemli not — Vercel plan sınırı

Vercel'in ücretsiz (Hobby) planında Cron işlerinin sayısı ve çalışma sıklığı
sınırlıdır. Dört günlük iş tanımlı bu projede hepsinin sorunsuz çalışması için
Vercel hesabının Cron Jobs sayfasında bir sınırlama uyarısı görürsen, Pro plana
geçmen gerekebilir. Bu, senin belkagolf.com/belkagolfapart.com için kullandığın
plandan bağımsız, ayrı bir karardır çünkü bu proje düzenli arka plan işleri
çalıştırıyor (statik bir site değil).
