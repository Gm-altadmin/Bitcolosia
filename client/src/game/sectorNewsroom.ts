export type SectorRoomId = "reserve" | "infrastructure" | "frontier" | "liquidity" | "archive" | "commons";

export type SectorRoomTheme = {
  id: SectorRoomId;
  title: string;
  shortTitle: string;
  wing: string;
  accent: string;
  glow: string;
  wall: string;
  courierRole: string;
  deskObject: string;
};

export const SECTOR_ROOMS: SectorRoomTheme[] = [
  { id: "reserve", title: "Global Rezerv ve Dijital Altın", shortTitle: "Rezerv Odası", wing: "Altın Arşiv Kanadı", accent: "#d9a441", glow: "#ffe2a0", wall: "#2c2416", courierRole: "rezerv muhafızı", deskObject: "mühürlü altın atlas" },
  { id: "infrastructure", title: "Altyapı, Akıllı Sözleşmeler ve Katman-1", shortTitle: "Altyapı Odası", wing: "Düğümler Galerisi", accent: "#50c8d8", glow: "#b1f5ff", wall: "#102b38", courierRole: "düğüm habercisi", deskObject: "ışıklı ağ planı" },
  { id: "frontier", title: "Yapay Zekâ ve Gelecek Teknolojileri", shortTitle: "Gelecek Odası", wing: "Zekâ Gözlemevi", accent: "#9e82ff", glow: "#ded2ff", wall: "#261c42", courierRole: "sinyal keşifçisi", deskObject: "mor ışık çekirdeği" },
  { id: "liquidity", title: "Kurumsal Finans, RWA ve Likidite", shortTitle: "Likidite Odası", wing: "Likidite Salonu", accent: "#ef7b68", glow: "#ffd0c4", wall: "#3b1e21", courierRole: "akış kâtibi", deskObject: "bronz likidite küresi" },
  { id: "archive", title: "Depolama, Veri Güvenliği ve Gizlilik", shortTitle: "Veri Kasası", wing: "Sessiz Veri Kasası", accent: "#50b587", glow: "#b7f4d7", wall: "#12352d", courierRole: "kasa anahtarcısı", deskObject: "mühürlü veri sandığı" },
  { id: "commons", title: "Küresel Topluluk, GameFi ve Kültür Varlıkları", shortTitle: "Topluluk Odası", wing: "Kültür Meydanı", accent: "#eeb34b", glow: "#ffe9b5", wall: "#392b16", courierRole: "topluluk ulakçısı", deskObject: "renkli topluluk sancağı" },
];

export function isSectorRoomId(value: string | undefined): value is SectorRoomId {
  return Boolean(value && SECTOR_ROOMS.some(room => room.id === value));
}

export function getSectorRoom(id: string | undefined) {
  return SECTOR_ROOMS.find(room => room.id === id) ?? SECTOR_ROOMS[0];
}

export function createKoboldPaper(input: {
  theme: SectorRoomTheme;
  commentatorName: string;
  latestResearch?: string | null;
  latestLesson?: string | null;
  latestLearning?: string | null;
  state: "awarded" | "locked" | "researching" | "idle";
}) {
  const evidence = input.latestResearch ?? input.latestLesson ?? input.latestLearning ?? "Yeni kaynak notu henüz gelmedi; koboltlar güvenilir sinyal bekliyor.";
  const stateLine = input.state === "awarded"
    ? "Ödül sonucu hafızaya işlendi; yeni tur için karşıt sinyaller aranıyor."
    : input.state === "locked"
      ? "Tahmin kilitli; yeni not yalnızca sonraki turdaki gerekçeyi güçlendirecek."
      : input.state === "researching"
        ? "Araştırma açık; not kaynak güvenilirliğiyle işaretlendi."
        : "Oda yeni kaynak notunu bekliyor.";
  return {
    heading: `${input.theme.courierRole} · ${input.theme.wing}`,
    body: evidence.slice(0, 360),
    footer: stateLine,
  };
}

export function createKoboldPapers(input: {
  theme: SectorRoomTheme;
  commentatorName: string;
  latestResearch?: string | null;
  latestLesson?: string | null;
  latestLearning?: string | null;
  forecastRationale?: string | null;
  state: "awarded" | "locked" | "researching" | "idle";
}) {
  const common = { theme: input.theme, commentatorName: input.commentatorName, state: input.state };
  const left = createKoboldPaper({
    ...common,
    latestResearch: input.latestResearch,
    latestLesson: null,
    latestLearning: null,
  });
  const right = createKoboldPaper({
    ...common,
    latestResearch: null,
    latestLesson: input.latestLesson ?? input.forecastRationale ?? null,
    latestLearning: input.latestLearning,
  });
  return [
    { ...left, courier: "Sol kobolt · kaynak notu", deskLabel: "Birincil araştırma" },
    { ...right, courier: "Sağ kobolt · öğrenme notu", deskLabel: "Hata dersi / kilitli gerekçe" },
  ];
}
