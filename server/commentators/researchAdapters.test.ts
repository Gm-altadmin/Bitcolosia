import { describe, expect, it } from "vitest";
import { gdeltSeenAt } from "./researchAdapters";

describe("GDELT adapter zaman ayrıştırması", () => {
  it("GDELT seendate değerini UTC tarihe çevirir", () => {
    expect(gdeltSeenAt("20260812T153045Z")?.toISOString()).toBe("2026-08-12T15:30:45.000Z");
  });
  it("geçersiz tarih için null döndürür", () => {
    expect(gdeltSeenAt("bugun")).toBeNull();
  });
});
