import { pgTable, uuid, text, integer, timestamp, jsonb, index } from "drizzle-orm/pg-core";
import { companies } from "./companies.js";
import { issues } from "./issues.js";
import { heartbeatRuns } from "./heartbeat_runs.js";
import { agents } from "./agents.js";

export const artifacts = pgTable(
  "artifacts",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    companyId: uuid("company_id").notNull().references(() => companies.id),
    issueId: uuid("issue_id").references(() => issues.id),
    runId: uuid("run_id").references(() => heartbeatRuns.id, { onDelete: "set null" }),
    agentId: uuid("agent_id").references(() => agents.id, { onDelete: "set null" }),
    kind: text("kind").notNull(),
    title: text("title").notNull(),
    mimeType: text("mime_type"),
    filename: text("filename"),
    sizeBytes: integer("size_bytes"),
    storageKind: text("storage_kind").notNull(),
    contentPath: text("content_path"),
    previewUrl: text("preview_url"),
    metadata: jsonb("metadata").$type<Record<string, unknown>>().notNull().default({}),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    companyIdx: index("artifacts_company_idx").on(table.companyId),
    issueIdx: index("artifacts_issue_idx").on(table.issueId),
    runIdx: index("artifacts_run_idx").on(table.runId),
    agentIdx: index("artifacts_agent_idx").on(table.agentId),
  }),
);
