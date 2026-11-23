CREATE TABLE `countries` (
	`code` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`currency_code` text NOT NULL,
	`currency_minor_unit` integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE `departments` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`name` text NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `departments_name_unique` ON `departments` (`name`);--> statement-breakpoint
CREATE TABLE `employees` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`employee_code` text NOT NULL,
	`full_name` text NOT NULL,
	`email` text NOT NULL,
	`job_title_id` integer NOT NULL,
	`department_id` integer NOT NULL,
	`country_code` text NOT NULL,
	`salary_minor` integer NOT NULL,
	`hire_date` text NOT NULL,
	`status` text NOT NULL,
	`left_date` text,
	`created_at` text NOT NULL,
	`created_by` text NOT NULL,
	`updated_at` text NOT NULL,
	`updated_by` text NOT NULL,
	FOREIGN KEY (`job_title_id`) REFERENCES `job_titles`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`department_id`) REFERENCES `departments`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`country_code`) REFERENCES `countries`(`code`) ON UPDATE no action ON DELETE no action,
	CONSTRAINT "employees_salary_positive" CHECK("employees"."salary_minor" > 0)
);
--> statement-breakpoint
CREATE UNIQUE INDEX `employees_employee_code_unique` ON `employees` (`employee_code`);--> statement-breakpoint
CREATE UNIQUE INDEX `employees_email_unique` ON `employees` (`email`);--> statement-breakpoint
CREATE INDEX `employees_country_status_idx` ON `employees` (`country_code`,`status`);--> statement-breakpoint
CREATE INDEX `employees_job_country_status_idx` ON `employees` (`job_title_id`,`country_code`,`status`);--> statement-breakpoint
CREATE INDEX `employees_status_name_idx` ON `employees` (`status`,`full_name`);--> statement-breakpoint
CREATE INDEX `employees_status_salary_idx` ON `employees` (`status`,`salary_minor`);--> statement-breakpoint
CREATE TABLE `job_titles` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`name` text NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `job_titles_name_unique` ON `job_titles` (`name`);--> statement-breakpoint
CREATE TABLE `salary_changes` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`employee_id` integer NOT NULL,
	`old_salary_minor` integer NOT NULL,
	`new_salary_minor` integer NOT NULL,
	`effective_date` text NOT NULL,
	`reason` text NOT NULL,
	`changed_by` text NOT NULL,
	`changed_at` text NOT NULL,
	FOREIGN KEY (`employee_id`) REFERENCES `employees`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `salary_changes_employee_date_idx` ON `salary_changes` (`employee_id`,`effective_date`);