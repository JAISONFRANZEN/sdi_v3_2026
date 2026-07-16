CREATE TABLE `answers` (
	`id` int AUTO_INCREMENT NOT NULL,
	`inspection_id` int NOT NULL,
	`item_id` int NOT NULL,
	`status` enum('Sim','Não','Parcialmente','N/A') NOT NULL,
	`observations` text,
	CONSTRAINT `answers_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `checklists` (
	`id` int AUTO_INCREMENT NOT NULL,
	`name` varchar(255) NOT NULL,
	`profile_type` enum('residencial','mpsc') NOT NULL,
	`description` text,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `checklists_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `inspections` (
	`id` int AUTO_INCREMENT NOT NULL,
	`client_uuid` varchar(36) NOT NULL,
	`checklist_id` int NOT NULL,
	`user_id` int NOT NULL,
	`inspector_name` varchar(255) NOT NULL,
	`inspection_date` timestamp NOT NULL DEFAULT (now()),
	`location` varchar(255),
	`unit_type` enum('Procuradoria','Promotoria','Sede Administrativa','Anexo','Residência','Outro'),
	`notes` text,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `inspections_id` PRIMARY KEY(`id`),
	CONSTRAINT `inspections_client_uuid_idx` UNIQUE(`client_uuid`)
);
--> statement-breakpoint
CREATE TABLE `items` (
	`id` int AUTO_INCREMENT NOT NULL,
	`section_id` int NOT NULL,
	`item_order` int NOT NULL,
	`item_text` text NOT NULL,
	`is_subheading` boolean DEFAULT false,
	CONSTRAINT `items_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `recommendations` (
	`id` int AUTO_INCREMENT NOT NULL,
	`inspection_id` int NOT NULL,
	`recommendation_text` text NOT NULL,
	`priority` enum('alta','media','baixa') NOT NULL,
	CONSTRAINT `recommendations_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `sections` (
	`id` int AUTO_INCREMENT NOT NULL,
	`checklist_id` int NOT NULL,
	`section_order` int NOT NULL,
	`section_name` varchar(255) NOT NULL,
	`description` text,
	CONSTRAINT `sections_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `users` (
	`id` int AUTO_INCREMENT NOT NULL,
	`email` varchar(255) NOT NULL,
	`password_hash` varchar(255) NOT NULL,
	`name` varchar(255) NOT NULL,
	`role` enum('admin','inspetor_mpsc','usuario_residencial') NOT NULL DEFAULT 'usuario_residencial',
	`created_at` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `users_id` PRIMARY KEY(`id`),
	CONSTRAINT `users_email_idx` UNIQUE(`email`)
);
--> statement-breakpoint
ALTER TABLE `answers` ADD CONSTRAINT `answers_inspection_id_inspections_id_fk` FOREIGN KEY (`inspection_id`) REFERENCES `inspections`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `answers` ADD CONSTRAINT `answers_item_id_items_id_fk` FOREIGN KEY (`item_id`) REFERENCES `items`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `inspections` ADD CONSTRAINT `inspections_checklist_id_checklists_id_fk` FOREIGN KEY (`checklist_id`) REFERENCES `checklists`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `inspections` ADD CONSTRAINT `inspections_user_id_users_id_fk` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `items` ADD CONSTRAINT `items_section_id_sections_id_fk` FOREIGN KEY (`section_id`) REFERENCES `sections`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `recommendations` ADD CONSTRAINT `recommendations_inspection_id_inspections_id_fk` FOREIGN KEY (`inspection_id`) REFERENCES `inspections`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `sections` ADD CONSTRAINT `sections_checklist_id_checklists_id_fk` FOREIGN KEY (`checklist_id`) REFERENCES `checklists`(`id`) ON DELETE no action ON UPDATE no action;