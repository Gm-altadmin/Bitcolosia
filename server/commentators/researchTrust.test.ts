import { describe, expect, it } from "vitest";
import { createResearchContentHash, trustedSourceTier, validateResearchCandidate } from "./researchTrust";

describe("kaynak güven politikası", () => {
  it("resmî alan adını ve alt alan adını doğru sınıflandırır", () => {
    expect(trustedSourceTier("https://blog.ethereum.org/update")).toMatchObject({ ok: true, tier: "official" });
  });

  it("alan adı taklidini kabul etmez", () => {
    expect(trustedSourceTier("https://coindesk.com.kotu-ornek.test/a")).toMatchObject({ ok: false, reason: "untrusted_domain" });
  });

  it("yerel ağ adreslerini reddeder", () => {
    expect(trustedSourceTier("https://127.0.0.1/private")).toMatchObject({ ok: false, reason: "private_host" });
  });

  it("eski kaydı reddeder ve aynı içerik için sabit hash üretir", () => {
    const now = new Date("2026-08-12T12:00:00.000Z");
    expect(validateResearchCandidate({
      sourceTier: "verified_news",
      sourceUrl: "https://www.coindesk.com/markets/example",
      sourceTitle: "Örnek", body: "Yeterince uzun bir araştırma notu.", publishedAt: "2026-08-08T12:00:00.000Z",
    }, { now })).toMatchObject({ ok: false, reason: "stale" });
    const input = { sourceUrl: "https://www.coindesk.com/markets/example", sourceTitle: "Örnek", body: "Not", publishedAt: new Date("2026-08-12T10:00:00.000Z") };
    expect(createResearchContentHash(input)).toBe(createResearchContentHash(input));
  });
});
