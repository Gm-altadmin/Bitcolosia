import { describe, expect, it } from "vitest";
import { INITIAL_PARCEL_VALUE_LITRES, cronForLocalValuation, nextDailyValuationAt, parcelCode, timezoneOffsetMinutes, valueVirtualParcel } from "./parcelEconomy";

describe("sanal vatandaş parsel ekonomisi", () => {
  it("her vatandaş için 1.000 L başlangıç değerini kullanır", () => {
    expect(INITIAL_PARCEL_VALUE_LITRES).toBe(1000);
    expect(parcelCode("infrastructure", 2)).toBe("P-INFR-002");
  });

  it("fiyat farkını mililitre hassasiyetinde uygular ve vatandaş başına günlük etkiyi ±10 L ile sınırlar", () => {
    expect(valueVirtualParcel(1000, 0.001, 0.002, 100)).toMatchObject({ nextValueLitres: 1000.001, appliedChangeLitres: 0.001 });
    expect(valueVirtualParcel(1000, 63800, 63400, -0.5)).toMatchObject({ nextValueLitres: 990, appliedChangeLitres: -10 });
    expect(valueVirtualParcel(1000, null, null, null)).toMatchObject({ nextValueLitres: 1000, appliedChangeLitres: null });
  });

  it("günlük 10:30 Istanbul değerlemesi için sonraki UTC 07:30 zamanını hesaplar", () => {
    const beforeDailyRun = nextDailyValuationAt(new Date("2026-08-12T06:00:00.000Z"));
    const afterDailyRun = nextDailyValuationAt(new Date("2026-08-12T08:00:00.000Z"));
    expect(beforeDailyRun.toISOString()).toBe("2026-08-12T07:30:00.000Z");
    expect(afterDailyRun.toISOString()).toBe("2026-08-13T07:30:00.000Z");
    expect(cronForLocalValuation(180)).toBe("0 30 7 * * *");
    expect(timezoneOffsetMinutes("Europe/Istanbul", new Date("2026-08-12T08:00:00.000Z"))).toBe(180);
  });
});
