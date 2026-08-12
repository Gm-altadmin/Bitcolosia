ALTER TABLE `citizen_parcels` MODIFY COLUMN `baselineValueLitres` decimal(14,3) NOT NULL DEFAULT '1000.000';--> statement-breakpoint
ALTER TABLE `citizen_parcels` MODIFY COLUMN `baselineValueLitres` decimal(14,3) NOT NULL DEFAULT '1000.000';--> statement-breakpoint
ALTER TABLE `citizen_parcels` MODIFY COLUMN `currentValueLitres` decimal(14,3) NOT NULL DEFAULT '1000.000';--> statement-breakpoint
ALTER TABLE `citizen_parcels` ADD `referenceUsdPrice` decimal(24,12);--> statement-breakpoint
ALTER TABLE `citizen_parcels` ADD `lastAppliedChangeLitres` decimal(14,3);
