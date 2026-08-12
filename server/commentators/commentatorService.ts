import { and, desc, eq, gte, inArray, sql } from "drizzle-orm";
import { z } from "zod";
import {
  commentatorAwardResults,
  commentatorForecastCycles,
  commentatorForecasts,
  commentatorJournalEntries,
  commentatorOutcomeSnapshots,
  commentatorProgramSettings,
  commentatorResearchRejections,
  commentatorResearchRuns,
  commentatorStartSnapshots,
  sectorCommentators,
  waterReservoirLedger,
} from "../../drizzle/schema";
import { getDb } from "../db";
import { ENV } from "../_core/env";
import { invokeLLM, listLLMModels } from "../_core/llm";
import { MARKET_ASSET_MANIFEST } from "../market/assetManifest";
import { getMarketSnapshot, type ReportMarketRecord } from "../market/marketData";
import {
  COMMENTATOR_SECTORS,
  FORECAST_RANKS,
  calculateReservoirCredits,
  forecastSlotCount,
  scoreSectorAward,
} from "./commentatorEconomy";
import { RESEARCH_MAX_PER_SECTOR, RESEARCH_POLICY_VERSION, type ResearchRejectionReason, type ResearchTier, validateResearchCandidate } from "./researchTrust";

const TURKEY_OFFSET_MS = 3 * 60 * 60 * 1000;
const FORECAST_LLM_TIMEOUT_MS = 45_000;

const proposalSchema = z.object({
  learningSummary: z.string().min(1).max(1200),
  forecasts: z.array(z.object({
    reportIndex: z.number().int().positive(),
    forecastRank: z.number().int().min(1).max(4),
    confidence: z.number().min(0).max(1),
    rationale: z.string().min(8).max(600),
  })).min(1).max(4),
});

function localDateKey(now = new Date()) {
  return new Intl.DateTimeFormat("sv-SE", { timeZone: "Europe/Istanbul", year: "numeric", month: "2-digit", day: "2-digit" }).format(now);
}

function utcAtIstanbulDate(localDate: string, hour: number, minute: number, plusDays = 0) {
  const [year, month, day] = localDate.split("-").map(Number);
  return new Date(Date.UTC(year!, month! - 1, day! + plusDays, hour - 3, minute, 0, 0));
}

function forecastCycleKey(localDate: string, sectorId: string) {
  return `commentator:${localDate}:11:30:${sectorId}`;
}

function outcomeKey(localDate: string) {
  return `commentator-outcome:${localDate}:10:30`;
}

function startKey(localDate: string) {
  return `commentator-start:${localDate}:11:30`;
}

function numberValue(value: unknown) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

export type CommentatorOperationalState = "awarded" | "locked" | "researching" | "idle";

export function deriveCommentatorOperationalState(input: {
  hasAward: boolean;
  cycleStatus: string | null;
  hasResearch: boolean;
}): CommentatorOperationalState {
  if (input.hasAward) return "awarded";
  if (input.cycleStatus === "locked") return "locked";
  if (input.hasResearch) return "researching";
  return "idle";
}

function contentText(content: unknown) {
  if (typeof content === "string") return content;
  return "";
}

async function selectCommentatorModel() {
  // Bağımsız Vercel dağıtımında RESEARCH_LLM_MODEL açıkça ayarlanmışsa (örn. "gpt-4o-mini"),
  // model kataloğu araması yerine doğrudan bu model kullanılır.
  if (ENV.researchLlmModel && ENV.researchLlmModel.trim().length > 0) return ENV.researchLlmModel.trim();
  const catalog = await listLLMModels();
  const model = catalog.data.find(item => item.id === "gpt-5-mini")?.id ?? catalog.data[0]?.id;
  if (!model) throw new Error("Yorumcu için kullanılabilir yapay zekâ modeli bulunamadı.");
  return model;
}

export async function ensureCommentatorProgram() {
  const db = await getDb();
  if (!db) throw new Error("Yorumcu programı için veritabanı kullanılamıyor.");

  for (const commentator of COMMENTATOR_SECTORS) {
    await db.insert(sectorCommentators).values(commentator).onDuplicateKeyUpdate({
      set: { displayName: commentator.displayName, responsibility: commentator.responsibility, updatedAt: new Date() },
    });
  }
  await db.insert(commentatorProgramSettings).values({ id: 1 }).onDuplicateKeyUpdate({ set: { updatedAt: new Date() } });
  return db;
}

export async function isRegisteredCommentatorTask(taskUid: string, task: "award" | "forecast" | "research") {
  const db = await ensureCommentatorProgram();
  const settings = await db.select().from(commentatorProgramSettings).where(eq(commentatorProgramSettings.id, 1)).limit(1);
  const expectedUid = task === "award"
    ? settings[0]?.awardScheduleCronTaskUid
    : task === "forecast"
      ? settings[0]?.forecastScheduleCronTaskUid
      : settings[0]?.researchScheduleCronTaskUid;
  return Boolean(expectedUid && expectedUid === taskUid);
}

