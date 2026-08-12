# BitColosİa Yorumcu Konseyi — Otomasyon Durumu

**Güncelleme zamanı:** 12 Ağustos 2026  
**Durum:** Zamanlayıcılar etkin; ilk gerçek çalıştırma kayıtları henüz oluşmadı.

| Yerel zaman (Europe/Istanbul) | İş | UTC cron | Kalıcı iş kimliği | Beklenen ilk çalışma |
|---|---|---|---|---|
| 10:30 | Parsel değerlemesi ve yorumcu sonuç snapshot’ı | `0 30 7 * * *` | `RN29edpgyS52ERgMViMgL9` | 13 Ağustos 2026 10:30 |
| 10:45 | Sektör bazlı ödül ve su barajı kredisi | `0 45 7 * * *` | `8LP6EgVq7nckVSmn27aA5x` | 13 Ağustos 2026 10:45 |
| 11:30 | Altı yorumcunun kilitli dört varlık tahmini | `0 30 8 * * *` | `fos6fdivC7xFpGXjuB5WdZ` | 13 Ağustos 2026 11:30 |
| 20:00 | Kaynaklı gerçek dünya araştırma günlüğü | Günlük, Europe/Istanbul | `AeQCuTQUwnt8wbcAXJAHi3` | 12 Ağustos 2026 20:00 |

## Güvenlik ve denetim sınırları

Her 10:45 ve 11:30 HTTP zamanlayıcısı, kendi kalıcı iş kimliğinin veritabanında kayıtlı olduğunu doğrular. Tanınmayan bir zamanlayıcı çağrısı hata yerine güvenli biçimde atlanır. Araştırma ajanı yalnızca kaynak türü, bağlantı, başlık ve kısa nottan oluşan yapılandırılmış kayıtları gönderebilir; yatırım tavsiyesi, uydurma kaynak veya doğrulanmamış sosyal medya iddiası yazmamalıdır.

## İlk çalıştırma sonrasında doğrulanacaklar

Önce 20:00 araştırma ajanının `commentator_journal_entries` tablosuna kaynaklı kayıt yazdığı; ardından 11:30 tahmin işinin altı kilitli tur ürettiği; 10:30 sonuç snapshot’ının taze olduğu; son olarak 10:45 ödül işinin yıldız, gümüş madalya ve su barajı hareketlerini yalnızca birer kez yazdığı kontrol edilecektir.

## 12 Ağustos 2026 doğrulama kaydı

Önizleme sayfasında Yorumcu Konseyi, 10:45 ödül alanı ve su barajı kartı yüklendi. Altı sektör yorumcusunun her birinde bir kaynaklı araştırma notu görünür; her yorumcunun yıldız sayısı sıfır ve ilk 11:30 tahmin turu beklemede. Bu durum, ilk tahmin turu gerçekleşmeden önce beklenen başlangıç durumudur.
