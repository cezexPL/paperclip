-- Artifacts table for file attachments, workspace files, previews, and report links
CREATE TABLE IF NOT EXISTS "artifacts" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "company_id" uuid NOT NULL REFERENCES "companies"("id"),
  "issue_id" uuid REFERENCES "issues"("id"),
  "run_id" uuid REFERENCES "heartbeat_runs"("id") ON DELETE SET NULL,
  "agent_id" uuid REFERENCES "agents"("id") ON DELETE SET NULL,
  "kind" text NOT NULL,
  "title" text NOT NULL,
  "mime_type" text,
  "filename" text,
  "size_bytes" integer,
  "storage_kind" text NOT NULL,
  "content_path" text,
  "preview_url" text,
  "metadata" jsonb NOT NULL DEFAULT '{}',
  "created_at" timestamp with time zone NOT NULL DEFAULT now()
);--> statement-breakpoint
CREATE INDEX "artifacts_company_idx" ON "artifacts" ("company_id");--> statement-breakpoint
CREATE INDEX "artifacts_issue_idx" ON "artifacts" ("issue_id");--> statement-breakpoint
CREATE INDEX "artifacts_run_idx" ON "artifacts" ("run_id");--> statement-breakpoint
CREATE INDEX "artifacts_agent_idx" ON "artifacts" ("agent_id");
