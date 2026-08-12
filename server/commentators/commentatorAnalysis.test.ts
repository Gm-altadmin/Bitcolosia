import { describe, expect, it } from "vitest";
import { deriveCommentatorOperationalState } from "./commentatorService";

describe("deriveCommentatorOperationalState", () => {
  it("resmî ödülü, diğer canlı durumlardan öncelikli gösterir", () => {
    expect(deriveCommentatorOperationalState({ hasAward: true, cycleStatus: "locked", hasResearch: true })).toBe("awarded");
  });

  it("kilitli tahmini araştırma günlüğünden öncelikli gösterir", () => {
    expect(deriveCommentatorOperationalState({ hasAward: false, cycleStatus: "locked", hasResearch: true })).toBe("locked");
  });

  it("yalnızca kaynak günlüğü olan yorumcuyu araştırıyor olarak gösterir", () => {
    expect(deriveCommentatorOperationalState({ hasAward: false, cycleStatus: null, hasResearch: true })).toBe("researching");
  });

  it("kayıt yoksa bekleme durumuna döner", () => {
    expect(deriveCommentatorOperationalState({ hasAward: false, cycleStatus: null, hasResearch: false })).toBe("idle");
  });
});
