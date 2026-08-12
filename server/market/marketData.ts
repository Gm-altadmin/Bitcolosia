import { z } from "zod";
import { MARKET_ASSET_MANIFEST, SUPPORTED_MARKET_ASSETS, UNIQUE_COIN_GECKO_IDS, UNAVAILABLE_MARKET_ASSETS, type MarketAssetRecord } from "./assetManifest";

const COINGECKO_MARKETS_URL = "https://api.coingecko.com/api/v3/coins/markets";
export const MARKET_CACHE_TTL_MS = 60_000;
const REQUEST_TIMEOUT_MS = 15_000;

const coinSchema = z.object({
  id: z.string(),
  symbol: z.string(),
  name: z.string(),
  current_price: z.number().nullable().optional(),
  market_cap: z.number().nullable().optional(),
  total_volume: z.number().nullable().optional(),
  price_change_percentage_24h_in_currency: z.number().nullable().optional(),
  last_updated: z.string().nullable().optional(),
  sparkline_in_7d: z.object({ price: z.array(z.number()).optional() }).nullable().optional(),
});

export type MarketQuote = {
  coinGeckoId: string;
  providerSymbol: string;
  providerName: string;
  usdPrice: number | null;
  marketCapUsd: number | null;
  volume24hUsd: number | null;
  change24hPct: number | null;
  lastUpdatedAt: string | null;
};

export function calculateMarketDirection(quotes: Array<Pick<MarketQuote, "change24hPct" | "marketCapUsd">>) {
  const changes = quotes.map((quote) => quote.change24hPct).filter((change): change is number => typeof change === "number");
  const average24hChangePct = changes.length ? changes.reduce((sum, change) => sum + change, 0) / changes.length : null;
  const marketCapQuotes = quotes.filter((quote) => typeof quote.change24hPct === "number" && typeof quote.marketCapUsd === "number" && quote.marketCapUsd > 0);
  const totalMarketCap = marketCapQuotes.reduce((sum, quote) => sum + (quote.marketCapUsd ?? 0), 0);
  const marketCapWeighted24hChangePct = totalMarketCap > 0
    ? marketCapQuotes.reduce((sum, quote) => sum + (quote.change24hPct ?? 0) * (quote.marketCapUsd ?? 0), 0) / totalMarketCap
    : null;
  const marketDirectionBasis = marketCapWeighted24hChangePct !== null ? "market_cap_weighted" as const : average24hChangePct !== null ? "equal_weight_fallback" as const : "unavailable" as const;
  const directionChange = marketCapWeighted24hChangePct ?? average24hChangePct;
  const marketMood = directionChange === null ? "mixed" as const : directionChange > 0.25 ? "rising" as const : directionChange < -0.25 ? "falling" as const : "mixed" as const;
  return { average24hChangePct, marketCapWeighted24hChangePct, marketDirectionBasis, marketMood };
}

export type ReportMarketRecord = MarketAssetRecord & {
  usdPrice: number | null;
  marketCapUsd: number | null;
  volume24hUsd: number | null;
  change24hPct: number | null;
  lastUpdatedAt: string | null;
  sparkline: number[];
};

export type MarketSnapshot = {
  provider: "CoinGecko";
  fetchedAt: string;
  cacheAgeMs: number;
  stale: boolean;
  reportRecordCount: number;
  uniqueProviderAssetCount: number;
  unavailableRecords: typeof UNAVAILABLE_MARKET_ASSETS;
  missingProviderIds: string[];
  marketMood: "rising" | "falling" | "mixed";
  average24hChangePct: number | null;
  marketCapWeighted24hChangePct: number | null;
  marketDirectionBasis: "market_cap_weighted" | "equal_weight_fallback" | "unavailable";
  quotes: MarketQuote[];
  reportRecords: ReportMarketRecord[];
};

let cachedSnapshot: Omit<MarketSnapshot, "cacheAgeMs" | "stale"> | null = null;
let cachedAtMs = 0;

export function buildCoinsMarketsUrl() {
  const params = new URLSearchParams({
    vs_currency: "usd",
    ids: UNIQUE_COIN_GECKO_IDS.join(","),
    per_page: String(UNIQUE_COIN_GECKO_IDS.length),
    page: "1",
    sparkline: "true",
    price_change_percentage: "24h",
  });
  return `${COINGECKO_MARKETS_URL}?${params.toString()}`;
}

