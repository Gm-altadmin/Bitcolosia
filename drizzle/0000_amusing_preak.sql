CREATE TABLE `citizen_parcels` (
	`id` int AUTO_INCREMENT NOT NULL,
	`reportIndex` int NOT NULL,
	`provinceId` varchar(32) NOT NULL,
	`citizenSymbol` varchar(32) NOT NULL,
	`citizenName` varchar(160) NOT NULL,
	`coinGeckoId` varchar(160),
	`parcelCode` varchar(48) NOT NULL,
	`baselineValueLitres` decimal(14,2) NOT NULL DEFAULT '100.00',
	`currentValueLitres` decimal(14,2) NOT NULL DEFAULT '100.00',
	`lastMarketChangePct` decimal(9,4),
	`lastAppliedChangePct` decimal(9,4),
	`lastValuedAt` timestamp,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `citizen_parcels_id` PRIMARY KEY(`id`),
	CONSTRAINT `citizen_parcels_report_index_unique` UNIQUE(`reportIndex`),
	CONSTRAINT `citizen_parcels_code_unique` UNIQUE(`parcelCode`)
);
--> statement-breakpoint
CREATE TABLE `parcel_valuation_runs` (
	`id` int AUTO_INCREMENT NOT NULL,
	`runKey` varchar(64) NOT NULL,
	`scheduledFor` timestamp NOT NULL,
	`status` enum('running','completed','failed') NOT NULL DEFAULT 'running',
	`recordsValued` int NOT NULL DEFAULT 0,
	`details` text,
	`completedAt` timestamp,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `parcel_valuation_runs_id` PRIMARY KEY(`id`),
	CONSTRAINT `parcel_valuation_runs_key_unique` UNIQUE(`runKey`)
);
--> statement-breakpoint
CREATE TABLE `parcel_valuation_settings` (
	`id` int NOT NULL,
	`timezone` varchar(64) NOT NULL DEFAULT 'Europe/Istanbul',
	`localSchedule` varchar(64) NOT NULL DEFAULT '10:30 Europe/Istanbul',
	`cronUtc` varchar(64) NOT NULL DEFAULT '0 30 7 * * *',
	`scheduleCronTaskUid` varchar(65),
	`nextValuationAt` timestamp,
	`lastValuationAt` timestamp,
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `parcel_valuation_settings_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `users` (
	`id` int AUTO_INCREMENT NOT NULL,
	`openId` varchar(64) NOT NULL,
	`name` text,
	`email` varchar(320),
	`loginMethod` varchar(64),
	`role` enum('user','admin') NOT NULL DEFAULT 'user',
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	`lastSignedIn` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `users_id` PRIMARY KEY(`id`),
	CONSTRAINT `users_openId_unique` UNIQUE(`openId`)
);
--> statement-breakpoint
CREATE INDEX `citizen_parcels_province_idx` ON `citizen_parcels` (`provinceId`);