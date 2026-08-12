CREATE TABLE `commentator_research_rejections` (
	`id` int AUTO_INCREMENT NOT NULL,
	`runId` int NOT NULL,
	`sectorId` varchar(32) NOT NULL,
	`sourceUrl` varchar(1024),
	`sourceHost` varchar(255),
	`reason` enum('invalid_url','unsupported_protocol','private_host','untrusted_domain','stale','duplicate','sector_quota','invalid_payload','fetch_failed') NOT NULL,
	`details` varchar(512),
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `commentator_research_rejections_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `commentator_research_runs` (
	`id` int AUTO_INCREMENT NOT NULL,
	`runKey` varchar(96) NOT NULL,
	`triggerTaskUid` varchar(65),
	`adapter` varchar(48) NOT NULL,
	`policyVersion` varchar(32) NOT NULL DEFAULT 'v2',
	`status` enum('running','completed','completed_with_rejections','failed') NOT NULL DEFAULT 'running',
	`candidateCount` int NOT NULL DEFAULT 0,
	`acceptedCount` int NOT NULL DEFAULT 0,
	`rejectedCount` int NOT NULL DEFAULT 0,
	`duplicateCount` int NOT NULL DEFAULT 0,
	`staleCount` int NOT NULL DEFAULT 0,
	`untrustedCount` int NOT NULL DEFAULT 0,
	`searchCalls` int NOT NULL DEFAULT 0,
	`llmCalls` int NOT NULL DEFAULT 0,
	`details` text,
	`completedAt` timestamp,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `commentator_research_runs_id` PRIMARY KEY(`id`),
	CONSTRAINT `commentator_research_runs_key_unique` UNIQUE(`runKey`)
);
--> statement-breakpoint
ALTER TABLE `commentator_journal_entries` ADD `publishedAt` timestamp;--> statement-breakpoint
ALTER TABLE `commentator_journal_entries` ADD `trustPolicyVersion` varchar(32) DEFAULT 'v2' NOT NULL;--> statement-breakpoint
ALTER TABLE `commentator_program_settings` ADD `researchAdapter` varchar(48) DEFAULT 'manus_agent' NOT NULL;--> statement-breakpoint
ALTER TABLE `commentator_program_settings` ADD `researchPolicyVersion` varchar(32) DEFAULT 'v2' NOT NULL;--> statement-breakpoint
ALTER TABLE `commentator_program_settings` ADD `researchFreshnessHours` int DEFAULT 48 NOT NULL;--> statement-breakpoint
ALTER TABLE `commentator_program_settings` ADD `researchMaxPerSector` int DEFAULT 2 NOT NULL;--> statement-breakpoint
ALTER TABLE `commentator_program_settings` ADD `researchDailySearchBudget` int DEFAULT 6 NOT NULL;--> statement-breakpoint
ALTER TABLE `commentator_program_settings` ADD `researchDailyLlmBudget` int DEFAULT 6 NOT NULL;--> statement-breakpoint
ALTER TABLE `commentator_journal_entries` ADD CONSTRAINT `commentator_journal_commentator_hash_unique` UNIQUE(`commentatorId`,`contentHash`);--> statement-breakpoint
CREATE INDEX `commentator_research_rejections_run_idx` ON `commentator_research_rejections` (`runId`);--> statement-breakpoint
CREATE INDEX `commentator_research_rejections_sector_idx` ON `commentator_research_rejections` (`sectorId`,`createdAt`);