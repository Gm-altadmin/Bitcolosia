# BitColosİa Ortam Değişkeni Şablonu

Bu belge, yerel `.env.local` dosyanız ve Vercel Project Settings → Environment Variables ekranı için alan adlarını tanımlar. **Gerçek değerleri bu depoya yazmayın.**

```dotenv
# Genel çalışma zamanı
NODE_ENV=development
DATABASE_URL=mysql://USER:PASSWORD@HOST:3306/DATABASE?ssl={"rejectUnauthorized":true}
JWT_SECRET=replace-with-a-long-random-secret

# OAuth
VITE_APP_ID=replace-with-oauth-app-id
VITE_OAUTH_PORTAL_URL=https://replace-with-oauth-portal
OAUTH_SERVER_URL=https://replace-with-oauth-server
OWNER_OPEN_ID=replace-with-admin-open-id
OWNER_NAME=replace-with-admin-name

# Manus'a özel Forge servisleri. Vercel'de eşdeğer sağlayıcı adaptörleri gerekir.
BUILT_IN_FORGE_API_URL=
BUILT_IN_FORGE_API_KEY=
VITE_FRONTEND_FORGE_API_URL=
VITE_FRONTEND_FORGE_API_KEY=

# Vercel Cron, Authorization: Bearer başlığını bu değişken üzerinden üretir.
# Uygulama geçmiş uyumluluğu için VERCEL_CRON_SECRET adını da okuyabilir.
CRON_SECRET=replace-with-a-long-random-secret

# Kaynak güveni araştırma adapteri. Vercel’de GDELT anahtarsız aday kaynağı
# sağlar; bu değerler LLM ile yalnızca çekilmiş kaynak bağlamını özetlemek içindir.
RESEARCH_ADAPTER=gdelt
RESEARCH_LLM_API_URL=https://YOUR-OPENAI-COMPATIBLE-PROVIDER/v1
RESEARCH_LLM_API_KEY=replace-with-server-only-key
RESEARCH_LLM_MODEL=replace-with-small-json-capable-model

# İsteğe bağlı analiz
VITE_ANALYTICS_ENDPOINT=
VITE_ANALYTICS_WEBSITE_ID=
```

> `VITE_` ile başlayan değişkenler istemci derlemesine girebilir. Gizli anahtarları yalnızca sunucu tarafı değişkenlerde tutun.
