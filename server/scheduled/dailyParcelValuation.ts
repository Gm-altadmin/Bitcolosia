import type { Request, Response } from "express";
import { timingSafeEqual } from "node:crypto";
import { sdk } from "../_core/sdk";
import { ENV } from "../_core/env";
import { getMarketSnapshot } from "../market/marketData";
import { runDailyParcelValuation } from "../parcels/parcelService";
import { captureCommentatorOutcomeSnapshot } from "../commentators/commentatorService";

function isVercelCron(req: Request) {
  const suppliedSecret = req.headers.authorization?.replace(/^Bearer\s+/i, "") ?? "";
  const expectedSecret = ENV.vercelCronSecret;
  return Boolean(expectedSecret && suppliedSecret.length === expectedSecret.length && timingSafeEqual(Buffer.from(suppliedSecret), Buffer.from(expectedSecret)));
}

export async function dailyParcelValuationHandler(req: Request, res: Response) {
  try {
    const vercelCron = isVercelCron(req);
    const user = vercelCron ? null : await sdk.authenticateRequest(req);
    if (!vercelCron && (!user?.isCron || !user.taskUid)) return res.status(403).json({ error: "cron-only" });
    if (req.body?.dryRun === true) {
      const snapshot = await getMarketSnapshot();
      return res.json({ ok: true, dryRun: true, reportRecordCount: snapshot.reportRecordCount, providerAssetCount: snapshot.uniqueProviderAssetCount, fetchedAt: snapshot.fetchedAt });
    }
    const result = await runDailyParcelValuation();
    const commentatorOutcome = await captureCommentatorOutcomeSnapshot();
    return res.json({ ok: true, ...result, commentatorOutcome });
  } catch (error) {
    return res.status(500).json({
      error: error instanceof Error ? error.message : "Bilinmeyen günlük değerleme hatası",
      context: { path: "/api/scheduled/daily-parcel-valuation" },
      timestamp: new Date().toISOString(),
    });
  }
}
