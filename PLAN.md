# BitColosİa 3B Haber Odası Planı

## Görsel hedef

Yorumcu Konseyi içinden açılan haber odası, koyu turkuaz ve pirinç tonlu yarı dairesel bir bilgi odasıdır. Ortadaki büyük masada beyaz sakallı baş yorumcu oturur; iki kobolt haberci iki yandan kâğıt not taşır. Kullanıcı seçtiği yorumcunun gerçek araştırma günlüğünü odanın üst katmanında okur.

## Risk ve doğrulama

| Risk | Önlem | Kabul ölçütü |
|---|---|---|
| Düşük cihaz performansı | Az sayıda prosedürel mesh, tek referans dokusu ve sınırlı animasyon | Mobilde akıcı, yıkımsız açılış |
| Hareket hassasiyeti | `prefers-reduced-motion` ile kobolt ve kâğıt hareketlerini durdurma | Azaltılmış harekette statik, okunur sahne |
| Araştırma verisi boşluğu | Mevcut günlüğü gösterme, boşlukta açıklayıcı durum | Uydurma not veya durum yok |
| React yaşam döngüsü | Canvas/engine temiz dispose edilir | Sayfa geçişi ve yeniden açma hatasız |

## Doğrulama

`?newsroom=1` ile sahne açılır; masa, baş yorumcu, iki kobolt, not akışı ve seçili yorumcunun gerçek günlüğü görünür olmalıdır.
