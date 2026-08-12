export const COMMENTATOR_SECTORS = [
  { sectorId: "reserve", displayName: "Aren Altın", responsibility: "Global Rezerv ve Dijital Altın sektörünü izler." },
  { sectorId: "infrastructure", displayName: "Derya Ağ", responsibility: "Altyapı, akıllı sözleşmeler ve Katman-1 ekosistemini izler." },
  { sectorId: "frontier", displayName: "Lina Zekâ", responsibility: "Yapay zekâ ve gelecek teknolojileri sektörünü izler." },
  { sectorId: "liquidity", displayName: "Bora Likit", responsibility: "Kurumsal finans, RWA ve likidite akışını izler." },
  { sectorId: "archive", displayName: "Ece Veri", responsibility: "Depolama, veri güvenliği ve gizlilik sektörünü izler." },
  { sectorId: "commons", displayName: "Mert Kültür", responsibility: "Küresel topluluk, GameFi ve kültür varlıklarını izler." },
] as const;

export const FORECAST_BADGES = {
  1: { label: "Altın öngörü", color: "gold", score: 4 },
  2: { label: "Gümüş öngörü", color: "silver", score: 3 },
  3: { label: "Bronz öngörü", color: "bronze", score: 2 },
  4: { label: "Keşif öngörüsü", color: "aqua", score: 1 },
} as const;

export const FORECAST_RANKS = [1, 2, 3, 4] as const;
export const MAX_FORECAST_SLOTS = FORECAST_RANKS.length;
export const DAILY_PARCEL_CAP_LITRES = 10;
export const RESERVOIR_ASSET_CREDIT_CAP_LITRES = 100;
export const RESERVOIR_SECTOR_CREDIT_CAP_LITRES = 250;

export type PricePoint = { reportIndex: number; usdPrice: number | null };
export type LockedPick = { reportIndex: number; forecastRank: number; lockedUsdPrice: number };

/**
 * A sector can only rank the market records it actually contains. This keeps
 * the single-asset reserve sector auditable without inventing extra candidates.
 */
export function forecastSlotCount(availableCandidateCount: number) {
  return Math.max(0, Math.min(MAX_FORECAST_SLOTS, Math.floor(availableCandidateCount)));
}

export type SectorAwardScore = {
  actualWinnerReportIndex: number | null;
  actualWinnerDeltaLitres: number | null;
  winningForecastRank: number | null;
  silverMedalAwarded: boolean;
  goldStarAwarded: boolean;
  predictionScore: number;
  status: "awarded" | "no_positive_result";
  deltasByReportIndex: Map<number, number>;
};

function roundThree(value: number) {
  return Math.round(value * 1000) / 1000;
}

/**
 * Every sector is scored separately. A silver round medal belongs to the real
 * winner when it appears in the locked top four. A gold star belongs to the
 * commentator only when its rank-1 pick is that winner.
 */
export function scoreSectorAward(allSectorStartPrices: PricePoint[], allSectorOutcomePrices: PricePoint[], picks: LockedPick[]): SectorAwardScore {
  const outcomeByIndex = new Map(allSectorOutcomePrices.map(point => [point.reportIndex, point.usdPrice]));
  const deltasByReportIndex = new Map<number, number>();

  for (const start of allSectorStartPrices) {
    const end = outcomeByIndex.get(start.reportIndex);
    if (start.usdPrice === null || end === null || end === undefined) continue;
    deltasByReportIndex.set(start.reportIndex, roundThree(end - start.usdPrice));
  }

  const candidates = Array.from(deltasByReportIndex.entries()).filter(([, delta]) => delta > 0);
  if (!candidates.length) {
    return {
      actualWinnerReportIndex: null,
      actualWinnerDeltaLitres: null,
      winningForecastRank: null,
      silverMedalAwarded: false,
      goldStarAwarded: false,
      predictionScore: 0,
      status: "no_positive_result",
      deltasByReportIndex,
    };
  }

  candidates.sort((a, b) => b[1] - a[1] || a[0] - b[0]);
  const [actualWinnerReportIndex, actualWinnerDeltaLitres] = candidates[0]!;
  const matchingPick = picks.find(pick => pick.reportIndex === actualWinnerReportIndex);
  const winningForecastRank = matchingPick?.forecastRank ?? null;
  const predictionScore = winningForecastRank && winningForecastRank in FORECAST_BADGES
    ? FORECAST_BADGES[winningForecastRank as keyof typeof FORECAST_BADGES].score
    : 0;

  return {
    actualWinnerReportIndex,
    actualWinnerDeltaLitres,
    winningForecastRank,
    silverMedalAwarded: Boolean(matchingPick),
    goldStarAwarded: winningForecastRank === 1,
    predictionScore,
    status: "awarded",
    deltasByReportIndex,
  };
}

export type ReservoirCredit = {
  reportIndex: number;
  rawGainLitres: number;
  verifiedSurplusLitres: number;
  creditedLitres: number;
};

/**
 * All locked picks (up to four) can contribute only after a verified positive gain.
 * Rank order receives the remaining sector cap first, making allocation stable
 * and auditable on re-runs.
 */
export function calculateReservoirCredits(picks: LockedPick[], outcomePrices: PricePoint[]): ReservoirCredit[] {
  const outcomeByIndex = new Map(outcomePrices.map(point => [point.reportIndex, point.usdPrice]));
  let sectorRemaining = RESERVOIR_SECTOR_CREDIT_CAP_LITRES;

  return [...picks].sort((a, b) => a.forecastRank - b.forecastRank).map(pick => {
    const outcome = outcomeByIndex.get(pick.reportIndex);
    const rawGainLitres = outcome === null || outcome === undefined ? 0 : Math.max(0, roundThree(outcome - pick.lockedUsdPrice));
    const verifiedSurplusLitres = Math.max(0, roundThree(rawGainLitres - DAILY_PARCEL_CAP_LITRES));
    const creditedLitres = Math.max(0, roundThree(Math.min(verifiedSurplusLitres, RESERVOIR_ASSET_CREDIT_CAP_LITRES, sectorRemaining)));
    sectorRemaining = Math.max(0, roundThree(sectorRemaining - creditedLitres));
    return { reportIndex: pick.reportIndex, rawGainLitres, verifiedSurplusLitres, creditedLitres };
  });
}
