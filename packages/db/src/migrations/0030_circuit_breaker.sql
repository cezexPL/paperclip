-- Rollback:
--   ALTER TABLE "agents" DROP COLUMN IF EXISTS "circuit_breaker_enabled";
--   ALTER TABLE "agents" DROP COLUMN IF EXISTS "circuit_breaker_max_no_progress";
--   ALTER TABLE "agents" DROP COLUMN IF EXISTS "circuit_breaker_max_failures";
--   ALTER TABLE "agents" DROP COLUMN IF EXISTS "circuit_breaker_tripped";
--   ALTER TABLE "agents" DROP COLUMN IF EXISTS "circuit_breaker_tripped_at";
--   ALTER TABLE "agents" DROP COLUMN IF EXISTS "circuit_breaker_trip_reason";
--   ALTER TABLE "agents" DROP COLUMN IF EXISTS "circuit_breaker_consecutive_failures";
--   ALTER TABLE "agents" DROP COLUMN IF EXISTS "circuit_breaker_consecutive_no_progress";

ALTER TABLE "agents" ADD COLUMN "circuit_breaker_enabled" boolean DEFAULT true NOT NULL;--> statement-breakpoint
ALTER TABLE "agents" ADD COLUMN "circuit_breaker_max_no_progress" integer DEFAULT 5 NOT NULL;--> statement-breakpoint
ALTER TABLE "agents" ADD COLUMN "circuit_breaker_max_failures" integer DEFAULT 3 NOT NULL;--> statement-breakpoint
ALTER TABLE "agents" ADD COLUMN "circuit_breaker_tripped" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "agents" ADD COLUMN "circuit_breaker_tripped_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "agents" ADD COLUMN "circuit_breaker_trip_reason" text;--> statement-breakpoint
ALTER TABLE "agents" ADD COLUMN "circuit_breaker_consecutive_failures" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "agents" ADD COLUMN "circuit_breaker_consecutive_no_progress" integer DEFAULT 0 NOT NULL;
