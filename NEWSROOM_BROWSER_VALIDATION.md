# Haber Odası Tarayıcı Doğrulaması

**Tarih:** 12 Ağustos 2026, Europe/Istanbul

`?newsroom=1` önizlemesinde tüm canlı sorgular tamamlandıktan sonra **YORUMCU HABER ODALARI · 3B CANLI SAHNE** kartı, “Haber odasını aç” düğmesi ve altı yorumcunun kilitli araştırma kayıtları birlikte görüntülendi. Haber odası, ana veri panosuna yük getirmemek için Babylon motorunu yalnızca kullanıcı düğmeyi açtığında dinamik olarak yükler.

Sayfa içi aramada “Haber odasını aç” eylemi bulundu. Bu eylem, Sektör 1–6 için Aren Altın, Derya Ağ, Lina Zekâ, Bora Likit, Ece Veri ve Mert Kültür’ün kilitli günlüğü ile aynı canlı konsey alanında yer alır.

“Haber odasını aç” eylemiyle modal açıldı; Aren Altın seçicisi, kilitli durum etiketi ve gerçek öğrenme notu görüntülendi. İlk görsel denemede 3B canvas alanı yalnızca arka plan tonunu gösterdi; prosedürel sahne görünür olmadığından render hatası ayrıca incelenecek.

Etkin kamera tanımı eklendikten sonra modal kapatılıp yeniden açıldı. Babylon motorunun WebGL2 başlatma günlüğü alınmasına rağmen canvas alanında masa/karakter meshleri görünmedi; görünür ve erişilebilir sahne katmanı için ek düzeltme gereklidir.

Tam sayfa önizleme doğrulamasında haber odası erişim kartı; ödül töreni, analiz merkezi ve altı yorumcu kartı arasında yerleşim bozulmadan görünür kaldı. Dinamik motorun yalnızca modal açılışında yüklendiği ana ekranda doğrulandı.

Temiz `?newsroom=fallback-check` önizlemesinde canlı piyasa ve yorumcu verileri yeniden yüklendi; haber odası kartı tüm yorumcu günlükleri ile hazır durumda kaldı.

Canlı veri yüklendikten sonra sayfa içi aramada “Haber odasını aç” eylemi yeniden bulundu; kullanıcı açma akışı, güncel önizleme oturumunda erişilebilir kaldı.

Güncel önizlemede haber odası kartına kaydırıldığında “Haber odasını aç” düğmesi görünür ve tıklanabilir durumda doğrulandı.

Güncel temiz önizlemede modal açıldıktan sonra sahne görünür biçimde doğrulandı: ortada büyük masa ve uzun beyaz sakallı baş yorumcu; masanın iki yanında not taşıyan iki mavi kobolt haberci gösterildi. Aren Altın seçicisi, kilitli tahmin etiketi ve gerçek hafıza günlüğü notu aynı modalda kaldı.

Altı oda prototipinde `/haber-odalari/infrastructure` rotası doğrudan açıldı. Derya Ağ için Düğümler Galerisi, kilitli tahmin durumu ve sektör oda seçicisi göründü. Sol koboltun kâğıdı doğrulanmış Solana altyapı araştırma notunu; sağ koboltun kâğıdı ise kilitli Solana tahmin gerekçesini gösterdi. Böylece iki koboltun notları ayrı, sektöre bağlı ve gerçek kayıtlardan türetilmiş olarak doğrulandı.

Oda seçicisiyle `/haber-odalari/frontier` ve `/haber-odalari/commons` yolları da denetlendi. Lina Zekâ için mor Zekâ Gözlemevi ile Bittensor araştırma/kilitli TAO gerekçesi; Mert Kültür için altın Kültür Meydanı ile Sandbox araştırma/kilitli FLOW gerekçesi açıldı. Her iki sektörde de sol kobolt kaynak notunu, sağ kobolt öğrenme veya tahmin notunu ayrı gösterdi.
