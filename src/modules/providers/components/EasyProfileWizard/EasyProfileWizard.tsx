"use client";

import { useCallback, useRef, useState } from "react";
import { Button } from "@/modules/shared/components/Button";
import { cn } from "@/modules/shared/utils/cn";
import { detectComfyUIPlaceholders } from "@/modules/providers/utils/detectComfyUIPlaceholders";
import type { DetectionResult } from "@/modules/providers/utils/detectComfyUIPlaceholders";

// ─── Types ────────────────────────────────────────────────────────────────────

export interface AdvancedPrefill {
  baseUrl: string;
  workflowJson: string;
  outputNodeId: string;
  placeholders: string;
}

interface EasyProfileWizardProps {
  onDone: () => void;
  onCancel: () => void;
  onSwitchToAdvanced: (prefill: AdvancedPrefill) => void;
}

type Step = 1 | 2 | 3;
type ConnectionStatus = "idle" | "checking" | "ok" | "fail";

// ─── Label map for placeholder keys ──────────────────────────────────────────

const PLACEHOLDER_LABELS: Record<string, string> = {
  positivePrompt: "Positive prompt",
  negativePrompt: "Negative prompt",
  width: "Width",
  height: "Height",
  seed: "Seed",
  denoise: "Denoise",
  referenceImage: "Reference image",
};

const REQUIRED_DETECTED_KEYS = ["positivePrompt", "negativePrompt", "width", "height", "seed"];

// ─── Step indicator ───────────────────────────────────────────────────────────