export function takeLatestSparkline(values: number[] | undefined, pointCount = 24) {
  return (values ?? []).filter((value) => Number.isFinite(value) && value >= 0).slice(-pointCount);
}

function asSnapshot(records: z.infer<typeof coinSchema>[]): Omit<MarketSnapshot, "cacheAgeMs" | "stale"> {
  const quotes = records.map((record) => ({
    coinGeckoId: record.id,
    providerSymbol: record.symbol.toUpperCase(),
    providerName: record.name,
    usdPrice: record.current_price ?? null,
    marketCapUsd: record.market_cap ?? null,
    volume24hUsd: record.total_volume ?? null,
    change24hPct: record.price_change_percentage_24h_in_currency ?? null,
    lastUpdatedAt: record.last_updated ?? null,
    sparkline: takeLatestSparkline(record.sparkline_in_7d?.price),
  }));
  const returnedIds = new Set(quotes.map((quote) => quote.coinGeckoId));
  const quoteById = new Map(quotes.map((quote) => [quote.coinGeckoId, quote]));
  const missingProviderIds = UNIQUE_COIN_GECKO_IDS.filter((id) => !returnedIds.has(id));
  const { average24hChangePct, marketCapWeighted24hChangePct, marketDirectionBasis, marketMood } = calculateMarketDirection(quotes);

  return {
    provider: "CoinGecko",
    fetchedAt: new Date().toISOString(),
    reportRecordCount: MARKET_ASSET_MANIFEST.length,
    uniqueProviderAssetCount: UNIQUE_COIN_GECKO_IDS.length,
    unavailableRecords: UNAVAILABLE_MARKET_ASSETS,
    missingProviderIds,
    marketMood,
    average24hChangePct,
    marketCapWeighted24hChangePct,
    marketDirectionBasis,
    quotes,
    reportRecords: MARKET_ASSET_MANIFEST.map((asset) => {
      const quote = asset.coinGeckoId ? quoteById.get(asset.coinGeckoId) : undefined;
      return {
        ...asset,
        usdPrice: quote?.usdPrice ?? null,
        marketCapUsd: quote?.marketCapUsd ?? null,
        volume24hUsd: quote?.volume24hUsd ?? null,
        change24hPct: quote?.change24hPct ?? null,
        lastUpdatedAt: quote?.lastUpdatedAt ?? null,
        sparkline: quote?.sparkline ?? [],
      };
    }),
  };
}

function decorateSnapshot(snapshot: Omit<MarketSnapshot, "cacheAgeMs" | "stale">, stale: boolean): MarketSnapshot {
  return { ...snapshot, stale, cacheAgeMs: Math.max(0, Date.now() - cachedAtMs) };
}

export async function getMarketSnapshot(): Promise<MarketSnapshot> {
  if (cachedSnapshot && Date.now() - cachedAtMs < MARKET_CACHE_TTL_MS) return decorateSnapshot(cachedSnapshot, false);

  try {
    const response = await fetch(buildCoinsMarketsUrl(), { headers: { accept: "application/json" }, signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS) });
    if (!response.ok) throw new Error(`CoinGecko request failed with HTTP ${response.status}`);
    const parsed = z.array(coinSchema).safeParse(await response.json());
    if (!parsed.success) throw new Error("CoinGecko response did not match the expected market data contract");
    cachedSnapshot = asSnapshot(parsed.data);
    cachedAtMs = Date.now();
    return decorateSnapshot(cachedSnapshot, false);
  } catch (error) {
    if (cachedSnapshot) return decorateSnapshot(cachedSnapshot, true);
    throw error;
  }
}

export function getManifestSummary() {
  return {
    reportRecordCount: MARKET_ASSET_MANIFEST.length,
    availableRecordCount: SUPPORTED_MARKET_ASSETS.length,
    uniqueProviderAssetCount: UNIQUE_COIN_GECKO_IDS.length,
    unavailableRecords: UNAVAILABLE_MARKET_ASSETS,
  };
}
