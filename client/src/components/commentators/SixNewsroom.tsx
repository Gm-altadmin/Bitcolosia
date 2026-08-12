import { useEffect, useMemo, useRef, useState } from "react";
import { ArrowLeft, BookOpen, ChevronRight, DoorOpen, Radio, Sparkles, TrendingDown, TrendingUp, ListFilter, BarChart3 } from "lucide-react";
import { Link, useRoute } from "wouter";
import { getSectorRoom, isSectorRoomId, SECTOR_ROOMS, type SectorRoomId, createKoboldPapers } from "@/game/sectorNewsroom";
import type { ThreeNewsroomHandle } from "@/game/threeSectorNewsroom";
import { trpc } from "@/lib/trpc";
import "./six-newsroom.css";
import "./live-sector-flow.css";
import "./room-interactions.css";

type RoomCommentator = { sectorId: string; displayName: string; state: "awarded" | "locked" | "researching" | "idle"; latestLesson: string | null; latestLearning: string | null };
type RoomJournal = { commentatorId: number; body: string; entryType: string; createdAt?: string | Date };
type RoomOverviewCommentator = { id: number; sectorId: string; displayName: string; responsibility: string; journal: RoomJournal[]; forecasts: Array<{ forecastRank: number; rationale: string }> };
type LiveSectorRecord = { reportIndex: number; provinceId: string; symbol: string; name: string; usdPrice: number | null; change24hPct: number | null; lastUpdatedAt: string | null; sparkline: number[] };
type FlowSort = "report" | "gain" | "loss";
type KoboldSummary = { title: string; summary: string; caveat: string; sourceUrl: string | null; fetchedAt: string };

const usdFormatter = new Intl.NumberFormat("tr-TR", { style: "currency", currency: "USD", maximumSignificantDigits: 6 });

function LiveFlowRail({ title, records, side, loading, stale, onSelect }: { title: string; records: LiveSectorRecord[]; side: "left" | "right"; loading: boolean; stale: boolean; onSelect: (record: LiveSectorRecord) => void }) {
  return <aside className={`live-sector-flow ${side}`} aria-label={`${title} canlı varlık akışı`}>
    <header><Radio size={14} /><span>{title}</span></header>
    <p className="flow-caption">{loading ? "Canlı veri alınıyor" : stale ? "Son başarılı snapshot" : "60 sn canlı snapshot"}</p>
    <div className="live-ticker-list">{records.length ? records.map((record, index) => <button type="button" className="live-ticker" key={record.reportIndex} onClick={() => onSelect(record)} style={{ "--ticker-delay": `${index * 36}ms` } as React.CSSProperties} aria-label={`${record.symbol} ayrıntı analizini aç`}>
      <div><strong>{record.symbol}</strong><small>{record.name}</small></div>
      <div className="ticker-metrics"><b>{record.usdPrice === null ? "—" : usdFormatter.format(record.usdPrice)}</b><span className={typeof record.change24hPct === "number" ? record.change24hPct >= 0 ? "up" : "down" : "neutral"}>{typeof record.change24hPct === "number" ? `${record.change24hPct >= 0 ? "+" : ""}${record.change24hPct.toFixed(2)}%` : "veri yok"}</span></div>
    </button>) : <p className="ticker-empty">Bu tarafta bekleyen varlık yok.</p>}</div>
  </aside>;
}

function sparklinePoints(values: number[]) {
  const safe = values.filter(value => Number.isFinite(value) && value > 0);
  if (safe.length < 2) return "";
  const min = Math.min(...safe); const max = Math.max(...safe); const span = max - min || 1;
  return safe.map((value, index) => `${(index / (safe.length - 1)) * 240},${56 - ((value - min) / span) * 48}`).join(" ");
}

