import type { Request, Response } from "express";
import { z } from "zod";
import { timingSafeEqual } from "node:crypto";
import { sdk } from "../_core/sdk";
import { ENV } from "../_core/env";
import { addScheduledResearch, isRegisteredCommentatorTask } from "../commentators/commentatorService";
import { runAutomatedResearch } from "../commentators/researchAgent";

const researchPayload = z.object({
  entries: z.array(z.object({
    sectorId: z.enum(["reserve", "infrastructure", "frontier", "liquidity", "archive", "commons"]),
    sourceTier: z.enum(["official", "verified_news", "social_signal"]),
    sourceUrl: z.string().url().max(1024),
    sourceTitle: z.string().min(1).max(512),
    body: z.string().min(12).max(8_000),
    publishedAt: z.string().datetime({ offset: true }),
  })).min(1).max(12),
});

export async function commentatorResearchHandler(req: Request, res: Response) {
  try {
    const suppliedSecret = req.headers.authorization?.replace(/^Bearer\s+/i, "") ?? "";
    const expectedSecret = ENV.vercelCronSecret;
    const vercelCron = Boolean(expectedSecret && suppliedSecret.length === expectedSecret.length && timingSafeEqual(Buffer.from(suppliedSecret), Buffer.from(expectedSecret)));
    const user = vercelCron ? null : await sdk.authenticateRequest(req);
    const manusCron = Boolean(user?.isCron && user.taskUid && await isRegisteredCommentatorTask(user.taskUid, "research"));
    if (!manusCron && !vercelCron) return res.status(403).json({ error: "cron-only" });
    if (user?.isCron && user.taskUid && !manusCron) return res.json({ ok: true, skipped: "orphan" });
    if (req.body?.dryRun === true) return res.json({ ok: true, dryRun: true, action: "commentator-research" });
    if (vercelCron && (req.method === "GET" || req.body?.autoRun === true || !req.body?.entries)) {
      return res.json({ ok: true, ...(await runAutomatedResearch({ adapter: ENV.researchAdapter || "gdelt" })) });
    }
    const payload = researchPayload.parse(req.body);
    return res.json({ ok: true, ...(await addScheduledResearch(payload.entries, { triggerTaskUid: user?.taskUid, adapter: "manus_agent" })) });
  } catch (error) {
    const status = error instanceof z.ZodError ? 400 : 500;
    return res.status(status).json({
      error: error instanceof Error ? error.message : "Bilinmeyen yorumcu araştırma hatası",
      context: { path: "/api/scheduled/commentator-research" },
      timestamp: new Date().toISOString(),
    });
  }
}
