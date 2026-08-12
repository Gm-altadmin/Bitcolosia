import { getMarketSnapshot } from "../server/market/marketData.ts";

const snapshot = await getMarketSnapshot();
const withChange = snapshot.quotes.filter(quote => Number.isFinite(quote.change24hPct));
const withMarketCap = withChange.filter(quote => Number.isFinite(quote.marketCapUsd) && (quote.marketCapUsd ?? 0) > 0);
const equalWeight24hPct = withChange.reduce((sum, quote) => sum + (quote.change24hPct ?? 0), 0) / withChange.length;
const totalMarketCap = withMarketCap.reduce((sum, quote) => sum + (quote.marketCapUsd ?? 0), 0);
const marketCapWeighted24hPct = withMarketCap.reduce((sum, quote) => sum + (quote.change24hPct ?? 0) * (quote.marketCapUsd ?? 0), 0) / totalMarketCap;

console.log(JSON.stringify({
  fetchedAt: snapshot.fetchedAt,
  provider: snapshot.provider,
  eligibleQuotes: withChange.length,
  marketCapWeightedQuotes: withMarketCap.length,
  equalWeight24hPct,
  marketCapWeighted24hPct,
  positiveQuotes: withChange.filter(quote => (quote.change24hPct ?? 0) > 0).length,
  negativeQuotes: withChange.filter(quote => (quote.change24hPct ?? 0) < 0).length,
  flatQuotes: withChange.filter(quote => (quote.change24hPct ?? 0) === 0).length,
  totalMarketCap,
}, null, 2));
