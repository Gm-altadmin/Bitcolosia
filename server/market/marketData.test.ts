import { describe, expect, it } from "vitest";
import { buildCoinsMarketsUrl, calculateMarketDirection, takeLatestSparkline } from "./marketData";

describe("piyasa sparkline veri sözleşmesi", () => {
  it("tek toplu piyasa isteğinde sparkline verisini ister", () => {
    const url = new URL(buildCoinsMarketsUrl());
    expect(url.searchParams.get("sparkline")).toBe("true");
    expect(url.searchParams.get("price_change_percentage")).toBe("24h");
  });

  it("geçerli fiyat noktalarının son 24 tanesini korur", () => {
    const values = [1, -2, Number.NaN, ...Array.from({ length: 30 }, (_, index) => index + 2)];
    const result = takeLatestSparkline(values);
    expect(result).toHaveLength(24);
    expect(result[0]).toBe(8);
    expect(result.at(-1)).toBe(31);
  });

  it("piyasa yönünde büyük piyasa değerli varlığı küçük aşırı oynak varlıktan daha temsilî sayar", () => {
    const direction = calculateMarketDirection([
      { marketCapUsd: 1_000_000, change24hPct: 1 },
      { marketCapUsd: 1, change24hPct: -99 },
    ]);
    expect(direction.average24hChangePct).toBeLessThan(0);
    expect(direction.marketDirectionBasis).toBe("market_cap_weighted");
    expect(direction.marketCapWeighted24hChangePct).toBeGreaterThan(0);
    expect(direction.marketMood).toBe("rising");
  });
});