async function getSectorJournal(db: NonNullable<Awaited<ReturnType<typeof getDb>>>, commentatorId: number) {
  return db.select().from(commentatorJournalEntries)
    .where(eq(commentatorJournalEntries.commentatorId, commentatorId))
    .orderBy(desc(commentatorJournalEntries.createdAt)).limit(12);
}

function buildProposalPrompt(commentator: { displayName: string; responsibility: string }, candidates: ReportMarketRecord[], journal: Array<{ body: string; entryType: string }>, slotCount: number) {
  const candidateData = candidates.map(record => ({
    reportIndex: record.reportIndex,
    symbol: record.symbol,
    name: record.name,
    usdPrice: record.usdPrice,
    change24hPct: record.change24hPct,
    marketCapUsd: record.marketCapUsd,
  }));
  const learning = journal.map(entry => ({ type: entry.entryType, body: entry.body.slice(0, 500) }));
  return `Sen BitColosİa yorumcusu ${commentator.displayName}'sın. Sorumluluğun: ${commentator.responsibility}
Bu bir oyun içi tahmindir; yatırım tavsiyesi vermez, gerçek alım-satım önermez.
Sadece aşağıdaki canlı piyasa kesiti ve geçmiş hata/araştırma günlüğü ile çalış. Kaynak veya haber uydurma. Tam olarak ${slotCount} benzersiz varlığı 1–${slotCount} sırasıyla seç. Sektörde daha az varlık varsa eksik sıraları uydurma. Her varlık gerekçesini en fazla 420 karakter, öğrenme özetini en fazla 900 karakter yaz.
Canlı piyasa kesiti: ${JSON.stringify(candidateData)}
Geçmiş günlük: ${JSON.stringify(learning)}
Her seçim için kısa, ölçülebilir piyasa gerekçesi yaz. Öğrenme özeti, önceki hata kayıtlarından somut ders içersin.`;
}

