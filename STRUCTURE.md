# Haber Odası Yapısı

| Katman | Dosya | Sorumluluk |
|---|---|---|
| Eski ortak prototip | `client/src/components/commentators/CommentatorNewsroom.tsx` | Önceki tek oda prototipi; iç referans olarak korunur |
| Altı oda çerçevesi | `client/src/components/commentators/SixNewsroom.tsx` | Oda seçicisi, `/haber-odalari/:sectorId` rota ekranı, erişilebilir kâğıt metni |
| Three.js sahnesi | `client/src/game/threeSectorNewsroom.ts` | Sektöre göre prosedürel masa/karakter/kobolt sahnesi, dinamik yükleme ve kaynak temizliği |
| Oda kimliği | `client/src/game/sectorNewsroom.ts` | Altı renk teması, masa sembolü, kobolt rolü ve yalnızca gerçek günlükten üretilen not metni |
| Stil | `client/src/components/commentators/six-newsroom.css` | Responsive altı oda seçicisi, oda sayfası, azaltılmış hareket ve CSS görünür yedek katmanı |
| Veri | `commentators.overview` + `commentators.analysisView` | Gerçek yorumcu adı, durum, günce, tahmin ve hata/öğrenme notu |

Her sektör oda URL’si altında tekil bir Three.js ortamı alır: `/haber-odalari/reserve`, `/haber-odalari/infrastructure`, `/haber-odalari/frontier`, `/haber-odalari/liquidity`, `/haber-odalari/archive` ve `/haber-odalari/commons`. Vercel SPA yeniden yazımı bu altı yolu aynı alan adı altında sunar.
