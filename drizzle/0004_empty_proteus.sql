CREATE TABLE `commentator_start_snapshots` (
	`id` int AUTO_INCREMENT NOT NULL,
	`startKey` varchar(64) NOT NULL,
	`reportIndex` int NOT NULL,
	`usdPrice` decimal(24,12) NOT NULL,
	`snapshotFetchedAt` timestamp NOT NULL,
	`provider` varchar(64) NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `commentator_start_snapshots_id` PRIMARY KEY(`id`),
	CONSTRAINT `commentator_starts_key_asset_unique` UNIQUE(`startKey`,`reportIndex`)
);