export function SixNewsroomLaunch({ commentators }: { commentators: RoomCommentator[] }) {
  return <section className="six-newsroom-launch" aria-label="Altı sektör haber odası">
    <header><div><p className="kicker">ALTI BAĞIMSIZ HABER ODASI · THREE.JS</p><h2>Her yorumcunun kendi araştırma masası</h2><p>Odanın rengi, masa sembolü, kobolt notu ve hafıza günlüğü yalnızca o sektörün kayıtlarına bağlıdır.</p></div><span><Radio size={14} />Tek Vercel URL alanı</span></header>
    <div className="six-room-grid">{SECTOR_ROOMS.map(room => { const commentator = commentators.find(item => item.sectorId === room.id); return <Link className="six-room-card" key={room.id} href={`/haber-odalari/${room.id}`} style={{ "--room-accent": room.accent, "--room-glow": room.glow } as React.CSSProperties}><span className="room-orb" /><div><small>{room.wing}</small><strong>{commentator?.displayName ?? room.shortTitle}</strong><p>{room.shortTitle} · {commentator?.state === "locked" ? "Kilitli öngörü" : commentator?.state === "researching" ? "Araştırma açık" : commentator?.state === "awarded" ? "Ödül kaydı" : "Not bekliyor"}</p></div><ChevronRight size={18} /></Link>; })}</div>
  </section>;
}

