import { Router } from "express";
import multer from "multer";
import type { Db } from "@paperclipai/db";
import type { StorageService } from "../storage/types.js";
import { artifactService } from "../services/artifacts.js";
import { logActivity } from "../services/activity-log.js";
import { assertCompanyAccess, getActorInfo } from "./authz.js";
import { badRequest, notFound } from "../errors.js";
import { MAX_ATTACHMENT_BYTES } from "../attachment-types.js";

const ALLOWED_ARTIFACT_TYPES = [
  "text/markdown",
  "text/plain",
  "application/json",
  "text/csv",
  "application/pdf",
  "text/html",
  "application/zip",
  "application/octet-stream",
];

function isAllowedArtifactType(contentType: string): boolean {
  return ALLOWED_ARTIFACT_TYPES.some((t) => contentType.startsWith(t));
}

export function artifactRoutes(db: Db, storage: StorageService) {
  const router = Router();
  const svc = artifactService(db);
  const upload = multer({
    storage: multer.memoryStorage(),
    limits: { fileSize: MAX_ATTACHMENT_BYTES, files: 1 },
  });

  async function runSingleFileUpload(req: import("express").Request, res: import("express").Response) {
    await new Promise<void>((resolve, reject) => {
      upload.single("file")(req, res, (err: unknown) => {
        if (err) reject(err);
        else resolve();
      });
    });
  }

  // GET /api/companies/:companyId/artifacts
  router.get("/companies/:companyId/artifacts", async (req, res) => {
    const { companyId } = req.params;
    assertCompanyAccess(req, companyId);
    const rows = await svc.listByCompany(companyId);
    res.json(rows);
  });

  // GET /api/issues/:issueId/artifacts
  router.get("/issues/:issueId/artifacts", async (req, res) => {
    const rows = await svc.listByIssue(req.params.issueId);
    res.json(rows);
  });

  // POST /api/issues/:issueId/artifacts (multipart upload)
  router.post("/issues/:issueId/artifacts", async (req, res) => {
    try {
      await runSingleFileUpload(req, res);
    } catch (err) {
      if (err instanceof multer.MulterError) {
        if (err.code === "LIMIT_FILE_SIZE") {
          res.status(422).json({ error: `File exceeds ${MAX_ATTACHMENT_BYTES} bytes` });
          return;
        }
        res.status(400).json({ error: err.message });
        return;
      }
      throw err;
    }

    const file = (req as import("express").Request & { file?: { mimetype: string; buffer: Buffer; originalname: string } }).file;
    if (!file) {
      throw badRequest("Missing file field 'file'");
    }

    const contentType = (file.mimetype || "").toLowerCase();
    if (!isAllowedArtifactType(contentType)) {
      res.status(422).json({ error: `Unsupported file type: ${contentType || "unknown"}` });
      return;
    }

    // Get companyId from the body or from the issue (caller must provide)
    const companyId = req.body.companyId as string;
    if (!companyId) {
      throw badRequest("Missing companyId");
    }
    assertCompanyAccess(req, companyId);

    const stored = await storage.putFile({
      companyId,
      namespace: "artifacts",
      originalFilename: file.originalname || null,
      contentType,
      body: file.buffer,
    });

    const artifact = await svc.create({
      companyId,
      issueId: req.params.issueId,
      kind: "attachment",
      title: file.originalname || "Untitled",
      mimeType: contentType,
      filename: file.originalname || null,
      sizeBytes: stored.byteSize,
      storageKind: stored.provider,
      contentPath: stored.objectKey,
      metadata: { sha256: stored.sha256 },
    });

    const actor = getActorInfo(req);
    await logActivity(db, {
      companyId,
      actorType: actor.actorType,
      actorId: actor.actorId,
      action: "artifact.created",
      entityType: "artifact",
      entityId: artifact.id,
      details: {
        issueId: req.params.issueId,
        filename: file.originalname,
        mimeType: contentType,
      },
    });

    res.status(201).json(artifact);
  });

  // GET /api/artifacts/:id
  router.get("/artifacts/:id", async (req, res) => {
    const artifact = await svc.get(req.params.id);
    if (!artifact) throw notFound("Artifact not found");
    res.json(artifact);
  });

  // GET /api/artifacts/:id/download
  router.get("/artifacts/:id/download", async (req, res) => {
    const artifact = await svc.get(req.params.id);
    if (!artifact) throw notFound("Artifact not found");
    if (!artifact.contentPath) throw notFound("No content available for download");

    const obj = await storage.getObject(artifact.companyId, artifact.contentPath);
    res.setHeader("Content-Type", artifact.mimeType || "application/octet-stream");
    if (artifact.filename) {
      res.setHeader("Content-Disposition", `attachment; filename="${artifact.filename}"`);
    }
    obj.stream.pipe(res);
  });

  // DELETE /api/artifacts/:id
  router.delete("/artifacts/:id", async (req, res) => {
    const artifact = await svc.get(req.params.id);
    if (!artifact) throw notFound("Artifact not found");

    assertCompanyAccess(req, artifact.companyId);

    if (artifact.contentPath) {
      try {
        await storage.deleteObject(artifact.companyId, artifact.contentPath);
      } catch {
        // Storage deletion is best-effort
      }
    }

    const deleted = await svc.remove(req.params.id);

    const actor = getActorInfo(req);
    await logActivity(db, {
      companyId: artifact.companyId,
      actorType: actor.actorType,
      actorId: actor.actorId,
      action: "artifact.deleted",
      entityType: "artifact",
      entityId: artifact.id,
      details: { filename: artifact.filename },
    });

    res.json({ ok: true });
  });

  return router;
}