export async function createLockedForecasts(now = new Date()) {
  const db = await ensureCommentatorProgram();
  const snapshot = await getMarketSnapshot();
  if (snapshot.stale) throw new Error("Taze piyasa snapshot’ı olmadan yorumcu tahmini kilitlenemez.");

  const localDate = localDateKey(now);
  const lockedAt = utcAtIstanbulDate(localDate, 11, 30);
  const targetOutcomeAt = utcAtIstanbulDate(localDate, 10, 30, 1);
  const priceCutKey = startKey(localDate);
  const commentators = await db.select().from(sectorCommentators).where(eq(sectorCommentators.isActive, 1));
  const model = await selectCommentatorModel();
  let createdCycles = 0;

  const startPrices = snapshot.reportRecords
    .filter(record => record.availability === "available" && record.usdPrice !== null)
    .map(record => ({ startKey: priceCutKey, reportIndex: record.reportIndex, usdPrice: String(record.usdPrice), snapshotFetchedAt: new Date(snapshot.fetchedAt), provider: snapshot.provider }));
  await db.insert(commentatorStartSnapshots).values(startPrices).onDuplicateKeyUpdate({
    set: { usdPrice: sql`VALUES(usdPrice)`, snapshotFetchedAt: sql`VALUES(snapshotFetchedAt)`, provider: sql`VALUES(provider)` },
  });

  for (const commentator of commentators) {
    const cycleKey = forecastCycleKey(localDate, commentator.sectorId);
    const existing = await db.select().from(commentatorForecastCycles).where(eq(commentatorForecastCycles.cycleKey, cycleKey)).limit(1);
    if (existing[0]) continue;

    const candidates = snapshot.reportRecords.filter(record => record.provinceId === commentator.sectorId && record.availability === "available" && record.usdPrice !== null);
    const slotCount = forecastSlotCount(candidates.length);
    if (!slotCount) throw new Error(`${commentator.sectorId} için kullanılabilir piyasa kaydı yok.`);
    const journal = await getSectorJournal(db, commentator.id);
    let response: Awaited<ReturnType<typeof invokeLLM>>;
    try {
      response = await Promise.race([
        invokeLLM({
          model,
          messages: [
            { role: "system", content: "Sadece istenen JSON şemasına uyan, uydurma dış kaynak içermeyen bir BitColosİa sektör tahmini üret." },
            { role: "user", content: buildProposalPrompt(commentator, candidates, journal, slotCount) },
          ],
          response_format: {
            type: "json_schema",
            json_schema: {
              name: "commentator_forecast",
              strict: true,
              schema: {
                type: "object",
                properties: {
                  learningSummary: { type: "string" },
                  forecasts: {
                    type: "array",
                    minItems: slotCount,
                    maxItems: slotCount,
                    items: {
                      type: "object",
                      properties: {
                        reportIndex: { type: "integer" },
                        forecastRank: { type: "integer" },
                        confidence: { type: "number" },
                        rationale: { type: "string" },
                      },
                      required: ["reportIndex", "forecastRank", "confidence", "rationale"],
                      additionalProperties: false,
                    },
                  },
                },
                required: ["learningSummary", "forecasts"],
                additionalProperties: false,
              },
            },
          },
        }),
        new Promise<never>((_, reject) => setTimeout(() => reject(new Error(`${FORECAST_LLM_TIMEOUT_MS / 1000} sn zaman aşımı`)), FORECAST_LLM_TIMEOUT_MS)),
      ]);
    } catch (error) {
      const detail = error instanceof Error ? error.message : String(error);
      throw new Error(`${commentator.sectorId} için yorumcu tahmini üretilemedi (model: ${model}, aday: ${slotCount}): ${detail}`);
    }
    const content = contentText(response.choices[0]?.message.content);
    if (!content) throw new Error(`${commentator.sectorId} için yorumcu modeli boş yanıt döndürdü (model: ${model}).`);
    const rawProposal = JSON.parse(content) as { learningSummary?: unknown; forecasts?: Array<Record<string, unknown>> };
    if (typeof rawProposal.learningSummary === "string") rawProposal.learningSummary = rawProposal.learningSummary.slice(0, 1200);
    if (Array.isArray(rawProposal.forecasts)) {
      rawProposal.forecasts = rawProposal.forecasts.map(forecast => ({
        ...forecast,
        rationale: typeof forecast.rationale === "string" ? forecast.rationale.slice(0, 600) : forecast.rationale,
      }));
    }
    const proposal = proposalSchema.parse(rawProposal);
    const permitted = new Map(candidates.map(record => [record.reportIndex, record]));
    const ids = proposal.forecasts.map(forecast => forecast.reportIndex);
    const ranks = proposal.forecasts.map(forecast => forecast.forecastRank);
    const expectedRanks = FORECAST_RANKS.slice(0, slotCount);
    if (proposal.forecasts.length !== slotCount || new Set(ids).size !== slotCount || ids.some(id => !permitted.has(id)) || new Set(ranks).size !== slotCount || !expectedRanks.every(rank => ranks.includes(rank))) {
      throw new Error(`${commentator.displayName} için tahmin teklifi sektör kurallarını karşılamıyor.`);
    }

    await db.transaction(async tx => {
      const inserted = await tx.insert(commentatorForecastCycles).values({
        cycleKey,
        sectorId: commentator.sectorId,
        commentatorId: commentator.id,
        lockedAt,
        targetOutcomeAt,
        snapshotFetchedAt: new Date(snapshot.fetchedAt),
        modelId: model,
        learningSummary: proposal.learningSummary,
      });
      const cycleId = Number(inserted[0].insertId);
      await tx.insert(commentatorForecasts).values(proposal.forecasts.map(forecast => ({
        cycleId,
        reportIndex: forecast.reportIndex,
        forecastRank: forecast.forecastRank,
        lockedUsdPrice: String(permitted.get(forecast.reportIndex)!.usdPrice),
        confidence: String(forecast.confidence),
        rationale: forecast.rationale,
      })));
      await tx.insert(commentatorJournalEntries).values({
        commentatorId: commentator.id,
        cycleId,
        entryType: "forecast_learning",
        sourceTier: "internal",
        body: proposal.learningSummary,
      });
    });
    createdCycles += 1;
  }
  return { createdCycles, targetOutcomeAt, model };
}

export async function captureCommentatorOutcomeSnapshot(now = new Date()) {
  const db = await ensureCommentatorProgram();
  const snapshot = await getMarketSnapshot();
  if (snapshot.stale) throw new Error("Eski snapshot ile yorumcu ödülü için sonuç kesiti dondurulamaz.");
  const localDate = localDateKey(now);
  const key = outcomeKey(localDate);
  const values = snapshot.reportRecords
    .filter(record => record.availability === "available" && record.usdPrice !== null)
    .map(record => ({ outcomeKey: key, reportIndex: record.reportIndex, usdPrice: String(record.usdPrice), snapshotFetchedAt: new Date(snapshot.fetchedAt), provider: snapshot.provider }));
  if (!values.length) throw new Error("Yorumcu sonuç kesiti için piyasa fiyatı bulunamadı.");
  await db.insert(commentatorOutcomeSnapshots).values(values).onDuplicateKeyUpdate({ set: { usdPrice: sql`VALUES(usdPrice)`, snapshotFetchedAt: sql`VALUES(snapshotFetchedAt)`, provider: sql`VALUES(provider)` } });
  return { outcomeKey: key, recordsCaptured: values.length, fetchedAt: snapshot.fetchedAt };
}

