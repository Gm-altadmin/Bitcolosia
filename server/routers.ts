import { COOKIE_NAME } from "@shared/const";
import { getSessionCookieOptions } from "./_core/cookies";
import { systemRouter } from "./_core/systemRouter";
import { adminProcedure, publicProcedure, router } from "./_core/trpc";
import { getManifestSummary, getMarketSnapshot } from "./market/marketData";
import { getParcelEconomyOverview, updateParcelTimezone } from "./parcels/parcelService";
import { updateHeartbeatJob } from "./_core/heartbeat";
import { z } from "zod";
import { addCommentatorResearch, awardCommentatorCycles, createLockedForecasts, getCommentatorAnalysisView, getCommentatorCeremonyView, getCommentatorOverview, previewCommentatorAwards } from "./commentators/commentatorService";
import { getKoboldMarketSummary } from "./commentators/koboldSummary";

export const appRouter = router({
  system: systemRouter,
  auth: router({
    me: publicProcedure.query((opts) => opts.ctx.user),
    logout: publicProcedure.mutation(({ ctx }) => {
      const cookieOptions = getSessionCookieOptions(ctx.req);
      ctx.res.clearCookie(COOKIE_NAME, { ...cookieOptions, maxAge: -1 });
      return { success: true } as const;
    }),
  }),
  market: router({
    manifest: publicProcedure.query(() => getManifestSummary()),
    snapshot: publicProcedure.query(async () => getMarketSnapshot()),
  }),
  parcels: router({
    overview: publicProcedure.query(async () => getParcelEconomyOverview()),
    updateTimezone: adminProcedure.input(z.object({ timezone: z.string().min(1).max(64) })).mutation(async ({ input }) => {
      const settings = await updateParcelTimezone(input.timezone);
      if (settings.scheduleCronTaskUid) {
        const job = await updateHeartbeatJob(settings.scheduleCronTaskUid, {
          cron: settings.cronUtc,
          description: `Her gün 10:30 ${settings.timezone} saatinde 100 vatandaşın sanal parsellerini güncel piyasa snapshot ile değerler.`,
        }, "");
        return { ...settings, nextExecutionAt: job.nextExecutionAt ?? settings.nextValuationAt };
      }
      return settings;
    }),
  }),
  commentators: router({
    overview: publicProcedure.query(async () => getCommentatorOverview()),
    ceremonyView: publicProcedure.query(async () => getCommentatorCeremonyView()),
    analysisView: publicProcedure.query(async () => getCommentatorAnalysisView()),
    addResearch: adminProcedure.input(z.object({
      commentatorId: z.number().int().positive(),
      cycleId: z.number().int().positive().optional(),
      sourceTier: z.enum(["official", "verified_news", "social_signal"]),
      sourceUrl: z.string().url().max(1024).optional(),
      sourceTitle: z.string().min(1).max(512).optional(),
      body: z.string().min(12).max(8_000),
    })).mutation(async ({ input }) => addCommentatorResearch(input)),
    generateForecasts: adminProcedure.mutation(async () => createLockedForecasts()),
    runAwards: adminProcedure.mutation(async () => awardCommentatorCycles()),
    previewAwards: adminProcedure.mutation(async () => previewCommentatorAwards()),
    koboldSummary: adminProcedure.input(z.object({
      sectorId: z.enum(["reserve", "infrastructure", "frontier", "liquidity", "archive", "commons"]),
      paperKind: z.enum(["research", "learning"]),
    })).mutation(async ({ input }) => getKoboldMarketSummary(input)),
  }),
});

export type AppRouter = typeof appRouter;
