-- Company invites table for multi-user collaboration
CREATE TABLE IF NOT EXISTS "company_invites" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "company_id" uuid NOT NULL REFERENCES "companies"("id"),
  "token" text UNIQUE NOT NULL,
  "role" text NOT NULL DEFAULT 'operator',
  "created_by_user_id" text,
  "expires_at" timestamp with time zone NOT NULL,
  "accepted_at" timestamp with time zone,
  "accepted_by_user_id" text,
  "created_at" timestamp with time zone NOT NULL DEFAULT now()
);--> statement-breakpoint
CREATE INDEX "company_invites_company_idx" ON "company_invites" ("company_id");--> statement-breakpoint
CREATE INDEX "company_invites_token_idx" ON "company_invites" ("token");