export async function awardCommentatorCycles(now = new Date()) {
  const db = await ensureCommentatorProgram();
  const localDate = localDateKey(now);
  const currentOutcomeKey = outcomeKey(localDate);
  const outcomes = await db.select().from(commentatorOutcomeSnapshots).where(eq(commentatorOutcomeSnapshots.outcomeKey, currentOutcomeKey));
  if (!outcomes.length) return { awardedCycles: 0, waitingForFreshOutcome: true };
  const cycles = await db.select().from(commentatorForecastCycles).where(eq(commentatorForecastCycles.status, "locked"));
  const dueCycles = cycles.filter(cycle => localDateKey(cycle.targetOutcomeAt) === localDate);
  let awardedCycles = 0;

  for (const cycle of dueCycles) {
    const existingAward = await db.select().from(commentatorAwardResults).where(eq(commentatorAwardResults.cycleId, cycle.id)).limit(1);
    if (existingAward[0]) continue;
    const picks = await db.select().from(commentatorForecasts).where(eq(commentatorForecasts.cycleId, cycle.id));
    const sectorStart = await db.select().from(commentatorStartSnapshots).where(eq(commentatorStartSnapshots.startKey, startKey(localDateKey(cycle.lockedAt))));
    const sectorOutcome = outcomes;
    const sectorReportIndexes = new Set(MARKET_ASSET_MANIFEST.filter(asset => asset.provinceId === cycle.sectorId).map(asset => asset.reportIndex));
    const allStart = sectorStart.filter(price => sectorReportIndexes.has(price.reportIndex)).map(price => ({ reportIndex: price.reportIndex, usdPrice: numberValue(price.usdPrice) }));
    const allOutcome = sectorOutcome.filter(price => sectorReportIndexes.has(price.reportIndex)).map(price => ({ reportIndex: price.reportIndex, usdPrice: numberValue(price.usdPrice) }));
    const scoring = scoreSectorAward(allStart, allOutcome, picks.map(pick => ({ reportIndex: pick.reportIndex, forecastRank: pick.forecastRank, lockedUsdPrice: numberValue(pick.lockedUsdPrice) })));
    const credits = calculateReservoirCredits(picks.map(pick => ({ reportIndex: pick.reportIndex, forecastRank: pick.forecastRank, lockedUsdPrice: numberValue(pick.lockedUsdPrice) })), allOutcome);

    await db.transaction(async tx => {
      await tx.insert(commentatorAwardResults).values({
        cycleId: cycle.id,
        actualWinnerReportIndex: scoring.actualWinnerReportIndex,
        actualWinnerDeltaLitres: scoring.actualWinnerDeltaLitres === null ? null : String(scoring.actualWinnerDeltaLitres),
        silverMedalAwarded: scoring.silverMedalAwarded ? 1 : 0,
        goldStarAwarded: scoring.goldStarAwarded ? 1 : 0,
        predictionScore: scoring.predictionScore,
        status: scoring.status,
      });
      await tx.update(commentatorForecastCycles).set({ status: scoring.status === "awarded" ? "evaluated" : "no_positive_result" }).where(eq(commentatorForecastCycles.id, cycle.id));
      await tx.update(sectorCommentators).set({
        starCount: sql`${sectorCommentators.starCount} + ${scoring.goldStarAwarded ? 1 : 0}`,
        exactWinnerCount: sql`${sectorCommentators.exactWinnerCount} + ${scoring.goldStarAwarded ? 1 : 0}`,
        completedCycles: sql`${sectorCommentators.completedCycles} + 1`,
      }).where(eq(sectorCommentators.id, cycle.commentatorId));
      await tx.insert(waterReservoirLedger).values(credits.map(credit => ({
        cycleId: cycle.id,
        sectorId: cycle.sectorId,
        reportIndex: credit.reportIndex,
        rawGainLitres: String(credit.rawGainLitres),
        verifiedSurplusLitres: String(credit.verifiedSurplusLitres),
        creditedLitres: String(credit.creditedLitres),
      })));
      await tx.insert(commentatorJournalEntries).values({
        commentatorId: cycle.commentatorId,
        cycleId: cycle.id,
        entryType: "error_lesson",
        sourceTier: "internal",
        body: scoring.status === "no_positive_result"
          ? "Bu sektörün sonuç penceresinde pozitif kazanan oluşmadı; yeni turda risk sinyalleri gözden geçirilecek."
          : scoring.goldStarAwarded
            ? "1. sıra tahmin gerçek kazananla eşleşti; seçimi destekleyen ölçülebilir sinyaller korunacak."
            : "Gerçek kazananın tahmin sırası ve gerekçesi incelenecek; yeni turda önceliklendirme kalibre edilecek.",
      });
    });
    awardedCycles += 1;
  }
  return { awardedCycles, waitingForFreshOutcome: false };
}

