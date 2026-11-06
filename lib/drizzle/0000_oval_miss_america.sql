CREATE TABLE "appointments" (
	"id" serial PRIMARY KEY NOT NULL,
	"test_id" text NOT NULL,
	"name" text NOT NULL,
	"phone" text NOT NULL,
	"age" integer NOT NULL,
	"test_name" text NOT NULL,
	"location" text NOT NULL,
	"tester_name" text,
	"date" text NOT NULL,
	"time" text NOT NULL,
	"location_url" text,
	"status" text DEFAULT 'جديد' NOT NULL,
	"price" double precision DEFAULT 0 NOT NULL,
	"amount_collected" double precision,
	"arrival_time" text,
	"completion_time" text,
	"notes" text,
	"requires_fasting" boolean DEFAULT false,
	"price_diff_reason" text,
	"attachment_url" text,
	"payment_status" text DEFAULT 'غير مدفوع',
	"priority" text DEFAULT 'عادي',
	"insurance" text DEFAULT 'لا يوجد',
	"payment_method" text DEFAULT 'نقدي',
	"last_visit" text DEFAULT '-',
	"is_external_request" boolean DEFAULT false,
	"is_pending_acceptance" boolean DEFAULT false,
	"timeline" jsonb,
	"audit_trail" jsonb,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "examinations" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"price" double precision DEFAULT 0 NOT NULL,
	"notes" text,
	"requires_fasting" boolean DEFAULT false,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "examinations_name_unique" UNIQUE("name")
);
--> statement-breakpoint
CREATE TABLE "ratings" (
	"id" serial PRIMARY KEY NOT NULL,
	"patient_name" text NOT NULL,
	"stars" integer NOT NULL,
	"comment" text,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "region_configs" (
	"id" serial PRIMARY KEY NOT NULL,
	"governorate" text NOT NULL,
	"shift" text NOT NULL,
	"region_name" text NOT NULL,
	"time_from" text NOT NULL,
	"time_to" text NOT NULL,
	"friday_time_from" text,
	"friday_time_to" text,
	"amman_sector" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "system_settings" (
	"key" text PRIMARY KEY NOT NULL,
	"value" text,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" text PRIMARY KEY NOT NULL,
	"email" text NOT NULL,
	"name" text NOT NULL,
	"role" text DEFAULT 'مستخدم' NOT NULL,
	"password" text,
	"phone" text,
	"status" text,
	"governorate" text,
	"shift" text,
	"amman_sector" text,
	"daily_limit" integer,
	"created_at" timestamp DEFAULT now() NOT NULL
);
