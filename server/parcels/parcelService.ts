import { asc, eq } from "drizzle-orm";
import { citizenParcels, parcelValuationRuns, parcelValuationSettings } from "../../drizzle/schema";
import { getDb } from "../db";
import { MARKET_ASSET_MANIFEST } from "../market/assetManifest";
import { getMarketSnapshot } from "../market/marketData";
import { INITIAL_PARCEL_VALUE_LITRES, PARCEL_CRON_UTC, PARCEL_TIMEZONE, PARCEL_TIMEZONE_OFFSET_MINUTES, cronForLocalValuation, nextDailyValuationAt, parcelCode, timezoneOffsetMinutes, valuationRunKey, valueVirtualParcel } from "./parcelEconomy";

function asNumber(value: unknown) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

function asOptionalNumber(value: unknown) {
  if (value === null || value === undefined) return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

export async function ensureParcelEconomy() {
  const db = await getDb();
  if (!db) throw new Error("Parsel ekonomisi veritabanı kullanılamıyor.");

  await db.insert(citizenParcels).values(MARKET_ASSET_MANIFEST.map(asset => ({
    reportIndex: asset.reportIndex,
    provinceId: asset.provinceId,
    citizenSymbol: asset.symbol,
    citizenName: asset.name,
    coinGeckoId: asset.coinGeckoId,
    parcelCode: parcelCode(asset.provinceId, asset.reportIndex),
    baselineValueLitres: String(INITIAL_PARCEL_VALUE_LITRES),
    currentValueLitres: String(INITIAL_PARCEL_VALUE_LITRES),
  }))).onDuplicateKeyUpdate({ set: { updatedAt: new Date() } });

  const nextValuationAt = nextDailyValuationAt();
  await db.insert(parcelValuationSettings).values({ id: 1, timezone: PARCEL_TIMEZONE, timezoneOffsetMinutes: PARCEL_TIMEZONE_OFFSET_MINUTES, localSchedule: "10:30 Europe/Istanbul", cronUtc: PARCEL_CRON_UTC, nextValuationAt })
    .onDuplicateKeyUpdate({ set: { updatedAt: new Date() } });
  return db;
}

export async function getParcelEconomyOverview() {
  const db = await ensureParcelEconomy();
  const [parcels, settings] = await Promise.all([
    db.select().from(citizenParcels).orderBy(asc(citizenParcels.reportIndex)),
    db.select().from(parcelValuationSettings).where(eq(parcelValuationSettings.id, 1)).limit(1),
  ]);
  const provinces = parcels.reduce<Record<string, { citizenCount: number; totalValueLitres: number }>>((summary, parcel) => {
    const existing = summary[parcel.provinceId] ?? { citizenCount: 0, totalValueLitres: 0 };
    existing.citizenCount += 1;
    existing.totalValueLitres += asNumber(parcel.currentValueLitres);
    summary[parcel.provinceId] = existing;
    return summary;
  }, {});
  return { initialValueLitres: INITIAL_PARCEL_VALUE_LITRES, parcels, provinces, settings: settings[0] ?? null };
}

export async function updateParcelTimezone(timezone: string) {
  const db = await ensureParcelEconomy();
  const normalizedTimezone = timezone.trim();
  const offsetMinutes = timezoneOffsetMinutes(normalizedTimezone);
  const cronUtc = cronForLocalValuation(offsetMinutes);
  const nextValuationAt = nextDailyValuationAt(new Date(), offsetMinutes);
  await db.update(parcelValuationSettings).set({ timezone: normalizedTimezone, timezoneOffsetMinutes: offsetMinutes, localSchedule: `10:30 ${normalizedTimezone}`, cronUtc, nextValuationAt }).where(eq(parcelValuationSettings.id, 1));
  const settings = (await db.select().from(parcelValuationSettings).where(eq(parcelValuationSettings.id, 1)).limit(1))[0];
  return { timezone: normalizedTimezone, offsetMinutes, cronUtc, nextValuationAt, scheduleCronTaskUid: settings?.scheduleCronTaskUid ?? null };
}

async function applyDailyPriceDifference(runKey: string, now: Date) {
  const db = await ensureParcelEconomy();
  const [snapshot, parcels] = await Promise.all([getMarketSnapshot(), db.select().from(citizenParcels)]);
  const marketByReportIndex = new Map(snapshot.reportRecords.map(record => [record.reportIndex, record]));
  await db.transaction(async tx => {
    for (const parcel of parcels) {
      const market = marketByReportIndex.get(parcel.reportIndex);
      const valuation = valueVirtualParcel(asNumber(parcel.baselineValueLitres), asOptionalNumber(parcel.referenceUsdPrice), market?.usdPrice ?? null, market?.change24hPct ?? null);
      await tx.update(citizenParcels).set({
        currentValueLitres: String(valuation.nextValueLitres),
        referenceUsdPrice: valuation.marketUsdPrice === null ? parcel.referenceUsdPrice : String(valuation.marketUsdPrice),
        lastMarketChangePct: valuation.marketChangePct === null ? null : String(valuation.marketChangePct),
        lastAppliedChangePct: null,
        lastAppliedChangeLitres: valuation.appliedChangeLitres === null ? null : String(valuation.appliedChangeLitres),
        lastValuedAt: now,
      }).where(eq(citizenParcels.id, parcel.id));
    }
    await tx.update(parcelValuationRuns).set({ status: "completed", recordsValued: parcels.length, details: JSON.stringify({ model: "1000L-plus-daily-price-difference-capped-10L", source: snapshot.provider, fetchedAt: snapshot.fetchedAt, stale: snapshot.stale }), completedAt: now }).where(eq(parcelValuationRuns.runKey, runKey));
  });
  return { recordsValued: parcels.length, totalReportRecords: snapshot.reportRecordCount };
}

/** Idempotent daily job: same local date + 10:30 never revalues a parcel twice. */
export async function runDailyParcelValuation() {
  const db = await ensureParcelEconomy();
  const storedSettings = (await db.select().from(parcelValuationSettings).where(eq(parcelValuationSettings.id, 1)).limit(1))[0];
  const runKey = valuationRunKey(new Date(), storedSettings?.timezone ?? PARCEL_TIMEZONE);
  const existing = await db.select().from(parcelValuationRuns).where(eq(parcelValuationRuns.runKey, runKey)).limit(1);
  if (existing[0]?.status === "completed") return { skipped: true, runKey, recordsValued: existing[0].recordsValued };
  const now = new Date();
  if (!existing[0]) await db.insert(parcelValuationRuns).values({ runKey, scheduledFor: now, status: "running" });
  try {
    const result = await applyDailyPriceDifference(runKey, now);
    const valuationSettings = (await db.select().from(parcelValuationSettings).where(eq(parcelValuationSettings.id, 1)).limit(1))[0];
    await db.update(parcelValuationSettings).set({ lastValuationAt: now, nextValuationAt: nextDailyValuationAt(now, valuationSettings?.timezoneOffsetMinutes ?? PARCEL_TIMEZONE_OFFSET_MINUTES) }).where(eq(parcelValuationSettings.id, 1));
    return { skipped: false, runKey, recordsValued: result.recordsValued };
  } catch (error) {
    await db.update(parcelValuationRuns).set({ status: "failed", details: error instanceof Error ? error.message : "Bilinmeyen değerleme hatası" }).where(eq(parcelValuationRuns.runKey, runKey));
    throw error;
  }
}

/** Backward-compatible one-off operation; applies the current daily difference rule. */
export async function revalueAllParcelsFromCurrentUsd() {
  const db = await ensureParcelEconomy();
  const now = new Date();
  const runKey = `manual-difference-${now.toISOString().replace(/\D/g, "").slice(0, 14)}`;
  await db.insert(parcelValuationRuns).values({ runKey, scheduledFor: now, status: "running" });
  try {
    const result = await applyDailyPriceDifference(runKey, now);
    return { runKey, ...result };
  } catch (error) {
    await db.update(parcelValuationRuns).set({ status: "failed", details: error instanceof Error ? error.message : "Bilinmeyen manuel değerleme hatası" }).where(eq(parcelValuationRuns.runKey, runKey));
    throw error;
  }
}

/** User-approved reset: every citizen returns to a 1,000 L base and today's price becomes tomorrow's reference. */
export async function resetParcelsToBalancedEconomy() {
  const db = await ensureParcelEconomy();
  const now = new Date();
  const runKey = `balanced-reset-${now.toISOString().replace(/\D/g, "").slice(0, 14)}`;
  await db.insert(parcelValuationRuns).values({ runKey, scheduledFor: now, status: "running" });
  try {
    const [snapshot, parcels] = await Promise.all([getMarketSnapshot(), db.select().from(citizenParcels)]);
    const marketByReportIndex = new Map(snapshot.reportRecords.map(record => [record.reportIndex, record]));
    await db.transaction(async tx => {
      for (const parcel of parcels) {
        const market = marketByReportIndex.get(parcel.reportIndex);
        await tx.update(citizenParcels).set({
          baselineValueLitres: String(INITIAL_PARCEL_VALUE_LITRES),
          currentValueLitres: String(INITIAL_PARCEL_VALUE_LITRES),
          referenceUsdPrice: market?.usdPrice !== undefined && market.usdPrice !== null ? String(market.usdPrice) : null,
          lastMarketChangePct: market?.change24hPct !== undefined && market.change24hPct !== null ? String(market.change24hPct) : null,
          lastAppliedChangePct: null,
          lastAppliedChangeLitres: "0",
          lastValuedAt: now,
        }).where(eq(citizenParcels.id, parcel.id));
      }
      await tx.update(parcelValuationRuns).set({ status: "completed", recordsValued: parcels.length, details: JSON.stringify({ model: "1000L-plus-daily-price-difference-capped-10L", source: snapshot.provider, fetchedAt: snapshot.fetchedAt, stale: snapshot.stale }), completedAt: now }).where(eq(parcelValuationRuns.runKey, runKey));
    });
    return { runKey, recordsValued: parcels.length, totalReportRecords: snapshot.reportRecordCount };
  } catch (error) {
    await db.update(parcelValuationRuns).set({ status: "failed", details: error instanceof Error ? error.message : "Bilinmeyen dengeli sıfırlama hatası" }).where(eq(parcelValuationRuns.runKey, runKey));
    throw error;
  }
}