export async function previewCommentatorAwards(now = new Date()) {
  const db = await ensureCommentatorProgram();
  const snapshot = await getMarketSnapshot();
  if (snapshot.stale) throw new Error("Canlı piyasa snapshot’ı olmadan deneme ödülü hesaplanamaz.");

  const commentators = await db.select().from(sectorCommentators).where(eq(sectorCommentators.isActive, 1));
  const commentatorById = new Map(commentators.map(commentator => [commentator.id, commentator]));
  const cycles = await db.select().from(commentatorForecastCycles).where(eq(commentatorForecastCycles.status, "locked"));
  const outcomes = snapshot.reportRecords
    .filter(record => record.availability === "available" && record.usdPrice !== null)
    .map(record => ({ reportIndex: record.reportIndex, usdPrice: record.usdPrice! }));

  const previews = [] as Array<{
    sectorId: string;
    displayName: string;
    actualWinnerReportIndex: number | null;
    goldStar: boolean;
    silverMedal: boolean;
    rawSurplusLitres: number;
    creditedLitres: number;
    status: string;
  }>;

  for (const cycle of cycles) {
    const commentator = commentatorById.get(cycle.commentatorId);
    if (!commentator) continue;
    const picks = await db.select().from(commentatorForecasts).where(eq(commentatorForecasts.cycleId, cycle.id));
    const sectorIndexes = new Set(MARKET_ASSET_MANIFEST.filter(asset => asset.provinceId === cycle.sectorId).map(asset => asset.reportIndex));
    const startRows = await db.select().from(commentatorStartSnapshots).where(eq(commentatorStartSnapshots.startKey, startKey(localDateKey(cycle.lockedAt))));
    const allStart = startRows.filter(row => sectorIndexes.has(row.reportIndex)).map(row => ({ reportIndex: row.reportIndex, usdPrice: numberValue(row.usdPrice) }));
    const allOutcome = outcomes.filter(row => sectorIndexes.has(row.reportIndex));
    const normalizedPicks = picks.map(pick => ({ reportIndex: pick.reportIndex, forecastRank: pick.forecastRank, lockedUsdPrice: numberValue(pick.lockedUsdPrice) }));
    const scoring = scoreSectorAward(allStart, allOutcome, normalizedPicks);
    const credits = calculateReservoirCredits(normalizedPicks, allOutcome);
    previews.push({
      sectorId: cycle.sectorId,
      displayName: commentator.displayName,
      actualWinnerReportIndex: scoring.actualWinnerReportIndex,
      goldStar: scoring.goldStarAwarded,
      silverMedal: scoring.silverMedalAwarded,
      rawSurplusLitres: credits.reduce((sum, credit) => sum + credit.verifiedSurplusLitres, 0),
      creditedLitres: credits.reduce((sum, credit) => sum + credit.creditedLitres, 0),
      status: scoring.status,
    });
  }

  return {
    generatedAt: snapshot.fetchedAt,
    previews,
    totalRawSurplusLitres: previews.reduce((sum, preview) => sum + preview.rawSurplusLitres, 0),
    totalCreditedLitres: previews.reduce((sum, preview) => sum + preview.creditedLitres, 0),
  };
}

export async function addCommentatorResearch(input: { commentatorId: number; cycleId?: number; sourceTier: "official" | "verified_news" | "social_signal"; sourceUrl?: string; sourceTitle?: string; body: string }) {
  const db = await ensureCommentatorProgram();
  await db.insert(commentatorJournalEntries).values({ ...input, entryType: "research" });
  return { ok: true };
}

function researchRunKey(taskUid: string | undefined, now = new Date()) {
  return `research:${localDateKey(now)}:${taskUid ?? "manual"}`;
}

function startOfIstanbulDay(now = new Date()) {
  const local = localDateKey(now);
  return utcAtIstanbulDate(local, 0, 0);
}

type ScheduledResearchEntry = { sectorId: string; sourceTier: ResearchTier; sourceUrl: string; sourceTitle: string; body: string; publishedAt: string };

