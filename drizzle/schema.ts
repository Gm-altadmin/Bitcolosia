import { decimal, index, int, mysqlEnum, mysqlTable, text, timestamp, uniqueIndex, varchar } from "drizzle-orm/mysql-core";

/** Core user table backing auth flow. */
export const users = mysqlTable("users", {
  id: int("id").autoincrement().primaryKey(),
  openId: varchar("openId", { length: 64 }).notNull().unique(),
  name: text("name"),
  email: varchar("email", { length: 320 }),
  loginMethod: varchar("loginMethod", { length: 64 }),
  role: mysqlEnum("role", ["user", "admin"]).default("user").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  lastSignedIn: timestamp("lastSignedIn").defaultNow().notNull(),
});

/** Every report row is a BitColosİa citizen with one non-transferable, virtual parcel. */
export const citizenParcels = mysqlTable("citizen_parcels", {
  id: int("id").autoincrement().primaryKey(),
  reportIndex: int("reportIndex").notNull(),
  provinceId: varchar("provinceId", { length: 32 }).notNull(),
  citizenSymbol: varchar("citizenSymbol", { length: 32 }).notNull(),
  citizenName: varchar("citizenName", { length: 160 }).notNull(),
  coinGeckoId: varchar("coinGeckoId", { length: 160 }),
  parcelCode: varchar("parcelCode", { length: 48 }).notNull(),
  baselineValueLitres: decimal("baselineValueLitres", { precision: 14, scale: 3 }).notNull().default("1000.000"),
  currentValueLitres: decimal("currentValueLitres", { precision: 14, scale: 3 }).notNull().default("1000.000"),
  referenceUsdPrice: decimal("referenceUsdPrice", { precision: 24, scale: 12 }),
  lastMarketChangePct: decimal("lastMarketChangePct", { precision: 9, scale: 4 }),
  lastAppliedChangePct: decimal("lastAppliedChangePct", { precision: 9, scale: 4 }),
  lastAppliedChangeLitres: decimal("lastAppliedChangeLitres", { precision: 14, scale: 3 }),
  lastValuedAt: timestamp("lastValuedAt"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
}, table => [
  uniqueIndex("citizen_parcels_report_index_unique").on(table.reportIndex),
  uniqueIndex("citizen_parcels_code_unique").on(table.parcelCode),
  index("citizen_parcels_province_idx").on(table.provinceId),
]);

/** One idempotent record per daily 10:30 valuation run. */
export const parcelValuationRuns = mysqlTable("parcel_valuation_runs", {
  id: int("id").autoincrement().primaryKey(),
  runKey: varchar("runKey", { length: 64 }).notNull(),
  scheduledFor: timestamp("scheduledFor").notNull(),
  status: mysqlEnum("status", ["running", "completed", "failed"]).notNull().default("running"),
  recordsValued: int("recordsValued").notNull().default(0),
  details: text("details"),
  completedAt: timestamp("completedAt"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
}, table => [uniqueIndex("parcel_valuation_runs_key_unique").on(table.runKey)]);

/** Project-level Heartbeat reference for daily UTC 07:30 / Europe-Istanbul 10:30 execution. */
export const parcelValuationSettings = mysqlTable("parcel_valuation_settings", {
  id: int("id").primaryKey(),
  timezone: varchar("timezone", { length: 64 }).notNull().default("Europe/Istanbul"),
  timezoneOffsetMinutes: int("timezoneOffsetMinutes").notNull().default(180),
  localSchedule: varchar("localSchedule", { length: 64 }).notNull().default("10:30 Europe/Istanbul"),
  cronUtc: varchar("cronUtc", { length: 64 }).notNull().default("0 30 7 * * *"),
  scheduleCronTaskUid: varchar("scheduleCronTaskUid", { length: 65 }),
  nextValuationAt: timestamp("nextValuationAt"),
  lastValuationAt: timestamp("lastValuationAt"),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

/** Six independent sector commentators; their stars are never compared across sectors. */
export const sectorCommentators = mysqlTable("sector_commentators", {
  id: int("id").autoincrement().primaryKey(),
  sectorId: varchar("sectorId", { length: 32 }).notNull(),
  displayName: varchar("displayName", { length: 96 }).notNull(),
  responsibility: varchar("responsibility", { length: 255 }).notNull(),
  starCount: int("starCount").notNull().default(0),
  completedCycles: int("completedCycles").notNull().default(0),
  exactWinnerCount: int("exactWinnerCount").notNull().default(0),
  researchPolicyVersion: varchar("researchPolicyVersion", { length: 32 }).notNull().default("v1"),
  isActive: int("isActive").notNull().default(1),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
}, table => [uniqueIndex("sector_commentators_sector_unique").on(table.sectorId)]);

/** One locked 11:30 prediction cycle for every sector and target 10:30 outcome. */
export const commentatorForecastCycles = mysqlTable("commentator_forecast_cycles", {
  id: int("id").autoincrement().primaryKey(),
  cycleKey: varchar("cycleKey", { length: 80 }).notNull(),
  sectorId: varchar("sectorId", { length: 32 }).notNull(),
  commentatorId: int("commentatorId").notNull(),
  lockedAt: timestamp("lockedAt").notNull(),
  targetOutcomeAt: timestamp("targetOutcomeAt").notNull(),
  snapshotFetchedAt: timestamp("snapshotFetchedAt").notNull(),
  status: mysqlEnum("status", ["locked", "evaluated", "no_positive_result", "failed"]).notNull().default("locked"),
  modelId: varchar("modelId", { length: 96 }),
  learningSummary: text("learningSummary"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
}, table => [
  uniqueIndex("commentator_cycles_key_unique").on(table.cycleKey),
  index("commentator_cycles_target_idx").on(table.targetOutcomeAt),
  index("commentator_cycles_commentator_idx").on(table.commentatorId),
]);

/** The immutable rank 1–4 forecast that was visible at 11:30. */
export const commentatorForecasts = mysqlTable("commentator_forecasts", {
  id: int("id").autoincrement().primaryKey(),
  cycleId: int("cycleId").notNull(),
  reportIndex: int("reportIndex").notNull(),
  forecastRank: int("forecastRank").notNull(),
  lockedUsdPrice: decimal("lockedUsdPrice", { precision: 24, scale: 12 }).notNull(),
  confidence: decimal("confidence", { precision: 5, scale: 4 }).notNull().default("0.5000"),
  rationale: text("rationale").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
}, table => [
  uniqueIndex("commentator_forecasts_cycle_rank_unique").on(table.cycleId, table.forecastRank),
  uniqueIndex("commentator_forecasts_cycle_asset_unique").on(table.cycleId, table.reportIndex),
]);

/** Evidence and self-audits are append-only: research never rewrites a locked forecast. */
export const commentatorJournalEntries = mysqlTable("commentator_journal_entries", {
  id: int("id").autoincrement().primaryKey(),
  commentatorId: int("commentatorId").notNull(),
  cycleId: int("cycleId"),
  entryType: mysqlEnum("entryType", ["research", "self_audit", "error_lesson", "forecast_learning"]).notNull(),
  sourceTier: mysqlEnum("sourceTier", ["official", "verified_news", "social_signal", "internal"]).notNull().default("internal"),
  sourceUrl: varchar("sourceUrl", { length: 1024 }),
  sourceTitle: varchar("sourceTitle", { length: 512 }),
  body: text("body").notNull(),
  contentHash: varchar("contentHash", { length: 64 }),
  publishedAt: timestamp("publishedAt"),
  trustPolicyVersion: varchar("trustPolicyVersion", { length: 32 }).notNull().default("v2"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
}, table => [
  index("commentator_journal_commentator_idx").on(table.commentatorId, table.createdAt),
  index("commentator_journal_cycle_idx").on(table.cycleId),
  uniqueIndex("commentator_journal_commentator_hash_unique").on(table.commentatorId, table.contentHash),
]);

/** One immutable audit record per daily research intake; accepts/rejects are always measurable. */
export const commentatorResearchRuns = mysqlTable("commentator_research_runs", {
  id: int("id").autoincrement().primaryKey(),
  runKey: varchar("runKey", { length: 96 }).notNull(),
  triggerTaskUid: varchar("triggerTaskUid", { length: 65 }),
  adapter: varchar("adapter", { length: 48 }).notNull(),
  policyVersion: varchar("policyVersion", { length: 32 }).notNull().default("v2"),
  status: mysqlEnum("status", ["running", "completed", "completed_with_rejections", "failed"]).notNull().default("running"),
  candidateCount: int("candidateCount").notNull().default(0),
  acceptedCount: int("acceptedCount").notNull().default(0),
  rejectedCount: int("rejectedCount").notNull().default(0),
  duplicateCount: int("duplicateCount").notNull().default(0),
  staleCount: int("staleCount").notNull().default(0),
  untrustedCount: int("untrustedCount").notNull().default(0),
  searchCalls: int("searchCalls").notNull().default(0),
  llmCalls: int("llmCalls").notNull().default(0),
  details: text("details"),
  completedAt: timestamp("completedAt"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
}, table => [uniqueIndex("commentator_research_runs_key_unique").on(table.runKey)]);

/** Every rejected candidate is retained with a compact, auditable reason but never shown as research. */
export const commentatorResearchRejections = mysqlTable("commentator_research_rejections", {
  id: int("id").autoincrement().primaryKey(),
  runId: int("runId").notNull(),
  sectorId: varchar("sectorId", { length: 32 }).notNull(),
  sourceUrl: varchar("sourceUrl", { length: 1024 }),
  sourceHost: varchar("sourceHost", { length: 255 }),
  reason: mysqlEnum("reason", ["invalid_url", "unsupported_protocol", "private_host", "untrusted_domain", "stale", "duplicate", "sector_quota", "invalid_payload", "fetch_failed"]).notNull(),
  details: varchar("details", { length: 512 }),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
}, table => [
  index("commentator_research_rejections_run_idx").on(table.runId),
  index("commentator_research_rejections_sector_idx").on(table.sectorId, table.createdAt),
]);

/** Fresh 10:30 outcome price used exclusively for forecast scoring. */
export const commentatorOutcomeSnapshots = mysqlTable("commentator_outcome_snapshots", {
  id: int("id").autoincrement().primaryKey(),
  outcomeKey: varchar("outcomeKey", { length: 64 }).notNull(),
  reportIndex: int("reportIndex").notNull(),
  usdPrice: decimal("usdPrice", { precision: 24, scale: 12 }).notNull(),
  snapshotFetchedAt: timestamp("snapshotFetchedAt").notNull(),
  provider: varchar("provider", { length: 64 }).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
}, table => [uniqueIndex("commentator_outcomes_key_asset_unique").on(table.outcomeKey, table.reportIndex)]);

/** Full 11:30 market cut used to identify each sector's real winner fairly. */
export const commentatorStartSnapshots = mysqlTable("commentator_start_snapshots", {
  id: int("id").autoincrement().primaryKey(),
  startKey: varchar("startKey", { length: 64 }).notNull(),
  reportIndex: int("reportIndex").notNull(),
  usdPrice: decimal("usdPrice", { precision: 24, scale: 12 }).notNull(),
  snapshotFetchedAt: timestamp("snapshotFetchedAt").notNull(),
  provider: varchar("provider", { length: 64 }).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
}, table => [uniqueIndex("commentator_starts_key_asset_unique").on(table.startKey, table.reportIndex)]);

/** 10:45 sector-local award result. No positive winner means no medal and no star. */
export const commentatorAwardResults = mysqlTable("commentator_award_results", {
  id: int("id").autoincrement().primaryKey(),
  cycleId: int("cycleId").notNull(),
  actualWinnerReportIndex: int("actualWinnerReportIndex"),
  actualWinnerDeltaLitres: decimal("actualWinnerDeltaLitres", { precision: 24, scale: 3 }),
  silverMedalAwarded: int("silverMedalAwarded").notNull().default(0),
  goldStarAwarded: int("goldStarAwarded").notNull().default(0),
  predictionScore: int("predictionScore").notNull().default(0),
  status: mysqlEnum("status", ["awarded", "no_positive_result", "waiting_fresh_outcome"]).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
}, table => [uniqueIndex("commentator_awards_cycle_unique").on(table.cycleId)]);

/** Immutable reservoir credits: raw gain is auditable; credited water is capped for balance. */
export const waterReservoirLedger = mysqlTable("water_reservoir_ledger", {
  id: int("id").autoincrement().primaryKey(),
  cycleId: int("cycleId").notNull(),
  sectorId: varchar("sectorId", { length: 32 }).notNull(),
  reportIndex: int("reportIndex").notNull(),
  rawGainLitres: decimal("rawGainLitres", { precision: 24, scale: 3 }).notNull(),
  verifiedSurplusLitres: decimal("verifiedSurplusLitres", { precision: 24, scale: 3 }).notNull(),
  creditedLitres: decimal("creditedLitres", { precision: 14, scale: 3 }).notNull(),
  assetCapLitres: decimal("assetCapLitres", { precision: 14, scale: 3 }).notNull().default("100.000"),
  sectorCapLitres: decimal("sectorCapLitres", { precision: 14, scale: 3 }).notNull().default("250.000"),
  formulaVersion: varchar("formulaVersion", { length: 32 }).notNull().default("v1"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
}, table => [
  uniqueIndex("water_reservoir_cycle_asset_unique").on(table.cycleId, table.reportIndex),
  index("water_reservoir_sector_idx").on(table.sectorId, table.createdAt),
]);

/** Project-owned scheduled job identifiers for the 10:45 award and 11:30 forecast jobs. */
export const commentatorProgramSettings = mysqlTable("commentator_program_settings", {
  id: int("id").primaryKey(),
  awardScheduleCronTaskUid: varchar("awardScheduleCronTaskUid", { length: 65 }),
  forecastScheduleCronTaskUid: varchar("forecastScheduleCronTaskUid", { length: 65 }),
  researchScheduleCronTaskUid: varchar("researchScheduleCronTaskUid", { length: 65 }),
  researchAdapter: varchar("researchAdapter", { length: 48 }).notNull().default("manus_agent"),
  researchPolicyVersion: varchar("researchPolicyVersion", { length: 32 }).notNull().default("v2"),
  researchFreshnessHours: int("researchFreshnessHours").notNull().default(48),
  researchMaxPerSector: int("researchMaxPerSector").notNull().default(2),
  researchDailySearchBudget: int("researchDailySearchBudget").notNull().default(6),
  researchDailyLlmBudget: int("researchDailyLlmBudget").notNull().default(6),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type User = typeof users.$inferSelect;
export type InsertUser = typeof users.$inferInsert;
export type CitizenParcel = typeof citizenParcels.$inferSelect;
export type ParcelValuationRun = typeof parcelValuationRuns.$inferSelect;
export type SectorCommentator = typeof sectorCommentators.$inferSelect;
export type CommentatorForecastCycle = typeof commentatorForecastCycles.$inferSelect;
export type CommentatorForecast = typeof commentatorForecasts.$inferSelect;
export type CommentatorAwardResult = typeof commentatorAwardResults.$inferSelect;
