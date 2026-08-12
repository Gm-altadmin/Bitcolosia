import { Activity, Award, BookOpen, BrainCircuit, Database, Droplets, LandPlot, Medal, RefreshCw, ShieldCheck, Sparkles, Star, TriangleAlert, Trophy } from "lucide-react";
import { useState } from "react";
import { useAuth } from "@/_core/hooks/useAuth";
import { startLogin } from "@/const";
import { trpc } from "@/lib/trpc";
import { SixNewsroomLaunch } from "@/components/commentators/SixNewsroom";

const CATEGORIES = [
  { id: "reserve", title: "Sektör 1: Global Rezerv ve Dijital Altın", subtitle: "1 parsel · ülkenin temel ekonomik direği", tint: "amber" },
  { id: "infrastructure", title: "Sektör 2: Altyapı, Akıllı Sözleşmeler ve Katman-1", subtitle: "34 parsel · ekosistem altyapısı", tint: "aqua" },
  { id: "frontier", title: "Sektör 3: Yapay Zekâ ve Gelecek Teknolojileri", subtitle: "15 parsel · veri ve gelecek teknolojileri", tint: "violet" },
  { id: "liquidity", title: "Sektör 4: Kurumsal Finans, RWA ve Likidite", subtitle: "20 parsel · finansal akış", tint: "coral" },
  { id: "archive", title: "Sektör 5: Depolama, Veri Güvenliği ve Gizlilik", subtitle: "15 parsel · arşiv ve koruma", tint: "green" },
  { id: "commons", title: "Sektör 6: Küresel Topluluk, GameFi ve Kültür Varlıkları", subtitle: "15 parsel · topluluk ve kültür", tint: "gold" },
] as const;