export async function addScheduledResearch(entries: ScheduledResearchEntry[], options: { triggerTaskUid?: string; adapter?: string; now?: Date; searchCalls?: number; llmCalls?: number; candidateCount?: number; adapterRejections?: Array<{ sectorId: string; sourceUrl?: string; sourceHost?: string; reason: ResearchRejectionReason; details: string }> } = {}) {
  const db = await ensureCommentatorProgram();
  const now = options.now ?? new Date();
  const settings = await db.select().from(commentatorProgramSettings).where(eq(commentatorProgramSettings.id, 1)).limit(1);
  const config = settings[0];
  const maxPerSector = config?.researchMaxPerSector ?? RESEARCH_MAX_PER_SECTOR;
  const freshnessHours = config?.researchFreshnessHours ?? 48;
  const adapter = options.adapter ?? config?.researchAdapter ?? "manus_agent";
  const runKey = researchRunKey(options.triggerTaskUid, now);
  const existingRun = await db.select().from(commentatorResearchRuns).where(eq(commentatorResearchRuns.runKey, runKey)).limit(1);
  if (existingRun[0]?.status !== "running") {
    return { accepted: existingRun[0]?.acceptedCount ?? 0, ignored: existingRun[0]?.rejectedCount ?? 0, runId: existingRun[0]?.id, skipped: "already_processed" as const };
  }
  let runId: number;
  if (existingRun[0]) {
    runId = existingRun[0].id;
  } else {
    const insertedRun = await db.insert(commentatorResearchRuns).values({
      runKey,
      triggerTaskUid: options.triggerTaskUid,
      adapter,
      policyVersion: RESEARCH_POLICY_VERSION,
      candidateCount: options.candidateCount ?? entries.length,
    });
    runId = Number(insertedRun[0].insertId);
  }
  const commentators = await db.select().from(sectorCommentators).where(eq(sectorCommentators.isActive, 1));
  const bySector = new Map(commentators.map(commentator => [commentator.sectorId, commentator]));
  const dailyResearch = await db.select().from(commentatorJournalEntries).where(and(
    eq(commentatorJournalEntries.entryType, "research"),
    gte(commentatorJournalEntries.createdAt, startOfIstanbulDay(now)),
  ));
  const usedBySector = new Map(commentators.map(commentator => [commentator.sectorId, dailyResearch.filter(entry => entry.commentatorId === commentator.id).length]));
  const safeEntries: Array<typeof commentatorJournalEntries.$inferInsert> = [];
  const rejections: Array<typeof commentatorResearchRejections.$inferInsert> = [];
  for (const rejected of options.adapterRejections ?? []) {
    rejections.push({ runId, sectorId: rejected.sectorId, sourceUrl: rejected.sourceUrl, sourceHost: rejected.sourceHost, reason: rejected.reason, details: rejected.details.slice(0, 512) });
  }
  let duplicates = 0;
  let stale = 0;
  let untrusted = 0;
  const reject = (entry: ScheduledResearchEntry, reason: ResearchRejectionReason, details: string, host?: string) => {
    if (reason === "duplicate") duplicates += 1;
    if (reason === "stale") stale += 1;
    if (reason === "untrusted_domain") untrusted += 1;
    rejections.push({ runId, sectorId: entry.sectorId, sourceUrl: entry.sourceUrl, sourceHost: host, reason, details: details.slice(0, 512) });
  };
  for (const entry of entries.slice(0, 12)) {
    const commentator = bySector.get(entry.sectorId);
    if (!commentator) {
      reject(entry, "invalid_payload", "Sektör için etkin yorumcu bulunamadı.");
      continue;
    }
    if ((usedBySector.get(entry.sectorId) ?? 0) >= maxPerSector) {
      reject(entry, "sector_quota", `Sektör başına günlük ${maxPerSector} not kotası dolu.`);
      continue;
    }
    const validated = validateResearchCandidate(entry, { now, freshnessHours });
    if (!validated.ok) {
      const rejectedHost = "host" in validated && typeof validated.host === "string" ? validated.host : undefined;
      reject(entry, validated.reason, validated.details, rejectedHost);
      continue;
    }
    const duplicate = await db.select({ id: commentatorJournalEntries.id }).from(commentatorJournalEntries).where(and(
      eq(commentatorJournalEntries.commentatorId, commentator.id),
      eq(commentatorJournalEntries.contentHash, validated.contentHash),
    )).limit(1);
    if (duplicate[0]) {
      reject(entry, "duplicate", "Aynı kaynak içeriği daha önce kaydedildi.", validated.host);
      continue;
    }
    safeEntries.push({
      commentatorId: commentator.id,
      entryType: "research" as const,
      sourceTier: validated.sourceTier,
      sourceUrl: entry.sourceUrl,
      sourceTitle: entry.sourceTitle,
      body: entry.body.trim().slice(0, 8_000),
      contentHash: validated.contentHash,
      publishedAt: validated.publishedAt,
      trustPolicyVersion: RESEARCH_POLICY_VERSION,
    });
    usedBySector.set(entry.sectorId, (usedBySector.get(entry.sectorId) ?? 0) + 1);
  }
  if (safeEntries.length) await db.insert(commentatorJournalEntries).values(safeEntries);
  if (rejections.length) await db.insert(commentatorResearchRejections).values(rejections);
  const rejectedCount = rejections.length;
  const status = rejectedCount ? "completed_with_rejections" as const : "completed" as const;
  await db.update(commentatorResearchRuns).set({
    status,
    acceptedCount: safeEntries.length,
    rejectedCount,
    duplicateCount: duplicates,
    staleCount: stale,
    untrustedCount: untrusted,
    searchCalls: options.searchCalls ?? 0,
    llmCalls: options.llmCalls ?? 0,
    details: JSON.stringify({ adapter, maxPerSector, freshnessHours, policyVersion: RESEARCH_POLICY_VERSION }),
    completedAt: new Date(),
  }).where(eq(commentatorResearchRuns.id, runId));
  return { accepted: safeEntries.length, ignored: rejectedCount, runId, skipped: null };
}

