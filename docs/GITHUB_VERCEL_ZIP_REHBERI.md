# BitColosİa: ZIP → GitHub → Vercel Rehberi

Bu rehber, projeyi güvenli bir kaynak paketi olarak bilgisayarınıza indirip önce GitHub’a, ardından Vercel’e bağlama akışını anlatır. Oluşturulan ZIP paketi **kaynak kodu içerir**; yerel bağımlılıklar, derleme çıktıları, geliştirme günlükleri, Manus çalışma yapılandırması ve gizli ortam değişkenleri içermez.

> **Önemli:** ZIP paketi çalıştırılabilir Vercel yapılandırmasını içerir; ancak veritabanı, oturum açma, yapay zekâ ve günlük işler için Vercel’de kendi hizmetlerinizi ve ortam değişkenlerinizi bağlamanız gerekir. Mevcut Manus anahtarları veya oturumları taşınmaz.

## 1. ZIP paketini indirip VS Code’da açın

`bitcolosia-vercel-export.zip` dosyasını indirin ve bilgisayarınızda boş bir klasöre çıkarın. VS Code’da **File → Open Folder** ile bu klasörü açın. Terminalde aşağıdaki komutlarla ilk bağımlılık kurulumunu yapın:

```bash
pnpm install --frozen-lockfile
pnpm test
pnpm check
pnpm build:vercel
```

| Dosya / klasör | Amaç |
|---|---|
| `api/index.ts` | Vercel serverless API giriş noktasıdır. |
| `vercel.json` | Vercel yönlendirme ve dağıtım ayarlarını içerir. |
| `vercel.crons.example.json` | Günlük 10:30, 10:45 ve 11:30 işler için örnek zamanlama ayarlarıdır. |
| `docs/ENVIRONMENT_TEMPLATE.md` | Vercel’e eklenecek ortam değişkenlerinin amaçlarını açıklar. |
| `docs/VERCEL_GITHUB_MIGRATION.md` | Servis eşleştirme ve taşıma ayrıntılarını içerir. |

## 2. GitHub’da boş depo oluşturun

GitHub’da **New repository** seçin. Örnek depo adı `bitcolosia-water-operation` olabilir. Başlangıç için depoyu **Private** seçmek daha güvenlidir. README, `.gitignore` veya lisans eklemeden boş depo oluşturun.

VS Code terminalinde, GitHub’ın size gösterdiği `KULLANICI_ADI` değerini yerleştirerek aşağıdaki komutları çalıştırın:

```bash
git init
git add .
git commit -m "BitColosİa Vercel kaynak sürümü"
git branch -M main
git remote add origin https://github.com/KULLANICI_ADI/bitcolosia-water-operation.git
git push -u origin main
```

GitHub web sitesinde dosya yüklemeyi tercih ederseniz, ZIP dosyasını önce bilgisayarınızda **çıkarın**; GitHub ZIP dosyasını kaynak klasörlerine otomatik ayırmaz. Çıkarılan klasörün içeriğini boş depoya yükleyin.

## 3. Vercel projesini GitHub deposundan içe aktarın

Vercel kontrol panelinde **Add New → Project** seçin ve GitHub hesabınızı bağlayın. Yeni oluşturduğunuz depoyu seçin. Proje ayarlarında aşağıdaki değerleri kullanın:

| Ayar | Değer |
|---|---|
| Framework Preset | Vite |
| Install Command | `pnpm install --frozen-lockfile` |
| Build Command | `pnpm build:vercel` |
| Output Directory | `dist/public` |
| Node.js | `22.x` |

İlk dağıtımda yalnızca arayüzün açılması yeterli olabilir. API, kullanıcı oturumu, araştırma ajanı ve günlük zamanlayıcılar için bir sonraki adımda ortam değişkenleri ile dış servis bağlantılarını ekleyin.

## 4. Ortam değişkenlerini ekleyin

Vercel’de **Project Settings → Environment Variables** bölümüne gidin. `docs/ENVIRONMENT_TEMPLATE.md` belgesindeki her değişkeni kendi Vercel uyumlu değerinizle ekleyin. Gerçek değerleri hiçbir zaman GitHub’a yüklemeyin ve `.env` dosyasını commitlemeyin.

Özellikle aşağıdaki alanlar taşınma sırasında yeniden kurulmalıdır:

| Alan | Taşıma gereksinimi |
|---|---|
| Veritabanı | Vercel’den erişilebilen MySQL/TiDB bağlantı adresi ve `DATABASE_URL`. |
| Oturum açma | Yeni Vercel alan adı için OAuth dönüş URL’si ve uygulama kimlik bilgileri. |
| Yapay zekâ | Vercel’de kullanılacak ayrı sağlayıcı anahtarı veya sunucu tarafı model hizmeti. |
| Zamanlayıcılar | `vercel.crons.example.json` içindeki çağrıları güvenli cron uçları ve doğrulama anahtarlarıyla etkinleştirme. |

## 5. Dağıtım sonrası kontrol

Dağıtımdan sonra Vercel alan adınızı açın ve şu kontrolleri yapın: ana piyasa ekranı yüklenmeli, `/haber-odalari/reserve` gibi oda yolları doğrudan açılmalı, API hata vermemeli ve Vercel günlüklerinde gizli değer görünmemelidir. Zamanlanmış işleri ancak veritabanı ve cron doğrulama anahtarları hazır olduğunda etkinleştirin.

## Yeniden ZIP oluşturma

VS Code terminalinde aşağıdaki komutu çalıştırarak yeni, temiz bir paket üretebilirsiniz:

```bash
bash scripts/create-github-vercel-zip.sh
```

Komut, paketi proje klasörünün bir üst dizininde `bitcolosia-vercel-export.zip` adıyla oluşturur ve dışlanması gereken dosyalar varsa işlemi durdurur.