function asNumber(value: unknown) { const parsed = Number(value); return Number.isFinite(parsed) ? parsed : 0; }
function formatUsd(value: number | null) { return value === null ? "—" : new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: value < 1 ? 5 : 2 }).format(value); }
function formatLitres(value: unknown) { return `${new Intl.NumberFormat("tr-TR", { minimumFractionDigits: 3, maximumFractionDigits: 3 }).format(asNumber(value))} L`; }
function formatChange(value: number | null) { return value === null ? "—" : `${value > 0 ? "+" : ""}${value.toFixed(2)}%`; }
function localTime(value: string | Date | undefined | null, timeZone?: string | null) {
  return value ? new Intl.DateTimeFormat("tr-TR", { timeZone: timeZone ?? undefined, day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit", hourCycle: "h23" }).format(new Date(value)) : "Hazırlanıyor";
}

function Sparkline({ points, change }: { points: number[]; change: number | null }) {
  if (points.length < 2) return <span className="sparkline-empty" title="Fiyat geçmişi henüz alınamadı">—</span>;
  const width = 78, height = 26, inset = 2, min = Math.min(...points), max = Math.max(...points), range = max - min || 1;
  const path = points.map((point, index) => {
    const x = inset + index * ((width - inset * 2) / (points.length - 1));
    const y = height - inset - ((point - min) / range) * (height - inset * 2);
    return `${index === 0 ? "M" : "L"}${x.toFixed(2)},${y.toFixed(2)}`;
  }).join(" ");
  return <svg className={change !== null && change < 0 ? "sparkline down" : "sparkline up"} viewBox={`0 0 ${width} ${height}`} role="img" aria-label="Son 24 saatlik fiyat eğilimi"><path d={path} /></svg>;
}

export function MarketDashboard() {
  const { user, isAuthenticated } = useAuth();
  const [timezoneStatus, setTimezoneStatus] = useState<string | null>(null);
  const [commentatorStatus, setCommentatorStatus] = useState<string | null>(null);
  const [awardPreview, setAwardPreview] = useState<{
    previews: Array<{ sectorId: string; displayName: string; actualWinnerReportIndex: number | null; goldStar: boolean; silverMedal: boolean; rawSurplusLitres: number; creditedLitres: number; status: string }>;
    totalRawSurplusLitres: number;
    totalCreditedLitres: number;
  } | null>(null);
  const snapshot = trpc.market.snapshot.useQuery(undefined, { refetchInterval: 60_000, refetchOnWindowFocus: false, retry: 1 });
  const parcelsQuery = trpc.parcels.overview.useQuery(undefined, { refetchInterval: 60_000, refetchOnWindowFocus: false, retry: 1 });
  const commentatorQuery = trpc.commentators.overview.useQuery(undefined, { refetchInterval: 60_000, refetchOnWindowFocus: false, retry: 1 });
  const ceremonyQuery = trpc.commentators.ceremonyView.useQuery(undefined, { refetchInterval: 60_000, refetchOnWindowFocus: false, retry: 1 });
  const analysisQuery = trpc.commentators.analysisView.useQuery(undefined, { refetchInterval: 30_000, refetchOnWindowFocus: false, retry: 1 });
  const timezoneMutation = trpc.parcels.updateTimezone.useMutation({
    onSuccess: result => {
      setTimezoneStatus(`Kaydedildi: ${result.timezone} · günlük 10:30 (${result.cronUtc} UTC)`);
      parcelsQuery.refetch();
    },
    onError: error => setTimezoneStatus(`Kaydedilemedi: ${error.message}`),
  });
  const data = snapshot.data;
  const parcelData = parcelsQuery.data;
  const moodLabel = data?.marketMood === "rising" ? "Yükseliş" : data?.marketMood === "falling" ? "Düşüş" : "Denge";
  const marketDirectionChange = data?.marketCapWeighted24hChangePct ?? data?.average24hChangePct ?? null;
  const marketDirectionNote = data?.marketDirectionBasis === "market_cap_weighted" ? "piyasa değeri ağırlıklı" : data?.marketDirectionBasis === "equal_weight_fallback" ? "eşit ağırlıklı yedek hesap" : "hesaplanamadı";
  const parcelByReportIndex = new Map(parcelData?.parcels.map(parcel => [parcel.reportIndex, parcel]) ?? []);
  const recordByReportIndex = new Map(data?.reportRecords.map(record => [record.reportIndex, record]) ?? []);
  const totalParcelValue = parcelData?.parcels.reduce((sum, parcel) => sum + asNumber(parcel.currentValueLitres), 0) ?? 0;
  const referencePriceCount = parcelData?.parcels.filter(parcel => parcel.referenceUsdPrice !== null && parcel.referenceUsdPrice !== undefined).length ?? 0;
  const canManageTimezone = isAuthenticated && user?.role === "admin";
  const generateForecasts = trpc.commentators.generateForecasts.useMutation({
    onSuccess: result => {
      setCommentatorStatus(`${result.createdCycles} sektör için kilitli tahmin hazırlandı.`);
      commentatorQuery.refetch();
    },
    onError: error => setCommentatorStatus(`Tahmin hazırlanamadı: ${error.message}`),
  });
  const runAwards = trpc.commentators.runAwards.useMutation({
    onSuccess: result => {
      setCommentatorStatus(result.waitingForFreshOutcome ? "Ödül için önce taze 10:30 sonuç kesiti gerekir." : `${result.awardedCycles} sektörün ödül hesabı tamamlandı.`);
      commentatorQuery.refetch();
    },
    onError: error => setCommentatorStatus(`Ödül hesaplanamadı: ${error.message}`),
  });
  const previewAwards = trpc.commentators.previewAwards.useMutation({
    onSuccess: result => {
      setAwardPreview(result);
      setCommentatorStatus("Deneme sonucu hazırlandı; gerçek yıldız, madalya ve baraj kaydı yazılmadı.");
    },
    onError: error => setCommentatorStatus(`Deneme sonucu hazırlanamadı: ${error.message}`),
  });

  return <main className="market-shell">
    <header className="market-header">
      <div className="market-brand"><span className="market-mark">B</span><div><p>BITCOLOSIA</p><h1>Dünya Varlık Akışı</h1></div></div>
      <div className="market-status"><span className={snapshot.isFetching ? "status-dot loading" : "status-dot"} />{snapshot.isLoading ? "Veri alınıyor" : data?.stale ? "Son başarılı veri" : "Canlı snapshot"}</div>
    </header>

    <section className="market-intro">
      <div><p className="kicker">VATANDAŞ PARSELLERİ · SALT-OKUNUR PİYASA EKRANI</p><h2>100 vatandaş, altı eyalet, günlük değerleme.</h2><p>Her parsel 1.000 L taban değeriyle başlar; ülkenin toplam başlangıç bütçesi 100.000 L’dir. 1 USD = 1 L ve 1 L = 1.000 mL kuralıyla yalnızca günlük fiyat farkı parseli etkiler; vatandaş başına etki en fazla ±10 L’dir. Bu ekran gerçek alım-satım veya yatırım önerisi içermez.</p></div>
      <button className="refresh-button" onClick={() => { snapshot.refetch(); parcelsQuery.refetch(); }} disabled={snapshot.isFetching || parcelsQuery.isFetching}><RefreshCw size={15} className={snapshot.isFetching || parcelsQuery.isFetching ? "spin" : ""}>{undefined}</RefreshCw>{snapshot.isFetching || parcelsQuery.isFetching ? "Güncelleniyor" : "Şimdi güncelle"}</button>
    </section>

    <section className="parcel-strip" aria-label="Vatandaş parsel ekonomisi">
      <article><span><LandPlot size={14} />Vatandaş parselleri</span><strong>{parcelData?.parcels.length ?? 100}</strong><small>Her vatandaş için 1 sanal parsel</small></article>
      <article><span><LandPlot size={14} />Başlangıç / güncel toplam</span><strong>{formatLitres(totalParcelValue || 100_000)}</strong><small>1.000 L × vatandaş sayısı · 1 USD = 1 L</small></article>
      <article><span><Activity size={14} />İlk günlük değerleme</span><strong>{localTime(parcelData?.settings?.nextValuationAt, parcelData?.settings?.timezone)}</strong><small>Her sabah 10:30 · {parcelData?.settings?.timezone ?? "saat dilimi hazırlanıyor"}</small>{canManageTimezone ? <button className="timezone-button" onClick={() => timezoneMutation.mutate({ timezone: Intl.DateTimeFormat().resolvedOptions().timeZone })} disabled={timezoneMutation.isPending}>{timezoneMutation.isPending ? "Kaydediliyor" : "Bu tarayıcı saatini kaydet"}</button> : isAuthenticated ? <small className="timezone-note">Saat dilimi yalnızca yönetici tarafından değiştirilebilir.</small> : <button className="timezone-button" onClick={startLogin}>Yönetici girişi yap</button>}{timezoneStatus && <small className={timezoneStatus.startsWith("Kaydedildi") ? "timezone-feedback success" : "timezone-feedback error"}>{timezoneStatus}</small>}</article>
    </section>

    <section className="commentator-program" aria-label="Sektör yorumcuları, ödül töreni ve su barajı">
      <header className="commentator-program-header">
        <div>
          <p className="kicker">YORUMCU KONSEYİ · KİLİTLİ ÖNGÖRÜ OYUNU</p>
          <h3>10:45 ödül töreni ve yönetici su barajı</h3>
          <p>Altı yorumcu kendi sektöründe araştırır; 11:30’da dört tahmini kilitler. Yıldız ve madalya, ertesi günün doğrulanmış sonucu ile yalnızca kendi sektöründe hesaplanır.</p>
        </div>
        {canManageTimezone && <div className="commentator-controls">
          <button onClick={() => generateForecasts.mutate()} disabled={generateForecasts.isPending}><BrainCircuit size={15} />{generateForecasts.isPending ? "Yorum hazırlanıyor" : "11:30 tahminlerini hazırla"}</button>
          <button className="award-action" onClick={() => runAwards.mutate()} disabled={runAwards.isPending}><Trophy size={15} />{runAwards.isPending ? "Ödüller hesaplanıyor" : "10:45 ödüllerini hesapla"}</button>
          <button onClick={() => previewAwards.mutate()} disabled={previewAwards.isPending}><Activity size={15} />{previewAwards.isPending ? "Deneme ölçülüyor" : "Deneme sonucunu gör"}</button>
          {commentatorStatus && <small className={commentatorStatus.includes("hazırlanamadı") || commentatorStatus.includes("hesaplanamadı") ? "commentator-feedback error" : "commentator-feedback success"}>{commentatorStatus}</small>}
        </div>}
      </header>

      <div className="reservoir-hero">
        <div className="reservoir-icon"><Droplets size={23} /></div>
        <div><span>Yönetici su barajı</span><strong>{formatLitres(commentatorQuery.data?.reservoir.creditedLitres ?? 0)}</strong><small>Doğrulanmış ham fazlalık: {formatLitres(commentatorQuery.data?.reservoir.verifiedSurplusLitres ?? 0)} · {commentatorQuery.data?.reservoir.transactions ?? 0} kayıt</small></div>
        <div className="reservoir-rule"><ShieldCheck size={16} /><span>Varlık başına en fazla 100 L, sektör başına günde en fazla 250 L kredi.</span></div>
      </div>
      <section className="ceremony-stage" aria-label="Vercel uyumlu ödül töreni veri görünümü">
        <header>
          <div><p className="kicker">ÖDÜL TÖRENİ · SERVERLESS VERİ AKIŞI</p><strong>{ceremonyQuery.data?.status === "completed" ? "Bugünün sonuçları açıklandı" : ceremonyQuery.data?.status === "awaiting_outcome" ? "Kilitli tahminler sonuç kesitini bekliyor" : "Yeni tahmin turu bekleniyor"}</strong></div>
          <span>{ceremonyQuery.data?.nextCeremonyLocalTime ?? "10:45 Europe/Istanbul"}</span>
        </header>
        <div className="ceremony-metrics">
          <article><Star size={17} fill="currentColor" /><b>{ceremonyQuery.data?.stats.goldStars ?? 0}</b><small>Bugünkü altın yıldız</small></article>
          <article><Medal size={17} /><b>{ceremonyQuery.data?.stats.silverMedals ?? 0}</b><small>Gümüş madalya</small></article>
          <article><Droplets size={17} /><b>{formatLitres(ceremonyQuery.data?.reservoir.creditedLitres ?? 0)}</b><small>Doğrulanmış baraj bakiyesi</small></article>
        </div>
        <div className="ceremony-rail">
          {(ceremonyQuery.data?.sectors ?? []).map(sector => {
            const winner = sector.award?.actualWinnerReportIndex ? recordByReportIndex.get(sector.award.actualWinnerReportIndex) : null;
            return <div key={sector.sectorId} className={sector.award?.status === "awarded" ? "ceremony-sector awarded" : "ceremony-sector"}>
              <span>{sector.commentatorName}</span>
              <strong>{winner ? winner.symbol : "Sonuç bekliyor"}</strong>
              <small>{sector.award?.goldStarAwarded ? "Altın yıldız" : sector.award?.silverMedalAwarded ? "Gümüş madalya" : sector.cycleStatus === "locked" ? "Kilitli öngörü" : "Yeni tur bekliyor"}</small>
            </div>;
          })}
          {ceremonyQuery.isLoading && <span className="ceremony-loading">Tören verisi yükleniyor…</span>}
        </div>
      </section>
      <section className="commentator-analysis" aria-label="Yorumcu analiz merkezi">
        <header className="analysis-heading">
          <div><p className="kicker">YORUMCU ANALİZ MERKEZİ · CANLI HAFIZA</p><h2>Başarı, hata dersi ve operasyon durumu</h2></div>
          <span className="analysis-freshness"><Activity size={13} /> {analysisQuery.isFetching ? "Güncelleniyor" : "Canlı kayıt"}</span>
        </header>
        <div className="commentator-status-bar">
          {(analysisQuery.data?.commentators ?? []).map(commentator => {
            const text = commentator.state === "awarded" ? "Ödül aldı" : commentator.state === "locked" ? "Kilitlendi" : commentator.state === "researching" ? "Araştırıyor" : "Bekliyor";
            return <div className={`status-pip ${commentator.state}`} key={commentator.sectorId}><span /><b>{commentator.displayName}</b><small>{text}</small></div>;
          })}
          {analysisQuery.isLoading && <span className="analysis-loading">Yorumcu durumları yükleniyor…</span>}
        </div>
        <div className="analysis-grid">
          <article className="analyst-history-card">
            <header><BrainCircuit size={18} /><div><strong>Öğrenme günlüğü</strong><small>Geçmiş tahminlerden gerçek dersler</small></div></header>
            <div className="analyst-list">
              {(analysisQuery.data?.commentators ?? []).map(commentator => <div key={commentator.sectorId} className="analyst-row">
                <div><b>{commentator.displayName}</b><span>{commentator.evaluatedCycles ? `%${commentator.exactHitRate ?? 0} tam isabet · ${commentator.silverHits} gümüş` : "İlk sonuç kesiti bekleniyor"}</span></div>
                <strong><Star size={12} fill="currentColor" /> {commentator.starCount}</strong>
                <small>{commentator.latestLesson ?? commentator.latestLearning ?? "Kaydedilmiş öğrenme notu bekleniyor."}</small>
              </div>)}
            </div>
          </article>
          <article className="reservoir-motion-card">
            <header><Droplets size={18} /><div><strong>Su barajı hareketi</strong><small>Yalnızca doğrulanmış gerçekleşmiş fazlalık</small></div></header>
            <div className="reservoir-meter" aria-label="Su barajı doluluk animasyonu"><div className={analysisQuery.data?.reservoir.creditedLitres ? "reservoir-wave flowing" : "reservoir-wave"} style={{ width: `${Math.min(100, Math.max(0, (analysisQuery.data?.reservoir.creditedLitres ?? 0) / 15))}%` }} /></div>
            <strong className="motion-total">{formatLitres(analysisQuery.data?.reservoir.creditedLitres ?? 0)}</strong>
            <p>{analysisQuery.data?.reservoir.transactions ? `${analysisQuery.data.reservoir.transactions} doğrulanmış akış kaydı işlendi.` : "İlk resmî ödül töreninden sonra su hareketi burada canlanacak."}</p>
          </article>
          <article className="medal-motion-card">
            <header><Trophy size={18} /><div><strong>Madalya yolu</strong><small>Gerçek sektör kazananları</small></div></header>
            <div className="medal-stream">
              {(analysisQuery.data?.medals ?? []).map(medal => <div className="medal-token" key={medal.cycleId}><Medal size={15} /><span>{medal.symbol}</span>{medal.goldStar && <Star size={12} fill="currentColor" />}</div>)}
              {!analysisQuery.data?.medals.length && <span className="medal-empty">İlk doğrulanmış madalya 10:45 töreninden sonra görünür.</span>}
            </div>
          </article>
        </div>
      </section>
      <SixNewsroomLaunch commentators={analysisQuery.data?.commentators ?? []} />
      {awardPreview && <div className="award-preview" aria-label="Salt-okunur deneme ödül sonucu">
        <header><span><Activity size={14} />Deneme sonucu · canlı veriyle ölçüldü</span><small>Gerçek yıldız, madalya ve baraj kaydı yazılmadı.</small></header>
        <strong>Varsayımsal baraj katkısı: {formatLitres(awardPreview.totalCreditedLitres)} <small>· ham fazlalık {formatLitres(awardPreview.totalRawSurplusLitres)}</small></strong>
        <div>{awardPreview.previews.map(preview => <span key={preview.sectorId}>{preview.displayName}: {preview.actualWinnerReportIndex ? recordByReportIndex.get(preview.actualWinnerReportIndex)?.symbol ?? `#${preview.actualWinnerReportIndex}` : "kazanan yok"}{preview.goldStar ? " · altın yıldız" : preview.silverMedal ? " · gümüş madalya" : ""} · {formatLitres(preview.creditedLitres)}</span>)}</div>
      </div>}

      {commentatorQuery.isLoading ? <div className="commentator-loading"><Activity size={17} />Yorumcu konseyinin hafıza günlüğü hazırlanıyor…</div> : <div className="commentator-grid">
        {(commentatorQuery.data?.commentators ?? []).map(commentator => {
          const award = commentator.award;
          const winner = award?.actualWinnerReportIndex ? recordByReportIndex.get(award.actualWinnerReportIndex) : null;
          return <article className="commentator-card" key={commentator.id}>
            <header>
              <div className="commentator-avatar"><BrainCircuit size={17} /></div>
              <div><strong>{commentator.displayName}</strong><span>{commentator.responsibility}</span></div>
              <div className="star-count"><Star size={14} fill="currentColor" />{commentator.starCount}</div>
            </header>
            <div className="commentator-cycle-status">
              <span><BookOpen size={13} />{commentator.latestCycle ? `Tahmin kilidi: ${localTime(commentator.latestCycle.lockedAt, "Europe/Istanbul")}` : "İlk 11:30 turu bekleniyor"}</span>
              {award?.status === "awarded" && <span className="award-complete"><Award size={13} />10:45 sonucu kaydedildi</span>}
              {award?.status === "no_positive_result" && <span className="award-neutral">Bu turda pozitif kazanan oluşmadı</span>}
            </div>
            <div className="forecast-list">
              {commentator.forecasts.length ? commentator.forecasts.map(forecast => {
                const record = recordByReportIndex.get(forecast.reportIndex);
                const isWinner = award?.actualWinnerReportIndex === forecast.reportIndex;
                return <div className={`forecast-row rank-${forecast.forecastRank}`} key={forecast.id}>
                  <b>{forecast.forecastRank}</b>
                  <span>{record?.symbol ?? `#${forecast.reportIndex}`}</span>
                  <small>{forecast.rationale}</small>
                  {isWinner && <Medal size={15} className="silver-medal" aria-label="Gümüş yuvarlak madalya" />}
                  {isWinner && award?.goldStarAwarded ? <Sparkles size={15} className="gold-star" aria-label="Altın yıldız" /> : null}
                </div>;
              }) : <p className="forecast-empty">Araştırma günlüğü açık; ilk dört tahmin 11:30’da kilitlenecek.</p>}
            </div>
            <footer>
              {winner ? <span><Trophy size={13} />Gerçek kazanan: {winner.symbol} · {formatLitres(award?.actualWinnerDeltaLitres ?? 0)}</span> : <span>Güncel hata/öğrenme günlüğü</span>}
              <span>{commentator.journal[0]?.body ?? "Yeni araştırma notu bekleniyor."}</span>
            </footer>
          </article>;
        })}
      </div>}
    </section>

    {snapshot.isLoading && <section className="market-loading-panel"><Activity size={18} /><span>98 benzersiz sağlayıcı kaydı tek toplu istekte yükleniyor…</span></section>}
    {snapshot.isError && <section className="market-error-panel"><TriangleAlert size={18} /><div><strong>Veri akışı şu an alınamadı.</strong><p>Bir sonraki otomatik yenileme denenecek. İsterseniz şimdi güncelle düğmesini kullanın.</p></div></section>}

    {data && <>
      <section className="market-summary" aria-label="Piyasa özeti">
        <article><span><Activity size={14} />Piyasa yönü</span><strong className={data.marketMood}>{moodLabel}</strong><small>{formatChange(marketDirectionChange)} · {marketDirectionNote}</small></article>
        <article><span><Database size={14} />Rapor kapsamı</span><strong>{data.reportRecordCount}</strong><small>{referencePriceCount}/100 parsel için fiyat referansı · SANG beklemede</small></article>
        <article><span><ShieldCheck size={14} />Son güncelleme</span><strong>{localTime(data.fetchedAt)}</strong><small>{data.stale ? "Önbellekteki son başarılı veri" : "Veri kaynağı: CoinGecko"}</small></article>
      </section>

      <section className="category-grid" aria-label="Altı varlık kategorisi">
        {CATEGORIES.map((category) => {
          const rows = data.reportRecords.filter((record) => record.provinceId === category.id).slice().sort((a, b) => {
            if (a.change24hPct === null) return 1;
            if (b.change24hPct === null) return -1;
            return b.change24hPct - a.change24hPct;
          });
          const province = parcelData?.provinces[category.id];
          return <article className={`category-card ${category.tint}`} key={category.id}>
            <header><div><p>{category.title}</p><span>{category.subtitle}</span><small>{province ? `${province.citizenCount} vatandaş · ${formatLitres(province.totalValueLitres)} parsel toplamı` : "Vatandaş parselleri hazırlanıyor"}</small></div><b>{rows.length}</b></header>
            <div className="category-columns"><span>Vatandaş · 24 SA. değişime göre sıralı</span><span>USD</span><span>PARSEL</span><span>GRAFİK</span><span>24 SA.</span></div>
            <div className="category-rows">{rows.map((row) => {
              const parcel = parcelByReportIndex.get(row.reportIndex);
              return <div className="data-row" key={row.reportIndex}>
                <div><strong>{row.symbol}</strong><span>{row.name}{row.duplicateReportRecord ? " · tekrar" : ""}</span></div>
                <b>{formatUsd(row.usdPrice)}</b>
                <span className="parcel-value" title={parcel ? `${parcel.parcelCode} · ${parcel.referenceUsdPrice === null ? "fiyat referansı bekliyor" : "sanal oyun parseli"}` : "Parsel hazırlanıyor"}>{parcel ? formatLitres(parcel.currentValueLitres) : "1.000 L"}</span>
                <Sparkline points={row.sparkline} change={row.change24hPct} />
                <em className={row.change24hPct === null ? "missing" : row.change24hPct >= 0 ? "up" : "down"}>{formatChange(row.change24hPct)}</em>
                {row.availability === "unavailable" && <small>Referans fiyat bekliyor · {row.note ?? "Eşleşme beklemede"}</small>}
              </div>;
            })}</div>
          </article>;
        })}
      </section>
      <footer className="market-footer"><span>Günlük parsel değerlemesi: 10:30 Europe/Istanbul</span><span>1 erişilemeyen rapor kaydı: SANG / Sango Coin</span><span>Parsel değerleri yalnızca BitColosİa sanal ekonomisindedir.</span></footer>
    </>}
  </main>;
}
