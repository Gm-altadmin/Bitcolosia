import type { Request, Response } from "express";
import { timingSafeEqual } from "node:crypto";
import { sdk } from "../_core/sdk";
import { ENV } from "../_core/env";
import { createLockedForecasts, isRegisteredCommentatorTask } from "../commentators/commentatorService";

function isVercelCron(req: Request) {
  const suppliedSecret = req.headers.authorization?.replace(/^Bearer\s+/i, "") ?? "";
  const expectedSecret = ENV.vercelCronSecret;
  return Boolean(expectedSecret && suppliedSecret.length === expectedSecret.length && timingSafeEqual(Buffer.from(suppliedSecret), Buffer.from(expectedSecret)));
}

export async function commentatorForecastsHandler(req: Request, res: Response) {
  try {
    const vercelCron = isVercelCron(req);
    const user = vercelCron ? null : await sdk.authenticateRequest(req);
    if (!vercelCron && (!user?.isCron || !user.taskUid)) return res.status(403).json({ error: "cron-only" });
    if (!vercelCron && user?.isCron && user.taskUid && !(await isRegisteredCommentatorTask(user.taskUid, "forecast"))) return res.json({ ok: true, skipped: "orphan" });
    if (req.body?.dryRun === true) return res.json({ ok: true, dryRun: true, action: "commentator-forecasts" });
    return res.json({ ok: true, ...(await createLockedForecasts()) });
  } catch (error) {
    return res.status(500).json({
      error: error instanceof Error ? error.message : "Bilinmeyen yorumcu tahmin hatası",
      context: { path: "/api/scheduled/commentator-forecasts" },
      timestamp: new Date().toISOString(),
    });
  }
}