export async function getCommentatorOverview() {
  const db = await ensureCommentatorProgram();
  const commentators = await db.select().from(sectorCommentators).where(eq(sectorCommentators.isActive, 1));
  const cycles = await db.select().from(commentatorForecastCycles).orderBy(desc(commentatorForecastCycles.lockedAt));
  const latestCycleBySector = new Map<string, typeof cycles[number]>();
  for (const cycle of cycles) if (!latestCycleBySector.has(cycle.sectorId)) latestCycleBySector.set(cycle.sectorId, cycle);
  const latestCycleIds = Array.from(latestCycleBySector.values()).map(cycle => cycle.id);
  const [picks, awards, journal, reservoirRows] = await Promise.all([
    latestCycleIds.length ? db.select().from(commentatorForecasts).where(inArray(commentatorForecasts.cycleId, latestCycleIds)) : Promise.resolve([]),
    latestCycleIds.length ? db.select().from(commentatorAwardResults).where(inArray(commentatorAwardResults.cycleId, latestCycleIds)) : Promise.resolve([]),
    db.select().from(commentatorJournalEntries).orderBy(desc(commentatorJournalEntries.createdAt)).limit(18),
    db.select().from(waterReservoirLedger),
  ]);
  const totalReservoirLitres = reservoirRows.reduce((sum, row) => sum + numberValue(row.creditedLitres), 0);
  const rawReservoirLitres = reservoirRows.reduce((sum, row) => sum + numberValue(row.verifiedSurplusLitres), 0);
  return {
    commentators: commentators.map(commentator => {
      const cycle = latestCycleBySector.get(commentator.sectorId) ?? null;
      return {
        ...commentator,
        latestCycle: cycle,
        forecasts: cycle ? picks.filter(pick => pick.cycleId === cycle.id).sort((a, b) => a.forecastRank - b.forecastRank) : [],
        award: cycle ? awards.find(award => award.cycleId === cycle.id) ?? null : null,
        journal: journal.filter(entry => entry.commentatorId === commentator.id).slice(0, 3),
      };
    }),
    reservoir: { creditedLitres: totalReservoirLitres, verifiedSurplusLitres: rawReservoirLitres, transactions: reservoirRows.length },
  };
}

/**
 * Vercel serverless giriş noktası üzerinden de kullanılabilen, yalnızca JSON
 * veri döndüren ödül töreni sözleşmesi. Tarih ve decimal alanları istemcide
 * platform bağımsız görüntüleme için metne/sayıya dönüştürülür.
 */
export async function getCommentatorCeremonyView() {
  const overview = await getCommentatorOverview();
  const ceremonyRows = overview.commentators.map(commentator => ({
    sectorId: commentator.sectorId,
    commentatorName: commentator.displayName,
    starCount: commentator.starCount,
    cycleStatus: commentator.latestCycle?.status ?? "awaiting_forecast",
    lockedAt: commentator.latestCycle?.lockedAt?.toISOString() ?? null,
    award: commentator.award
      ? {
          status: commentator.award.status,
          actualWinnerReportIndex: commentator.award.actualWinnerReportIndex,
          silverMedalAwarded: Boolean(commentator.award.silverMedalAwarded),
          goldStarAwarded: Boolean(commentator.award.goldStarAwarded),
          predictionScore: commentator.award.predictionScore,
        }
      : null,
  }));
  const completed = ceremonyRows.filter(row => row.award?.status === "awarded");
  const upcoming = ceremonyRows.filter(row => row.cycleStatus === "locked").length;
  return {
    schemaVersion: "1.0",
    generatedAt: new Date().toISOString(),
    status: completed.length ? "completed" : upcoming ? "awaiting_outcome" : "awaiting_forecast",
    nextCeremonyLocalTime: "10:45 Europe/Istanbul",
    stats: {
      awardedSectors: completed.length,
      pendingSectors: upcoming,
      goldStars: completed.filter(row => row.award?.goldStarAwarded).length,
      silverMedals: completed.filter(row => row.award?.silverMedalAwarded).length,
    },
    reservoir: {
      creditedLitres: numberValue(overview.reservoir.creditedLitres),
      verifiedSurplusLitres: numberValue(overview.reservoir.verifiedSurplusLitres),
      transactions: overview.reservoir.transactions,
      perAssetCapLitres: 100,
      perSectorDailyCapLitres: 250,
    },
    sectors: ceremonyRows,
  };
}

