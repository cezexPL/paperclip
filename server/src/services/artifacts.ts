import { and, desc, eq } from "drizzle-orm";
import type { Db } from "@paperclipai/db";
import { artifacts } from "@paperclipai/db";
import { notFound } from "../errors.js";

export interface CreateArtifactInput {
  companyId: string;
  issueId?: string | null;
  runId?: string | null;
  agentId?: string | null;
  kind: string;
  title: string;
  mimeType?: string | null;
  filename?: string | null;
  sizeBytes?: number | null;
  storageKind: string;
  contentPath?: string | null;
  previewUrl?: string | null;
  metadata?: Record<string, unknown>;
}

export function artifactService(db: Db) {
  async function create(input: CreateArtifactInput) {
    const [row] = await db
      .insert(artifacts)
      .values({
        companyId: input.companyId,
        issueId: input.issueId ?? null,
        runId: input.runId ?? null,
        agentId: input.agentId ?? null,
        kind: input.kind,
        title: input.title,
        mimeType: input.mimeType ?? null,
        filename: input.filename ?? null,
        sizeBytes: input.sizeBytes ?? null,
        storageKind: input.storageKind,
        contentPath: input.contentPath ?? null,
        previewUrl: input.previewUrl ?? null,
        metadata: input.metadata ?? {},
      })
      .returning();
    return row!;
  }

  async function listByCompany(companyId: string) {
    return db
      .select()
      .from(artifacts)
      .where(eq(artifacts.companyId, companyId))
      .orderBy(desc(artifacts.createdAt));
  }

  async function listByIssue(issueId: string) {
    return db
      .select()
      .from(artifacts)
      .where(eq(artifacts.issueId, issueId))
      .orderBy(desc(artifacts.createdAt));
  }

  async function listByRun(runId: string) {
    return db
      .select()
      .from(artifacts)
      .where(eq(artifacts.runId, runId))
      .orderBy(desc(artifacts.createdAt));
  }

  async function listByAgent(agentId: string) {
    return db
      .select()
      .from(artifacts)
      .where(eq(artifacts.agentId, agentId))
      .orderBy(desc(artifacts.createdAt));
  }

  async function get(id: string) {
    const row = await db
      .select()
      .from(artifacts)
      .where(eq(artifacts.id, id))
      .then((rows) => rows[0] ?? null);
    return row;
  }

  async function remove(id: string) {
    const rows = await db
      .delete(artifacts)
      .where(eq(artifacts.id, id))
      .returning();
    return rows[0] ?? null;
  }

  return {
    create,
    listByCompany,
    listByIssue,
    listByRun,
    listByAgent,
    get,
    remove,
  };
}
