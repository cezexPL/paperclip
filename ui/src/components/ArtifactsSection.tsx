import { useRef, useState, type ChangeEvent, type DragEvent } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { artifactsApi, type Artifact } from "../api/artifacts";
import { queryKeys } from "../lib/queryKeys";
import { Button } from "@/components/ui/button";
import { cn } from "../lib/utils";
import {
  FileText,
  FileJson,
  FileSpreadsheet,
  File as FileIcon,
  FileCode,
  Link2,
  Upload,
  Download,
  Trash2,
  Eye,
  X,
  Loader2,
} from "lucide-react";

function artifactIcon(artifact: Artifact) {
  const mime = artifact.mimeType || "";
  if (mime.includes("markdown") || mime.includes("text/plain")) return <FileText className="h-4 w-4" />;
  if (mime.includes("json")) return <FileJson className="h-4 w-4" />;
  if (mime.includes("csv")) return <FileSpreadsheet className="h-4 w-4" />;
  if (mime.includes("html")) return <FileCode className="h-4 w-4" />;
  if (artifact.kind === "report_link" || artifact.kind === "preview") return <Link2 className="h-4 w-4" />;
  return <FileIcon className="h-4 w-4" />;
}

function formatBytes(bytes: number | null): string {
  if (bytes === null || bytes === undefined) return "";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

interface ArtifactsSectionProps {
  issueId: string;
  companyId: string;
}

export function ArtifactsSection({ issueId, companyId }: ArtifactsSectionProps) {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [dragging, setDragging] = useState(false);
  const [previewArtifact, setPreviewArtifact] = useState<Artifact | null>(null);
  const [previewContent, setPreviewContent] = useState<string | null>(null);

  const { data: artifacts = [], isLoading } = useQuery({
    queryKey: queryKeys.artifacts.byIssue(issueId),
    queryFn: () => artifactsApi.listByIssue(issueId),
  });

  const uploadMut = useMutation({
    mutationFn: (file: File) => artifactsApi.upload(issueId, companyId, file),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.artifacts.byIssue(issueId) });
    },
  });

  const deleteMut = useMutation({
    mutationFn: (id: string) => artifactsApi.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.artifacts.byIssue(issueId) });
    },
  });

  const handleFileSelect = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) uploadMut.mutate(file);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const handleDrop = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (file) uploadMut.mutate(file);
  };

  const handleDragOver = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setDragging(true);
  };

  const handleDragLeave = () => setDragging(false);

  const handlePreview = async (artifact: Artifact) => {
    const mime = artifact.mimeType || "";
    if (mime.includes("text") || mime.includes("markdown") || mime.includes("json") || mime.includes("csv")) {
      try {
        const res = await fetch(artifactsApi.downloadUrl(artifact.id), { credentials: "include" });
        const text = await res.text();
        setPreviewContent(text);
        setPreviewArtifact(artifact);
      } catch {
        setPreviewContent(null);
      }
    }
  };

  const isPreviewable = (artifact: Artifact) => {
    const mime = artifact.mimeType || "";
    return mime.includes("text") || mime.includes("markdown") || mime.includes("json") || mime.includes("csv");
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-medium">{t("artifacts.title")}</h3>
        <Button
          variant="ghost"
          size="sm"
          className="h-7 text-xs"
          onClick={() => fileInputRef.current?.click()}
          disabled={uploadMut.isPending}
        >
          {uploadMut.isPending ? (
            <Loader2 className="mr-1 h-3 w-3 animate-spin" />
          ) : (
            <Upload className="mr-1 h-3 w-3" />
          )}
          {t("artifacts.upload")}
        </Button>
        <input
          ref={fileInputRef}
          type="file"
          className="hidden"
          onChange={handleFileSelect}
          accept=".md,.json,.csv,.pdf,.html,.txt,.zip"
        />
      </div>

      {/* Drop zone */}
      <div
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        className={cn(
          "rounded-md border-2 border-dashed p-4 text-center text-xs text-muted-foreground transition-colors",
          dragging ? "border-primary bg-primary/5" : "border-border",
          artifacts.length > 0 && "hidden",
        )}
      >
        {t("artifacts.dragDrop")}
      </div>

      {uploadMut.isError && (
        <div className="text-xs text-destructive">{t("artifacts.failedUpload")}</div>
      )}

      {/* List */}
      {artifacts.length > 0 && (
        <div className="space-y-1">
          {artifacts.map((artifact) => (
            <div
              key={artifact.id}
              className="flex items-center gap-3 rounded-md border border-border bg-card px-3 py-2 text-sm"
            >
              <div className="shrink-0 text-muted-foreground">{artifactIcon(artifact)}</div>
              <div className="min-w-0 flex-1">
                <div className="truncate font-medium">{artifact.title}</div>
                <div className="text-xs text-muted-foreground">
                  {artifact.filename && <span>{artifact.filename}</span>}
                  {artifact.sizeBytes != null && <span className="ml-2">{formatBytes(artifact.sizeBytes)}</span>}
                </div>
              </div>
              <div className="flex shrink-0 items-center gap-1">
                {isPreviewable(artifact) && (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-7 w-7 p-0"
                    onClick={() => handlePreview(artifact)}
                    title={t("artifacts.preview")}
                  >
                    <Eye className="h-3.5 w-3.5" />
                  </Button>
                )}
                {artifact.contentPath && (
                  <a
                    href={artifactsApi.downloadUrl(artifact.id)}
                    download={artifact.filename || undefined}
                    className="inline-flex h-7 w-7 items-center justify-center rounded-md text-muted-foreground hover:bg-muted hover:text-foreground"
                    title={t("artifacts.download")}
                  >
                    <Download className="h-3.5 w-3.5" />
                  </a>
                )}
                {artifact.previewUrl && (
                  <a
                    href={artifact.previewUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex h-7 w-7 items-center justify-center rounded-md text-muted-foreground hover:bg-muted hover:text-foreground"
                    title={t("artifacts.open")}
                  >
                    <Link2 className="h-3.5 w-3.5" />
                  </a>
                )}
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-7 w-7 p-0 text-muted-foreground hover:text-destructive"
                  onClick={() => {
                    if (confirm(t("artifacts.deleteConfirm"))) {
                      deleteMut.mutate(artifact.id);
                    }
                  }}
                  title={t("artifacts.delete")}
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}

      {artifacts.length === 0 && !isLoading && !dragging && (
        <div className="text-xs text-muted-foreground">{t("artifacts.noArtifacts")}</div>
      )}

      {/* Inline preview modal */}
      {previewArtifact && previewContent !== null && (
        <div className="relative rounded-md border border-border bg-muted/30 p-4">
          <div className="mb-2 flex items-center justify-between">
            <span className="text-sm font-medium">{previewArtifact.title}</span>
            <Button
              variant="ghost"
              size="sm"
              className="h-6 w-6 p-0"
              onClick={() => {
                setPreviewArtifact(null);
                setPreviewContent(null);
              }}
            >
              <X className="h-3.5 w-3.5" />
            </Button>
          </div>
          <pre className="max-h-80 overflow-auto whitespace-pre-wrap text-xs">{previewContent}</pre>
        </div>
      )}
    </div>
  );
}
