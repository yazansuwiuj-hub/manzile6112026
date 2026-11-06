CREATE TABLE `appointments` (
	`id` int AUTO_INCREMENT NOT NULL,
	`test_id` varchar(255) NOT NULL,
	`name` varchar(255) NOT NULL,
	`phone` varchar(50) NOT NULL,
	`age` int NOT NULL,
	`test_name` varchar(255) NOT NULL,
	`location` varchar(255) NOT NULL,
	`tester_name` varchar(255),
	`date` varchar(50) NOT NULL,
	`time` varchar(50) NOT NULL,
	`location_url` varchar(1000),
	`status` varchar(50) NOT NULL DEFAULT 'جديد',
	`price` double NOT NULL DEFAULT 0,
	`amount_collected` double,
	`arrival_time` varchar(50),
	`completion_time` varchar(50),
	`notes` text,
	`requires_fasting` boolean DEFAULT false,
	`price_diff_reason` text,
	`attachment_url` varchar(1000),
	`payment_status` varchar(50) DEFAULT 'غير مدفوع',
	`priority` varchar(50) DEFAULT 'عادي',
	`insurance` varchar(255) DEFAULT 'لا يوجد',
	`payment_method` varchar(50) DEFAULT 'نقدي',
	`last_visit` varchar(50) DEFAULT '-',
	`is_external_request` boolean DEFAULT false,
	`is_pending_acceptance` boolean DEFAULT false,
	`timeline` json,
	`audit_trail` json,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `appointments_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `examinations` (
	`id` varchar(255) NOT NULL,
	`name` varchar(255) NOT NULL,
	`price` double NOT NULL DEFAULT 0,
	`notes` text,
	`requires_fasting` boolean DEFAULT false,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `examinations_id` PRIMARY KEY(`id`),
	CONSTRAINT `examinations_name_unique` UNIQUE(`name`)
);
--> statement-breakpoint
CREATE TABLE `ratings` (
	`id` int AUTO_INCREMENT NOT NULL,
	`patient_name` varchar(255) NOT NULL,
	`stars` int NOT NULL,
	`comment` text,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `ratings_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `region_configs` (
	`id` int AUTO_INCREMENT NOT NULL,
	`governorate` varchar(255) NOT NULL,
	`shift` varchar(50) NOT NULL,
	`region_name` varchar(255) NOT NULL,
	`time_from` varchar(50) NOT NULL,
	`time_to` varchar(50) NOT NULL,
	`friday_time_from` varchar(50),
	`friday_time_to` varchar(50),
	`amman_sector` varchar(50),
	`created_at` timestamp NOT NULL DEFAULT (now()),
	`updated_at` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `region_configs_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `system_settings` (
	`key` varchar(255) NOT NULL,
	`value` text,
	`updated_at` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `system_settings_key` PRIMARY KEY(`key`)
);
--> statement-breakpoint
CREATE TABLE `users` (
	`id` varchar(255) NOT NULL,
	`email` varchar(255) NOT NULL,
	`name` varchar(255) NOT NULL,
	`role` varchar(50) NOT NULL DEFAULT 'مستخدم',
	`password` varchar(255),
	`phone` varchar(50),
	`status` varchar(50),
	`governorate` varchar(255),
	`shift` varchar(50),
	`amman_sector` varchar(50),
	`daily_limit` int,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `users_id` PRIMARY KEY(`id`)
);
