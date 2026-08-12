CREATE TABLE `commentator_award_results` (
	`id` int AUTO_INCREMENT NOT NULL,
	`cycleId` int NOT NULL,
	`actualWinnerReportIndex` int,
	`actualWinnerDeltaLitres` decimal(24,3),
	`silverMedalAwarded` int NOT NULL DEFAULT 0,
	`goldStarAwarded` int NOT NULL DEFAULT 0,
	`predictionScore` int NOT NULL DEFAULT 0,
	`status` enum('awarded','no_positive_result','waiting_fresh_outcome') NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `commentator_award_results_id` PRIMARY KEY(`id`),
	CONSTRAINT `commentator_awards_cycle_unique` UNIQUE(`cycleId`)
);
--> statement-breakpoint
CREATE TABLE `commentator_forecast_cycles` (
	`id` int AUTO_INCREMENT NOT NULL,
	`cycleKey` varchar(80) NOT NULL,
	`sectorId` varchar(32) NOT NULL,
	`commentatorId` int NOT NULL,
	`lockedAt` timestamp NOT NULL,
	`targetOutcomeAt` timestamp NOT NULL,
	`snapshotFetchedAt` timestamp NOT NULL,
	`status` enum('locked','evaluated','no_positive_result','failed') NOT NULL DEFAULT 'locked',
	`modelId` varchar(96),
	`learningSummary` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `commentator_forecast_cycles_id` PRIMARY KEY(`id`),
	CONSTRAINT `commentator_cycles_key_unique` UNIQUE(`cycleKey`)
);
--> statement-breakpoint
CREATE TABLE `commentator_forecasts` (
	`id` int AUTO_INCREMENT NOT NULL,
	`cycleId` int NOT NULL,
	`reportIndex` int NOT NULL,
	`forecastRank` int NOT NULL,
	`lockedUsdPrice` decimal(24,12) NOT NULL,
	`confidence` decimal(5,4) NOT NULL DEFAULT '0.5000',
	`rationale` text NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `commentator_forecasts_id` PRIMARY KEY(`id`),
	CONSTRAINT `commentator_forecasts_cycle_rank_unique` UNIQUE(`cycleId`,`forecastRank`),
	CONSTRAINT `commentator_forecasts_cycle_asset_unique` UNIQUE(`cycleId`,`reportIndex`)
);
--> statement-breakpoint
CREATE TABLE `commentator_journal_entries` (
	`id` int AUTO_INCREMENT NOT NULL,
	`commentatorId` int NOT NULL,
	`cycleId` int,
	`entryType` enum('research','self_audit','error_lesson','forecast_learning') NOT NULL,
	`sourceTier` enum('official','verified_news','social_signal','internal') NOT NULL DEFAULT 'internal',
	`sourceUrl` varchar(1024),
	`sourceTitle` varchar(512),
	`body` text NOT NULL,
	`contentHash` varchar(64),
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `commentator_journal_entries_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `commentator_outcome_snapshots` (
	`id` int AUTO_INCREMENT NOT NULL,
	`outcomeKey` varchar(64) NOT NULL,
	`reportIndex` int NOT NULL,
	`usdPrice` decimal(24,12) NOT NULL,
	`snapshotFetchedAt` timestamp NOT NULL,
	`provider` varchar(64) NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `commentator_outcome_snapshots_id` PRIMARY KEY(`id`),
	CONSTRAINT `commentator_outcomes_key_asset_unique` UNIQUE(`outcomeKey`,`reportIndex`)
);
--> statement-breakpoint
CREATE TABLE `commentator_program_settings` (
	`id` int NOT NULL,
	`awardScheduleCronTaskUid` varchar(65),
	`forecastScheduleCronTaskUid` varchar(65),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `commentator_program_settings_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `sector_commentators` (
	`id` int AUTO_INCREMENT NOT NULL,
	`sectorId` varchar(32) NOT NULL,
	`displayName` varchar(96) NOT NULL,
	`responsibility` varchar(255) NOT NULL,
	`starCount` int NOT NULL DEFAULT 0,
	`completedCycles` int NOT NULL DEFAULT 0,
	`exactWinnerCount` int NOT NULL DEFAULT 0,
	`researchPolicyVersion` varchar(32) NOT NULL DEFAULT 'v1',
	`isActive` int NOT NULL DEFAULT 1,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `sector_commentators_id` PRIMARY KEY(`id`),
	CONSTRAINT `sector_commentators_sector_unique` UNIQUE(`sectorId`)
);
--> statement-breakpoint
CREATE TABLE `water_reservoir_ledger` (
	`id` int AUTO_INCREMENT NOT NULL,
	`cycleId` int NOT NULL,
	`sectorId` varchar(32) NOT NULL,
	`reportIndex` int NOT NULL,
	`rawGainLitres` decimal(24,3) NOT NULL,
	`verifiedSurplusLitres` decimal(24,3) NOT NULL,
	`creditedLitres` decimal(14,3) NOT NULL,
	`assetCapLitres` decimal(14,3) NOT NULL DEFAULT '100.000',
	`sectorCapLitres` decimal(14,3) NOT NULL DEFAULT '250.000',
	`formulaVersion` varchar(32) NOT NULL DEFAULT 'v1',
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `water_reservoir_ledger_id` PRIMARY KEY(`id`),
	CONSTRAINT `water_reservoir_cycle_asset_unique` UNIQUE(`cycleId`,`reportIndex`)
);
--> statement-breakpoint
CREATE INDEX `commentator_cycles_target_idx` ON `commentator_forecast_cycles` (`targetOutcomeAt`);--> statement-breakpoint
CREATE INDEX `commentator_cycles_commentator_idx` ON `commentator_forecast_cycles` (`commentatorId`);--> statement-breakpoint
CREATE INDEX `commentator_journal_commentator_idx` ON `commentator_journal_entries` (`commentatorId`,`createdAt`);--> statement-breakpoint
CREATE INDEX `commentator_journal_cycle_idx` ON `commentator_journal_entries` (`cycleId`);--> statement-breakpoint
CREATE INDEX `water_reservoir_sector_idx` ON `water_reservoir_ledger` (`sectorId`,`createdAt`);