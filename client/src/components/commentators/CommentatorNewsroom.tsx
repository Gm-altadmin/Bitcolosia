import { useEffect, useMemo, useRef, useState } from "react";
import { BookOpen, ChevronDown, Radio, Sparkles, X } from "lucide-react";
import type { NewsroomSceneHandle } from "@/game/newsroomScene";
import "./newsroom.css";

type NewsroomCommentator = {
  sectorId: string;
  displayName: string;
  state: "awarded" | "locked" | "researching" | "idle";
  latestLesson: string | null;
  latestLearning: string | null;
};

export function CommentatorNewsroom({ commentators }: { commentators: NewsroomCommentator[] }) {
  const [open, setOpen] = useState(false);
  const [selectedSectorId, setSelectedSectorId] = useState<string | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const handleRef = useRef<NewsroomSceneHandle | null>(null);
  const reducedMotion = useMemo(() => typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches, []);
  const selected = commentators.find(commentator => commentator.sectorId === selectedSectorId) ?? commentators[0] ?? null;

  useEffect(() => {
    if (!open || !canvasRef.current) return;
    let cancelled = false;
    const canvas = canvasRef.current;
    void import("@/game/newsroomScene").then(({ createNewsroomScene }) => {
      if (cancelled) return;
      handleRef.current?.dispose();
      handleRef.current = createNewsroomScene(canvas, reducedMotion);
    });
    return () => {
      cancelled = true;
      handleRef.current?.dispose();
      handleRef.current = null;
    };
  }, [open, reducedMotion]);

  useEffect(() => {
    if (!selectedSectorId && commentators[0]) setSelectedSectorId(commentators[0].sectorId);
  }, [commentators, selectedSectorId]);

  return <section className="newsroom-launch" aria-label="Yorumcu haber odaları">
    <div>
      <p className="kicker">YORUMCU HABER ODALARI · 3B CANLI SAHNE</p>
      <h3>Notlar masaya ulaşıyor</h3>
      <p>Seçilen yorumcunun kaynaklı araştırma günlüğü, kobolt habercilerin getirdiği notlarla konsey odasında görünür. Bu sahne gerçek kayıtları temsil eder; tahmin veya ödül sonucu üretmez.</p>
    </div>
    <button className="newsroom-launch-button" onClick={() => setOpen(true)}><Sparkles size={16} />Haber odasını aç</button>

    {open && <div className="newsroom-overlay" role="dialog" aria-modal="true" aria-label="Üç boyutlu yorumcu haber odası">
      <div className="newsroom-modal">
        <header className="newsroom-modal-header"><div><p className="kicker">CANLI ARAŞTIRMA MASASI</p><h2>{selected ? `${selected.displayName} · Haber Odası` : "Yorumcu Haber Odası"}</h2></div><button onClick={() => setOpen(false)} aria-label="Haber odasını kapat"><X size={18} /></button></header>
        <div className="newsroom-layout">
          <div className="newsroom-canvas-wrap"><canvas ref={canvasRef} aria-label="Baş yorumcu, iki kobolt haberci ve not teslimi içeren üç boyutlu haber odası" /><div className="newsroom-visual-fallback" aria-hidden="true"><div className="room-map" /><div className="room-desk"><span className="desk-gold-line" /></div><div className="room-chief"><span className="chief-head" /><span className="chief-hair" /><span className="chief-beard" /><span className="chief-robe" /></div><div className="room-kobold left"><span className="kobold-ear" /><span className="kobold-paper" /></div><div className="room-kobold right"><span className="kobold-ear" /><span className="kobold-paper" /></div></div><span className="newsroom-live"><Radio size={13} />{reducedMotion ? "Sakin görünüm" : "Koboltlar not taşıyor"}</span></div>
          <aside className="newsroom-sidebar">
            <label htmlFor="newsroom-commentator">Haber odası</label>
            <div className="newsroom-select-wrap"><select id="newsroom-commentator" value={selected?.sectorId ?? ""} onChange={event => setSelectedSectorId(event.target.value)}>{commentators.map(commentator => <option key={commentator.sectorId} value={commentator.sectorId}>{commentator.displayName}</option>)}</select><ChevronDown size={15} /></div>
            <div className={`newsroom-state ${selected?.state ?? "idle"}`}><span />{selected?.state === "awarded" ? "Ödül aldı" : selected?.state === "locked" ? "Tahmin kilitlendi" : selected?.state === "researching" ? "Araştırma yapıyor" : "Yeni not bekliyor"}</div>
            <article><header><BookOpen size={15} /><strong>Masaya gelen son not</strong></header><p>{selected?.latestLesson ?? selected?.latestLearning ?? "İlk kaynak notu henüz gelmedi."}</p></article>
            <small>Uzun beyaz sakallı baş yorumcu, notları seçili sektörün hafıza günlüğüne bağlar. Koboltlar görsel temsil niteliğindedir.</small>
          </aside>
        </div>
      </div>
    </div>}
  </section>;
}