export function SixNewsroomPage() {
  const [, params] = useRoute("/haber-odalari/:sectorId");
  const sectorId = isSectorRoomId(params?.sectorId) ? params.sectorId : "reserve";
  const room = getSectorRoom(sectorId);
  const overview = trpc.commentators.overview.useQuery(undefined, { refetchInterval: 30_000, refetchOnWindowFocus: false });
  const analysis = trpc.commentators.analysisView.useQuery(undefined, { refetchInterval: 30_000, refetchOnWindowFocus: false });
  const market = trpc.market.snapshot.useQuery(undefined, { refetchInterval: 60_000, refetchOnWindowFocus: false });
  const analyst = analysis.data?.commentators.find(item => item.sectorId === sectorId) ?? null;
  const detailed = overview.data?.commentators.find(item => item.sectorId === sectorId) as RoomOverviewCommentator | undefined;
  const reducedMotion = useMemo(() => typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches, []);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const sceneRef = useRef<ThreeNewsroomHandle | null>(null);
  const [sceneReady, setSceneReady] = useState(false);
  const [flowSort, setFlowSort] = useState<FlowSort>("report");
  const [selectedAsset, setSelectedAsset] = useState<LiveSectorRecord | null>(null);
  const [summaryTarget, setSummaryTarget] = useState<"research" | "learning" | null>(null);
  const summaryMutation = trpc.commentators.koboldSummary.useMutation();

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    let disposed = false;
    setSceneReady(false);
    void import("@/game/threeSectorNewsroom").then(({ createThreeSectorNewsroom }) => {
      if (disposed) return;
      sceneRef.current?.dispose();
      sceneRef.current = createThreeSectorNewsroom(canvas, sectorId as SectorRoomId, reducedMotion);
      setSceneReady(true);
    });
    return () => { disposed = true; sceneRef.current?.dispose(); sceneRef.current = null; };
  }, [sectorId, reducedMotion]);

  const papers = createKoboldPapers({ theme: room, commentatorName: analyst?.displayName ?? room.shortTitle, latestResearch: detailed?.journal.find(entry => entry.entryType === "research")?.body, latestLesson: analyst?.latestLesson, latestLearning: analyst?.latestLearning, forecastRationale: detailed?.forecasts[0]?.rationale, state: analyst?.state ?? "idle" });
  const sectorRecords = (market.data?.reportRecords ?? []).filter(record => record.provinceId === sectorId) as LiveSectorRecord[];
  const orderedSectorRecords = [...sectorRecords].sort((a, b) => {
    if (flowSort === "gain") return (b.change24hPct ?? Number.NEGATIVE_INFINITY) - (a.change24hPct ?? Number.NEGATIVE_INFINITY);
    if (flowSort === "loss") return (a.change24hPct ?? Number.POSITIVE_INFINITY) - (b.change24hPct ?? Number.POSITIVE_INFINITY);
    return a.reportIndex - b.reportIndex;
  });
  const leftFlowRecords = orderedSectorRecords.filter((_, index) => index % 2 === 0);
  const rightFlowRecords = orderedSectorRecords.filter((_, index) => index % 2 === 1);
  const summaryData = summaryMutation.data as KoboldSummary | undefined;
  return <main className="sector-room-page" style={{ "--room-accent": room.accent, "--room-glow": room.glow, "--room-wall": room.wall } as React.CSSProperties}>
    <header className="sector-room-topbar"><Link href="/"><ArrowLeft size={17} />Ana panele dön</Link><div><DoorOpen size={16} /><span>{room.wing}</span></div></header>
    <section className="sector-room-hero"><div><p className="kicker">{room.title.toUpperCase()} · BAĞIMSIZ HABER ODASI</p><h1>{analyst?.displayName ?? room.shortTitle}</h1><p>{detailed?.responsibility ?? "Bu oda seçili sektörün doğrulanmış araştırma notlarını, kilitli tahminlerini ve hata derslerini taşır."}</p></div><div className={`room-state-badge ${analyst?.state ?? "idle"}`}><Radio size={15} />{analyst?.state === "locked" ? "Tahmin kilitli" : analyst?.state === "researching" ? "Araştırma yapıyor" : analyst?.state === "awarded" ? "Ödül aldı" : "Yeni not bekliyor"}</div></section>
    <nav className="sector-door-list" aria-label="Haber odaları">{SECTOR_ROOMS.map(item => <Link key={item.id} href={`/haber-odalari/${item.id}`} className={item.id === sectorId ? "selected" : ""}>{item.shortTitle}</Link>)}</nav>
    <section className="room-flow-toolbar" aria-label="Canlı veri sıralama araçları"><span><ListFilter size={15} />Canlı akışı sırala</span><div role="group" aria-label="Varlık sıralaması"><button type="button" onClick={() => setFlowSort("report")} aria-pressed={flowSort === "report"}>Rapor sırası</button><button type="button" onClick={() => setFlowSort("gain")} aria-pressed={flowSort === "gain"}><TrendingUp size={14} />En çok kazandıran</button><button type="button" onClick={() => setFlowSort("loss")} aria-pressed={flowSort === "loss"}><TrendingDown size={14} />En çok kaybettiren</button></div></section>
    <section className="room-live-layout">
      <LiveFlowRail title="Sol akış · canlı varlıklar" records={leftFlowRecords} side="left" loading={market.isLoading} stale={market.data?.stale ?? false} onSelect={setSelectedAsset} />
      <section className="sector-room-stage">
        <div className="three-room-wrap"><canvas ref={canvasRef} aria-label={`${room.shortTitle} Three.js sahnesi; masa, baş yorumcu ve kobolt haberciler`} /><div className="three-room-fallback" aria-hidden="true"><div className="fallback-desk" /><div className="fallback-chief"><i /><b /></div><div className="fallback-kobold left" /><div className="fallback-kobold right" /></div><span className="three-room-status"><Sparkles size={14} />{sceneReady ? (reducedMotion ? "Sakin oda görünümü" : "Koboltlar not taşıyor") : "Oda hazırlanıyor"}</span></div>
        <aside className="kobold-papers" aria-label="Kobolt kâğıtları">{papers.map((paper, index) => <button type="button" className="kobold-paper kobold-paper-button" key={paper.courier} onClick={() => { const kind = index === 0 ? "research" : "learning" as const; setSummaryTarget(kind); summaryMutation.mutate({ sectorId, paperKind: kind }); }}><header><BookOpen size={16} /><span>{paper.courier}</span><BarChart3 size={14} /></header><strong>{index === 0 ? room.deskObject : paper.deskLabel}</strong><p>{paper.body}</p><small>{paper.footer} · Özet için tıkla</small></button>)}</aside>
      </section>
      <LiveFlowRail title="Sağ akış · canlı varlıklar" records={rightFlowRecords} side="right" loading={market.isLoading} stale={market.data?.stale ?? false} onSelect={setSelectedAsset} />
    </section>
    {selectedAsset && <section className="room-inline-modal" role="dialog" aria-modal="true" aria-labelledby="asset-detail-title"><div className="room-inline-modal-backdrop" onClick={() => setSelectedAsset(null)} /><article className="room-inline-modal-card room-detail-dialog"><button type="button" className="room-inline-modal-close" onClick={() => setSelectedAsset(null)} aria-label="Varlık detayını kapat">×</button><header><h2 id="asset-detail-title">{selectedAsset.symbol} · canlı varlık analizi</h2><p>Bu pencere, oda snapshot’ındaki gerçek fiyat ve 24 saatlik değişimi gösterir; yatırım tavsiyesi değildir.</p></header><div className="asset-detail-content"><div className="asset-detail-stats"><span>Son fiyat <b>{selectedAsset.usdPrice === null ? "—" : usdFormatter.format(selectedAsset.usdPrice)}</b></span><span>24 saat <b className={(selectedAsset.change24hPct ?? 0) >= 0 ? "up" : "down"}>{selectedAsset.change24hPct === null ? "veri yok" : `${selectedAsset.change24hPct >= 0 ? "+" : ""}${selectedAsset.change24hPct.toFixed(2)}%`}</b></span><span>Güncelleme <b>{selectedAsset.lastUpdatedAt ? new Date(selectedAsset.lastUpdatedAt).toLocaleTimeString("tr-TR", { hour: "2-digit", minute: "2-digit" }) : "—"}</b></span></div><svg className="asset-sparkline" viewBox="0 0 240 64" role="img" aria-label={`${selectedAsset.symbol} son dönem fiyat çizgisi`}><polyline points={sparklinePoints(selectedAsset.sparkline)} fill="none" stroke="currentColor" strokeWidth="2.4" vectorEffect="non-scaling-stroke" /></svg><p>Grafik, sağlayıcının son alınabilen fiyat noktalarını gösterir. Haber odasındaki araştırma notları varlığın gelecekteki performansını garanti etmez.</p></div></article></section>}
    {summaryTarget && <section className="room-inline-modal" role="dialog" aria-modal="true" aria-labelledby="kobold-summary-title"><div className="room-inline-modal-backdrop" onClick={() => { setSummaryTarget(null); summaryMutation.reset(); }} /><article className="room-inline-modal-card room-summary-dialog"><button type="button" className="room-inline-modal-close" onClick={() => { setSummaryTarget(null); summaryMutation.reset(); }} aria-label="Kobolt özetini kapat">×</button><header><h2 id="kobold-summary-title">{summaryTarget === "research" ? "Kobolt kaynak notu özeti" : "Kobolt öğrenme notu özeti"}</h2><p>Canlı sektör snapshot’ı ve oda günlüğü temelinde oluşturulan kısa, tarafsız özet.</p></header>{summaryMutation.isPending && <p className="summary-state">Canlı veri ve notlar değerlendiriliyor…</p>}{summaryMutation.error && <p className="summary-state error">Özet şu anda üretilemedi. Yönetici oturumu ve sunucu modeli gerekli olabilir.</p>}{summaryData && <article className="kobold-summary-result"><h3>{summaryData.title}</h3><p>{summaryData.summary}</p><small>{summaryData.caveat}</small>{summaryData.sourceUrl && <a href={summaryData.sourceUrl} target="_blank" rel="noreferrer">Kaynak notunu aç</a>}</article>}</article></section>}
  </main>;
}