/** Yorumcu performansını yalnızca saklanan tahmin, ödül, günlük ve baraj kayıtlarından özetler. */
export async function getCommentatorAnalysisView() {
  const db = await ensureCommentatorProgram();
  const [commentators, cycles, awards, journal, reservoirRows] = await Promise.all([
    db.select().from(sectorCommentators).where(eq(sectorCommentators.isActive, 1)),
    db.select().from(commentatorForecastCycles).orderBy(desc(commentatorForecastCycles.lockedAt)),
    db.select().from(commentatorAwardResults).orderBy(desc(commentatorAwardResults.createdAt)),
    db.select().from(commentatorJournalEntries).orderBy(desc(commentatorJournalEntries.createdAt)).limit(120),
    db.select().from(waterReservoirLedger).orderBy(desc(waterReservoirLedger.createdAt)).limit(60),
  ]);
  const cycleById = new Map(cycles.map(cycle => [cycle.id, cycle]));
  const assetByReportIndex = new Map(MARKET_ASSET_MANIFEST.map(asset => [asset.reportIndex, asset]));
  const medalWinners = awards.flatMap(award => {
    if (!award.silverMedalAwarded || award.actualWinnerReportIndex === null) return [];
    const cycle = cycleById.get(award.cycleId);
    const asset = assetByReportIndex.get(award.actualWinnerReportIndex);
    return cycle && asset ? [{
      cycleId: cycle.id,
      sectorId: cycle.sectorId,
      symbol: asset.symbol,
      name: asset.name,
      goldStar: Boolean(award.goldStarAwarded),
      createdAt: award.createdAt.toISOString(),
    }] : [];
  }).slice(0, 12);

  const analystCards = commentators.map(commentator => {
    const ownCycles = cycles.filter(cycle => cycle.commentatorId === commentator.id);
    const ownCycleIds = new Set(ownCycles.map(cycle => cycle.id));
    const ownAwards = awards.filter(award => ownCycleIds.has(award.cycleId));
    const lastCycle = ownCycles[0] ?? null;
    const lastAward = lastCycle ? ownAwards.find(award => award.cycleId === lastCycle.id) ?? null : null;
    const latestResearch = journal.find(entry => entry.commentatorId === commentator.id && entry.entryType === "research") ?? null;
    const latestLesson = journal.find(entry => entry.commentatorId === commentator.id && entry.entryType === "error_lesson") ?? null;
    const evaluated = ownAwards.length;
    const exactHits = ownAwards.filter(award => Boolean(award.goldStarAwarded)).length;
    const silverHits = ownAwards.filter(award => Boolean(award.silverMedalAwarded)).length;
    const state = deriveCommentatorOperationalState({
      hasAward: Boolean(lastAward),
      cycleStatus: lastCycle?.status ?? null,
      hasResearch: Boolean(latestResearch),
    });
    return {
      sectorId: commentator.sectorId,
      displayName: commentator.displayName,
      responsibility: commentator.responsibility,
      state,
      starCount: commentator.starCount,
      evaluatedCycles: evaluated,
      exactHits,
      silverHits,
      exactHitRate: evaluated ? Number(((exactHits / evaluated) * 100).toFixed(1)) : null,
      lastResearchAt: latestResearch?.createdAt.toISOString() ?? null,
      latestLesson: latestLesson?.body ?? null,
      latestLearning: lastCycle?.learningSummary ?? null,
      latestCycleAt: lastCycle?.lockedAt.toISOString() ?? null,
    };
  });
  const reservoirTimeline = Array.from(new Map(reservoirRows.reverse().map(row => {
    const day = row.createdAt.toISOString().slice(0, 10);
    const current = { day, creditedLitres: 0, verifiedSurplusLitres: 0, transactions: 0 };
    return [day, current] as const;
  })).values());
  for (const row of reservoirRows) {
    const day = row.createdAt.toISOString().slice(0, 10);
    const point = reservoirTimeline.find(item => item.day === day);
    if (point) {
      point.creditedLitres += numberValue(row.creditedLitres);
      point.verifiedSurplusLitres += numberValue(row.verifiedSurplusLitres);
      point.transactions += 1;
    }
  }
  const totalCredited = reservoirRows.reduce((sum, row) => sum + numberValue(row.creditedLitres), 0);
  return {
    schemaVersion: "1.0",
    generatedAt: new Date().toISOString(),
    commentators: analystCards,
    medals: medalWinners,
    reservoir: {
      creditedLitres: totalCredited,
      verifiedSurplusLitres: reservoirRows.reduce((sum, row) => sum + numberValue(row.verifiedSurplusLitres), 0),
      transactions: reservoirRows.length,
      timeline: reservoirTimeline,
    },
  };
}