function StepIndicator({ step }: { step: Step }) {
  const steps = [
    { n: 1, label: "Connect" },
    { n: 2, label: "Workflow" },
    { n: 3, label: "Create" },
  ];
  return (
    <div className="flex items-center gap-0 mb-5">
      {steps.map(({ n, label }, i) => (
        <div key={n} className="flex items-center gap-0">
          <div className="flex flex-col items-center gap-0.5">
            <div
              className={cn(
                "w-6 h-6 rounded-full flex items-center justify-center text-xs font-medium transition-colors",
                step === n
                  ? "bg-accent text-white"
                  : step > n
                    ? "bg-accent/30 text-accent"
                    : "bg-surface-elevated text-text-secondary"
              )}
            >
              {step > n ? "✓" : n}
            </div>
            <span
              className={cn(
                "text-[10px] whitespace-nowrap",
                step === n ? "text-accent" : "text-text-secondary"
              )}
            >
              {label}
            </span>
          </div>
          {i < steps.length - 1 && (
            <div className={cn("w-12 h-px mb-3 mx-1", step > n ? "bg-accent/40" : "bg-border/50")} />
          )}
        </div>
      ))}
    </div>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

export function EasyProfileWizard({ onDone, onCancel, onSwitchToAdvanced }: EasyProfileWizardProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Step
  const [step, setStep] = useState<Step>(1);

  // Step 1
  const [url, setUrl] = useState("");
  const [connectionStatus, setConnectionStatus] = useState<ConnectionStatus>("idle");

  // Step 2
  const [workflowRaw, setWorkflowRaw] = useState<object | null>(null);
  const [workflowFileName, setWorkflowFileName] = useState("");
  const [detection, setDetection] = useState<DetectionResult | null>(null);
  const [fileError, setFileError] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);

  // Step 3
  const [profileName, setProfileName] = useState("");
  const [isDefault, setIsDefault] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  // ── Step 1: Test connection ───────────────────────────────────────────────

  const normalizeUrl = (raw: string) => raw.trim().replace(/\/+$/, "");

  const handleTestConnection = async () => {
    if (!url.trim()) return;
    setConnectionStatus("checking");
    try {
      const res = await fetch("/api/comfyui-profiles/test-url", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: normalizeUrl(url) }),
      });
      const data = await res.json();
      setConnectionStatus(data.connected ? "ok" : "fail");
    } catch {
      setConnectionStatus("fail");
    }
  };

  // ── Step 2: Process workflow file ─────────────────────────────────────────

  const processFile = useCallback((file: File) => {
    setFileError(null);
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const parsed = JSON.parse(e.target?.result as string);
        const result = detectComfyUIPlaceholders(parsed);
        setWorkflowRaw(parsed);
        setWorkflowFileName(file.name);
        setDetection(result);
        // Auto-suggest profile name from file name (strip extension)
        setProfileName((prev) => prev || file.name.replace(/\.json$/i, ""));
      } catch {
        setFileError("Invalid JSON file — could not parse.");
      }
    };
    reader.readAsText(file);
  }, []);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) processFile(file);
    e.target.value = "";
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (file) processFile(file);
  };

  // ── Step 3: Create profile ────────────────────────────────────────────────

  const handleCreate = async () => {
    if (!workflowRaw || !detection || !profileName.trim()) return;
    setSaving(true);
    setSaveError(null);
    try {
      const res = await fetch("/api/comfyui-profiles", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: profileName.trim(),
          baseUrl: normalizeUrl(url),
          workflowJson: workflowRaw,
          outputNodeId: detection.outputNodeId,
          placeholders: detection.placeholders,
          img2imgWorkflowJson: null,
          img2imgPlaceholders: null,
          enhanceSystemPrompt: null,
          enhanceImg2ImgSystemPrompt: null,
          enhanceModel: null,
          isDefault,
        }),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error ?? "Failed to create profile");
      }
      onDone();
    } catch (e) {
      setSaveError(e instanceof Error ? e.message : "Failed to create");
    } finally {
      setSaving(false);
    }
  };

  const handleSwitchToAdvanced = () => {
    if (!workflowRaw || !detection) return;
    onSwitchToAdvanced({
      baseUrl: normalizeUrl(url),
      workflowJson: JSON.stringify(workflowRaw, null, 2),
      outputNodeId: detection.outputNodeId,
      placeholders: JSON.stringify(detection.placeholders, null, 2),
    });
  };

  // ── Connection status indicator ───────────────────────────────────────────

  const connDot = () => {
    if (connectionStatus === "checking") return <span className="text-amber-400 text-sm">●</span>;
    if (connectionStatus === "ok") return <span className="text-emerald-400 text-sm">●</span>;
    if (connectionStatus === "fail") return <span className="text-red-400 text-sm">●</span>;
    return null;
  };

  const connLabel = () => {
    if (connectionStatus === "checking") return <span className="text-xs text-amber-400">Checking…</span>;
    if (connectionStatus === "ok") return <span className="text-xs text-emerald-400">Connected</span>;
    if (connectionStatus === "fail") return <span className="text-xs text-red-400">Could not connect</span>;
    return null;
  };

  const inputCls = "flex-1 bg-surface-elevated border border-border rounded-lg px-3 py-1.5 text-sm text-text-primary outline-none focus:border-accent/50 transition-colors";

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <div className="p-4 space-y-0">
      <StepIndicator step={step} />

      {/* ── Step 1: Connect ── */}
      {step === 1 && (
        <div className="space-y-4">
          <div>
            <p className="text-sm font-medium text-text-primary mb-1">ComfyUI URL</p>
            <p className="text-xs text-text-secondary mb-3">Enter the base URL of your ComfyUI instance.</p>
            <div className="flex gap-2">
              <input
                value={url}
                onChange={(e) => { setUrl(e.target.value); setConnectionStatus("idle"); }}
                onKeyDown={(e) => e.key === "Enter" && handleTestConnection()}
                placeholder="http://192.168.1.202:8188"
                className={inputCls}
              />
              <Button
                size="sm"
                variant="ghost"
                onClick={handleTestConnection}
                disabled={!url.trim() || connectionStatus === "checking"}
              >
                Test
              </Button>
            </div>
            {(connectionStatus !== "idle") && (
              <div className="flex items-center gap-1.5 mt-2">
                {connDot()}
                {connLabel()}
              </div>
            )}
          </div>

          <div className="flex justify-end gap-2 pt-1">
            <Button variant="ghost" size="sm" onClick={onCancel}>Cancel</Button>
            <Button
              size="sm"
              onClick={() => setStep(2)}
              disabled={connectionStatus !== "ok"}
            >
              Next
            </Button>
          </div>
        </div>
      )}

      {/* ── Step 2: Load Workflow ── */}
      {step === 2 && (
        <div className="space-y-4">
          <div>
            <p className="text-sm font-medium text-text-primary mb-1">Workflow JSON</p>
            <p className="text-xs text-text-secondary mb-3">
              In ComfyUI: Settings → Enable Dev mode Options, then{" "}
              <span className="text-text-primary font-medium">Save (API Format)</span>.
              Drop or select that file here.
            </p>

            <input ref={fileInputRef} type="file" accept=".json" className="hidden" onChange={handleFileChange} />

            <div
              className={cn(
                "rounded-xl border-2 border-dashed px-6 py-8 text-center cursor-pointer transition-colors",
                isDragging ? "border-accent bg-accent/5" : "border-border/50 hover:border-accent/40 hover:bg-surface-elevated/50",
                workflowRaw && "border-emerald-500/40 bg-emerald-500/5"
              )}
              onClick={() => fileInputRef.current?.click()}
              onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
              onDragLeave={() => setIsDragging(false)}
              onDrop={handleDrop}
            >
              {workflowRaw ? (
                <div className="space-y-1">
                  <p className="text-sm text-emerald-400 font-medium">✓ {workflowFileName}</p>
                  <p className="text-xs text-text-secondary">Click or drop to replace</p>
                </div>
              ) : (
                <div className="space-y-1">
                  <p className="text-sm text-text-secondary">Drop <code className="text-text-primary">workflow_api.json</code> here</p>
                  <p className="text-xs text-text-secondary">or click to browse</p>
                </div>
              )}
            </div>

            {fileError && <p className="text-xs text-red-400 mt-2">{fileError}</p>}

            {/* Detection preview */}
            {detection && (
              <div className="mt-3 rounded-lg border border-border/50 bg-surface-elevated/40 px-3 py-2.5 space-y-1">
                <p className="text-xs font-medium text-text-secondary mb-1.5">Auto-detected nodes</p>
                {Object.entries(PLACEHOLDER_LABELS).map(([key, label]) => {
                  const entry = detection.placeholders[key as keyof typeof detection.placeholders];
                  const isRequired = REQUIRED_DETECTED_KEYS.includes(key);
                  if (!entry && !isRequired) return null;
                  return (
                    <div key={key} className="flex items-center justify-between gap-2 text-xs">
                      <span className="text-text-secondary">{label}</span>
                      {entry ? (
                        <span className="text-emerald-400">✓ node {entry.nodeId} · {entry.field}</span>
                      ) : (
                        <span className="text-amber-400">⚠ not detected</span>
                      )}
                    </div>
                  );
                })}
                <div className="flex items-center justify-between gap-2 text-xs border-t border-border/30 mt-1.5 pt-1.5">
                  <span className="text-text-secondary">Output node</span>
                  <span className={cn("font-mono", detection.missing.includes("outputNodeId") ? "text-amber-400" : "text-emerald-400")}>
                    {detection.missing.includes("outputNodeId") ? "⚠ fallback → 9" : `✓ node ${detection.outputNodeId}`}
                  </span>
                </div>
              </div>
            )}
          </div>

          <div className="flex justify-between gap-2 pt-1">
            <Button variant="ghost" size="sm" onClick={() => setStep(1)}>Back</Button>
            <div className="flex gap-2">
              <Button variant="ghost" size="sm" onClick={onCancel}>Cancel</Button>
              <Button
                size="sm"
                onClick={() => setStep(3)}
                disabled={!detection}
              >
                Next
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* ── Step 3: Review & Create ── */}
      {step === 3 && detection && (
        <div className="space-y-4">
          <div>
            <p className="text-sm font-medium text-text-primary mb-1">Review & create</p>
            <p className="text-xs text-text-secondary mb-3">Confirm the detected mappings and give your profile a name.</p>

            {/* Detection table */}
            <div className="rounded-lg border border-border/50 overflow-hidden mb-4">
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b border-border/30 bg-surface-elevated/60">
                    <th className="text-left px-3 py-2 text-text-secondary font-medium">Placeholder</th>
                    <th className="text-left px-3 py-2 text-text-secondary font-medium">Node / Field</th>
                  </tr>
                </thead>
                <tbody>
                  {Object.entries(PLACEHOLDER_LABELS).map(([key, label]) => {
                    const entry = detection.placeholders[key as keyof typeof detection.placeholders];
                    const isRequired = REQUIRED_DETECTED_KEYS.includes(key);
                    if (!entry && !isRequired && key !== "referenceImage") return null;
                    return (
                      <tr key={key} className="border-b border-border/20 last:border-0">
                        <td className="px-3 py-2 text-text-secondary">{label}</td>
                        <td className="px-3 py-2">
                          {entry ? (
                            <span className="font-mono text-text-primary">
                              {entry.nodeId} · {entry.field}
                            </span>
                          ) : (
                            <span className="text-amber-400">Not detected</span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                  <tr className="border-b border-border/20 last:border-0">
                    <td className="px-3 py-2 text-text-secondary">Output node</td>
                    <td className="px-3 py-2 font-mono text-text-primary">{detection.outputNodeId}</td>
                  </tr>
                </tbody>
              </table>
            </div>

            {detection.missing.filter(k => REQUIRED_DETECTED_KEYS.includes(k)).length > 0 && (
              <p className="text-xs text-amber-400 mb-3">
                ⚠ Some fields were not auto-detected. The profile will work but generation may fail for those inputs.{" "}
                <button
                  type="button"
                  onClick={handleSwitchToAdvanced}
                  className="underline hover:text-amber-300"
                >
                  Fix in Advanced mode
                </button>
              </p>
            )}

            {/* Name input */}
            <div className="flex items-center gap-2 mb-3">
              <label className="text-xs text-text-secondary w-24 shrink-0">Profile name</label>
              <input
                value={profileName}
                onChange={(e) => setProfileName(e.target.value)}
                placeholder="My ComfyUI Profile"
                className={inputCls}
              />
            </div>

            {/* Default checkbox */}
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={isDefault}
                onChange={(e) => setIsDefault(e.target.checked)}
                className="accent-accent"
              />
              <span className="text-xs text-text-secondary">Set as default profile</span>
            </label>

            {saveError && <p className="text-xs text-red-400 mt-2">{saveError}</p>}
          </div>

          <div className="flex items-center justify-between gap-2 pt-1">
            <button
              type="button"
              onClick={handleSwitchToAdvanced}
              className="text-xs text-text-secondary hover:text-text-primary underline outline-none transition-colors"
            >
              Switch to Advanced mode
            </button>
            <div className="flex gap-2">
              <Button variant="ghost" size="sm" onClick={() => setStep(2)} disabled={saving}>Back</Button>
              <Button variant="ghost" size="sm" onClick={onCancel} disabled={saving}>Cancel</Button>
              <Button
                size="sm"
                onClick={handleCreate}
                disabled={saving || !profileName.trim()}
              >
                {saving ? "Creating…" : "Create profile"}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
