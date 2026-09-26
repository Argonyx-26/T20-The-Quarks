import { useState, useCallback } from "react";
import { StatusDot } from "./atoms";

interface UploadState {
  status: "idle" | "file-selected" | "uploading" | "success" | "error" | "device-offline";
  file?: File;
  uploadId?: string;
  filename?: string;
  bytes?: number;
  error?: string;
  device2Alert?: {
    delivered: boolean;
    deviceId?: string;
    reason?: string;
  };
}

export function FileUpload({ onUploadComplete }: { onUploadComplete?: () => void }) {
  const [state, setState] = useState<UploadState>({ status: "idle" });

  const handleFileSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setState({
      status: "file-selected",
      file,
    });
  }, []);

  const handleUpload = useCallback(async () => {
    if (!state.file) return;

    setState((s) => ({ ...s, status: "uploading" }));

    try {
      const formData = new FormData();
      formData.append("file", state.file);

      const response = await fetch("/api/files/upload", {
        method: "POST",
        body: formData,
      });

      const data = await response.json();

      if (!response.ok) {
        setState((s) => ({
          ...s,
          status: "error",
          error: data.detail?.error ?? `Upload failed (${response.status})`,
        }));
        return;
      }

      setState((s) => ({
        ...s,
        status: data.device2Alert?.delivered ? "success" : "device-offline",
        uploadId: data.uploadId,
        filename: data.filename,
        bytes: data.bytes,
        device2Alert: data.device2Alert,
      }));

      onUploadComplete?.();
    } catch (err) {
      setState((s) => ({
        ...s,
        status: "error",
        error: err instanceof Error ? err.message : "Network error",
      }));
    }
  }, [state.file, onUploadComplete]);

  const handleReset = useCallback(() => {
    setState({ status: "idle" });
  }, []);

  if (state.status === "idle") {
    return (
      <label className="flex items-center gap-2 cursor-pointer">
        <input
          type="file"
          onChange={handleFileSelect}
          className="sr-only"
          accept="*/*"
        />
        <button
          type="button"
          className="flex h-8 items-center gap-1.5 rounded-sm border border-line px-3 py-0.5 font-mono text-[10px] tracking-wide text-ink-muted hover:border-ink-faint hover:text-ink transition-colors"
        >
          <StatusDot color="#8991A0" />
          UPLOAD FILE
        </button>
      </label>
    );
  }

  if (state.status === "file-selected") {
    const file = state.file!;
    const sizeMB = (file.size / (1024 * 1024)).toFixed(1);
    return (
      <div className="flex items-center gap-2 border border-line bg-base-700 px-3 py-1.5 rounded-sm">
        <div className="flex flex-col items-start gap-0.5 min-w-0">
          <span className="font-mono text-[11px] truncate max-w-[180px]" title={file.name}>
            {file.name}
          </span>
          <span className="font-mono text-[9px] text-ink-faint">
            {sizeMB} MB · {file.type || "unknown"}
          </span>
        </div>
        <button
          type="button"
          onClick={handleUpload}
          className="flex h-7 shrink-0 items-center justify-center gap-1.5 rounded-sm border border-status-ok/50 bg-status-ok/10 px-3 py-0.5 font-mono text-[10px] font-medium text-status-ok transition-colors hover:bg-status-ok/20"
        >
          <StatusDot color="#3D9270" />
          SEND
        </button>
        <button
          type="button"
          onClick={handleReset}
          className="flex h-7 shrink-0 items-center justify-center rounded-sm border border-line px-2 py-0.5 font-mono text-[10px] text-ink-faint hover:border-ink-faint hover:text-ink"
        >
          ✕
        </button>
      </div>
    );
  }

  if (state.status === "uploading") {
    return (
      <div className="flex items-center gap-2 border border-line bg-base-700 px-3 py-1.5 rounded-sm">
        <StatusDot color="#B9842D" pulse />
        <span className="font-mono text-[10px] text-ink-faint">UPLOADING…</span>
      </div>
    );
  }

  if (state.status === "success") {
    return (
      <div className="flex items-center gap-2 border border-status-ok/50 bg-status-ok/10 px-3 py-1.5 rounded-sm">
        <StatusDot color="#3D9270" />
        <div className="flex flex-col items-start gap-0.5 min-w-0">
          <span className="font-mono text-[10px] font-medium text-status-ok">
            FILE RECEIVED
          </span>
          <span className="font-mono text-[9px] text-ink-faint">
            {state.filename} · {state.bytes} bytes
          </span>
        </div>
        <span className="flex h-5 items-center gap-1 rounded-sm border border-status-ok/50 bg-status-ok/10 px-1.5 py-0.5 font-mono text-[9px] text-status-ok">
          DEVICE 2 ALERTED
        </span>
        <button
          type="button"
          onClick={handleReset}
          className="flex h-7 shrink-0 items-center justify-center rounded-sm border border-line px-2 py-0.5 font-mono text-[10px] text-ink-faint hover:border-ink-faint hover:text-ink"
        >
          ✕
        </button>
      </div>
    );
  }

  if (state.status === "device-offline") {
    return (
      <div className="flex items-center gap-2 border border-amber/50 bg-amber/10 px-3 py-1.5 rounded-sm">
        <StatusDot color="#B9842D" />
        <div className="flex flex-col items-start gap-0.5 min-w-0">
          <span className="font-mono text-[10px] font-medium text-amber">
            FILE RECEIVED
          </span>
          <span className="font-mono text-[9px] text-ink-faint">
            {state.filename} · {state.bytes} bytes
          </span>
        </div>
        <span className="flex h-5 items-center gap-1 rounded-sm border border-amber/50 bg-amber/10 px-1.5 py-0.5 font-mono text-[9px] text-amber">
          DEVICE 2 OFFLINE
        </span>
        <button
          type="button"
          onClick={handleReset}
          className="flex h-7 shrink-0 items-center justify-center rounded-sm border border-line px-2 py-0.5 font-mono text-[10px] text-ink-faint hover:border-ink-faint hover:text-ink"
        >
          ✕
        </button>
      </div>
    );
  }

  if (state.status === "error") {
    return (
      <div className="flex items-center gap-2 border border-status-critical/50 bg-status-critical/10 px-3 py-1.5 rounded-sm">
        <StatusDot color="#CB514F" />
        <span className="font-mono text-[10px] text-status-critical truncate max-w-[200px]">
          {state.error}
        </span>
        <button
          type="button"
          onClick={handleReset}
          className="flex h-7 shrink-0 items-center justify-center rounded-sm border border-line px-2 py-0.5 font-mono text-[10px] text-ink-faint hover:border-ink-faint hover:text-ink"
        >
          ✕
        </button>
      </div>
    );
  }

  return null;
}