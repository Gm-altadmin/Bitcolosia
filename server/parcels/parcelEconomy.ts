export const INITIAL_PARCEL_VALUE_LITRES = 1000;
export const MAX_DAILY_PARCEL_CHANGE_LITRES = 10;
export const PARCEL_TIMEZONE = "Europe/Istanbul";
export const PARCEL_TIMEZONE_OFFSET_MINUTES = 180;
export const LOCAL_VALUATION_HOUR = 10;
export const LOCAL_VALUATION_MINUTE = 30;
export const PARCEL_CRON_UTC = cronForLocalValuation(PARCEL_TIMEZONE_OFFSET_MINUTES);

export type ParcelValuation = {
  marketUsdPrice: number | null;
  marketChangePct: number | null;
  priceDifferenceLitres: number | null;
  appliedChangeLitres: number | null;
  nextValueLitres: number;
};

export function parcelCode(provinceId: string, reportIndex: number) {
  return `P-${provinceId.toUpperCase().slice(0, 4)}-${String(reportIndex).padStart(3, "0")}`;
}

/** 1 USD = 1 L and 1 L = 1,000 mL. Only the daily price difference affects a parcel, capped at ±10 L. */
export function valueVirtualParcel(baselineValueLitres: number, referenceUsdPrice: number | null, usdPrice: number | null, marketChangePct: number | null): ParcelValuation {
  const marketUsdPrice = usdPrice !== null && Number.isFinite(usdPrice) && usdPrice >= 0 ? usdPrice : null;
  const reference = referenceUsdPrice !== null && Number.isFinite(referenceUsdPrice) && referenceUsdPrice >= 0 ? referenceUsdPrice : null;
  const priceDifferenceLitres = marketUsdPrice !== null && reference !== null ? Math.round((marketUsdPrice - reference) * 1000) / 1000 : null;
  const appliedChangeLitres = priceDifferenceLitres === null ? null : Math.max(-MAX_DAILY_PARCEL_CHANGE_LITRES, Math.min(MAX_DAILY_PARCEL_CHANGE_LITRES, priceDifferenceLitres));
  const nextValueLitres = Math.round((baselineValueLitres + (appliedChangeLitres ?? 0)) * 1000) / 1000;
  return {
    marketUsdPrice,
    marketChangePct: marketChangePct !== null && Number.isFinite(marketChangePct) ? marketChangePct : null,
    priceDifferenceLitres,
    appliedChangeLitres,
    nextValueLitres,
  };
}

/** Europe/Istanbul is fixed UTC+03:00; daily local 10:30 is 07:30 UTC. */
export function cronForLocalValuation(timezoneOffsetMinutes: number) {
  const localMinutes = LOCAL_VALUATION_HOUR * 60 + LOCAL_VALUATION_MINUTE;
  const utcMinutes = ((localMinutes - timezoneOffsetMinutes) % 1440 + 1440) % 1440;
  return `0 ${utcMinutes % 60} ${Math.floor(utcMinutes / 60)} * * *`;
}

export function nextDailyValuationAt(now = new Date(), timezoneOffsetMinutes = PARCEL_TIMEZONE_OFFSET_MINUTES) {
  const localNow = new Date(now.getTime() + timezoneOffsetMinutes * 60_000);
  const targetLocal = new Date(Date.UTC(localNow.getUTCFullYear(), localNow.getUTCMonth(), localNow.getUTCDate(), LOCAL_VALUATION_HOUR, LOCAL_VALUATION_MINUTE, 0, 0));
  if (targetLocal.getTime() <= localNow.getTime()) targetLocal.setUTCDate(targetLocal.getUTCDate() + 1);
  return new Date(targetLocal.getTime() - timezoneOffsetMinutes * 60_000);
}

export function timezoneOffsetMinutes(timeZone: string, now = new Date()) {
  try {
    const parts = new Intl.DateTimeFormat("en-US", { timeZone, year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit", second: "2-digit", hourCycle: "h23" }).formatToParts(now);
    const pick = (type: string) => Number(parts.find(part => part.type === type)?.value);
    const localAsUtc = Date.UTC(pick("year"), pick("month") - 1, pick("day"), pick("hour"), pick("minute"), pick("second"));
    const offset = Math.round((localAsUtc - now.getTime()) / 60_000);
    if (!Number.isFinite(offset) || Math.abs(offset) > 14 * 60) throw new Error("Geçersiz saat dilimi ofseti");
    return offset;
  } catch {
    throw new Error("Tarayıcıdan alınan saat dilimi desteklenmiyor.");
  }
}

export function valuationRunKey(now = new Date(), timeZone = PARCEL_TIMEZONE) {
  const localDate = new Intl.DateTimeFormat("sv-SE", { timeZone, year: "numeric", month: "2-digit", day: "2-digit" }).format(now);
  return `${localDate}-10:30`;
}
