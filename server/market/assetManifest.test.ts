import { describe, expect, it } from "vitest";
import { MARKET_ASSET_MANIFEST, UNIQUE_COIN_GECKO_IDS, UNAVAILABLE_MARKET_ASSETS } from "./assetManifest";
import { buildCoinsMarketsUrl, MARKET_CACHE_TTL_MS } from "./marketData";

describe("BitColosİa piyasa varlık manifestosu", () => {
  it("100 rapor satırını korur ve yalnızca doğrulanamayan Sango Coin kaydını erişilemez işaretler", () => {
    expect(MARKET_ASSET_MANIFEST).toHaveLength(100);
    expect(UNAVAILABLE_MARKET_ASSETS).toHaveLength(1);
    expect(UNAVAILABLE_MARKET_ASSETS[0]).toMatchObject({ symbol: "SANG", reportIndex: 30 });
  });

  it("Chainlink tekrarını tek sağlayıcı kimliğinde toplar ve URL tek toplu isteği kullanır", () => {
    expect(UNIQUE_COIN_GECKO_IDS.filter((id) => id === "chainlink")).toHaveLength(1);
    expect(UNIQUE_COIN_GECKO_IDS).toHaveLength(98);
    const url = new URL(buildCoinsMarketsUrl());
    expect(url.searchParams.get("vs_currency")).toBe("usd");
    expect(url.searchParams.get("ids")?.split(",")).toHaveLength(98);
    expect(MARKET_CACHE_TTL_MS).toBe(60_000);
  });
});
