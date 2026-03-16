"use client";

import { useEffect, useRef, useState } from "react";
import { SettingsSection } from "@/modules/settings/components/SettingsSection";
import { Badge } from "@/modules/shared/components/Badge";
import { Button } from "@/modules/shared/components/Button";
import {
  PlusIcon,
  EditIcon,
  DownloadIcon,
  RefreshIcon,
  XIcon,
} from "@/modules/shared/components/icons";
import { cn } from "@/modules/shared/utils/cn";
import { ENHANCE_SYSTEM_PROMPT, ENHANCE_IMG2IMG_SYSTEM_PROMPT, Z_IMAGE_TURBO_PLACEHOLDERS } from "@/modules/providers/services/comfyui";

// ─── Types ────────────────────────────────────────────────────────────────────

interface ProfileRow {
  id: string;
  name: string;
  baseUrl: string;
  workflowJson: object;
  img2imgWorkflowJson: object | null;
  outputNodeId: string;
  placeholders: object;
  img2imgPlaceholders: object | null;
  enhanceSystemPrompt: string | null;
  enhanceImg2ImgSystemPrompt: string | null;
  enhanceModel: string | null;
  isDefault: boolean;
}

interface FormState {
  name: string;
  baseUrl: string;
  workflowJson: string;
  img2imgWorkflowJson: string;
  outputNodeId: string;
  placeholders: string;
  img2imgPlaceholders: string;
  enhanceSystemPrompt: string;
  enhanceImg2ImgSystemPrompt: string;
  enhanceModel: string;
  isDefault: boolean;
}

function defaultForm(profile?: ProfileRow): FormState {
  return {
    name: profile?.name ?? "",
    baseUrl: profile?.baseUrl ?? "",
    workflowJson: profile ? JSON.stringify(profile.workflowJson, null, 2) : "",
    img2imgWorkflowJson: profile?.img2imgWorkflowJson ? JSON.stringify(profile.img2imgWorkflowJson, null, 2) : "",
    outputNodeId: profile?.outputNodeId ?? "9",
    placeholders: profile ? JSON.stringify(profile.placeholders, null, 2) : JSON.stringify(Z_IMAGE_TURBO_PLACEHOLDERS, null, 2),
    img2imgPlaceholders: profile?.img2imgPlaceholders ? JSON.stringify(profile.img2imgPlaceholders, null, 2) : "",
    enhanceSystemPrompt: profile?.enhanceSystemPrompt ?? ENHANCE_SYSTEM_PROMPT,
    enhanceImg2ImgSystemPrompt: profile?.enhanceImg2ImgSystemPrompt ?? ENHANCE_IMG2IMG_SYSTEM_PROMPT,
    enhanceModel: profile?.enhanceModel ?? "",
    isDefault: profile?.isDefault ?? false,
  };
}

// ─── ProfileForm ──────────────────────────────────────────────────────────────

interface ProfileFormProps {
  initial?: ProfileRow;
  onSave: (form: FormState) => Promise<void>;
  onCancel: () => void;
  saving: boolean;
}

function ProfileForm({ initial, onSave, onCancel, saving }: ProfileFormProps) {
  const [form, setForm] = useState<FormState>(() => defaultForm(initial));
  const [error, setError] = useState<string | null>(null);
  const [showImg2Img, setShowImg2Img] = useState(
    !!(initial?.img2imgWorkflowJson)
  );
  const [showEnhance, setShowEnhance] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const set = (key: keyof FormState) => (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => setForm((f) => ({ ...f, [key]: e.target.value }));

  const handleFileImport = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (evt) => {
      const text = evt.target?.result as string;
      try {
        const parsed = JSON.parse(text);
        // Detect if it's a full profile export or just a workflow JSON
        if (parsed.workflowJson !== undefined) {
          // Full profile export
          setForm({
            name: parsed.name ?? "",
            baseUrl: parsed.baseUrl ?? "",
            workflowJson: JSON.stringify(parsed.workflowJson, null, 2),
            img2imgWorkflowJson: parsed.img2imgWorkflowJson ? JSON.stringify(parsed.img2imgWorkflowJson, null, 2) : "",
            outputNodeId: parsed.outputNodeId ?? "9",
            placeholders: parsed.placeholders ? JSON.stringify(parsed.placeholders, null, 2) : "",
            img2imgPlaceholders: parsed.img2imgPlaceholders ? JSON.stringify(parsed.img2imgPlaceholders, null, 2) : "",
            enhanceSystemPrompt: parsed.enhanceSystemPrompt ?? ENHANCE_SYSTEM_PROMPT,
            enhanceImg2ImgSystemPrompt: parsed.enhanceImg2ImgSystemPrompt ?? ENHANCE_IMG2IMG_SYSTEM_PROMPT,
            enhanceModel: parsed.enhanceModel ?? "",
            isDefault: false,
          });
        } else {
          // Raw ComfyUI API workflow JSON
          setForm((f) => ({ ...f, workflowJson: JSON.stringify(parsed, null, 2) }));
        }
      } catch {
        setError("Invalid JSON file");
      }
    };
    reader.readAsText(file);
    e.target.value = "";
  };

  const handleSubmit = async () => {
    setError(null);

    // Validate JSON fields
    try { JSON.parse(form.workflowJson); } catch { setError("Workflow JSON is invalid"); return; }
    if (form.img2imgWorkflowJson.trim()) {
      try { JSON.parse(form.img2imgWorkflowJson); } catch { setError("Img2Img Workflow JSON is invalid"); return; }
    }
    try { JSON.parse(form.placeholders); } catch { setError("Placeholders JSON is invalid"); return; }
    if (form.img2imgPlaceholders.trim()) {
      try { JSON.parse(form.img2imgPlaceholders); } catch { setError("Img2Img Placeholders JSON is invalid"); return; }
    }

    try {
      await onSave(form);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to save");
    }
  };

  return (
    <div className="p-4 space-y-4">
      <input ref={fileInputRef} type="file" accept=".json" className="hidden" onChange={handleFileImport} />

      {/* Basic fields */}
      <div className="space-y-3">
        <div className="flex items-center gap-2">
          <label className="text-xs text-text-secondary w-28 shrink-0">Name</label>
          <input
            value={form.name}
            onChange={set("name")}
            placeholder="Z-Image Turbo"
            className="flex-1 bg-surface-elevated border border-border rounded-lg px-3 py-1.5 text-sm text-text-primary outline-none focus:border-accent/50 transition-colors"
          />
        </div>

        <div className="flex items-center gap-2">
          <label className="text-xs text-text-secondary w-28 shrink-0">Base URL</label>
          <input
            value={form.baseUrl}
            onChange={set("baseUrl")}
            placeholder="http://192.168.1.202:8188"
            className="flex-1 bg-surface-elevated border border-border rounded-lg px-3 py-1.5 text-sm text-text-primary outline-none focus:border-accent/50 transition-colors"
          />
        </div>

        <div className="flex items-center gap-2">
          <label className="text-xs text-text-secondary w-28 shrink-0">Output Node ID</label>
          <input
            value={form.outputNodeId}
            onChange={set("outputNodeId")}
            placeholder="9"
            className="w-24 bg-surface-elevated border border-border rounded-lg px-3 py-1.5 text-sm text-text-primary outline-none focus:border-accent/50 transition-colors"
          />
        </div>
      </div>

      {/* Workflow JSON */}
      <div>
        <div className="flex items-center justify-between mb-1.5">
          <label className="text-xs text-text-secondary">Workflow JSON (ComfyUI API format)</label>
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="text-xs text-accent hover:underline outline-none"
          >
            Load from file
          </button>
        </div>
        <textarea
          value={form.workflowJson}
          onChange={set("workflowJson")}
          rows={6}
          placeholder="Paste your ComfyUI API-format workflow JSON here…"
          className="w-full bg-surface-elevated border border-border rounded-lg px-3 py-2 text-xs text-text-primary font-mono outline-none focus:border-accent/50 transition-colors resize-y"
        />
      </div>

      {/* Placeholders */}
      <div>
        <label className="text-xs text-text-secondary block mb-1.5">Placeholder Mappings</label>
        <textarea
          value={form.placeholders}
          onChange={set("placeholders")}
          rows={5}
          className="w-full bg-surface-elevated border border-border rounded-lg px-3 py-2 text-xs text-text-primary font-mono outline-none focus:border-accent/50 transition-colors resize-y"
        />
        <p className="text-xs text-text-secondary mt-1">
          Maps dynamic values (positivePrompt, width, height, seed, denoise) to node IDs.
        </p>
      </div>

      {/* Img2Img section (collapsible) */}
      <div>
        <button
          type="button"
          onClick={() => setShowImg2Img((v) => !v)}
          className="text-xs text-accent hover:underline outline-none"
        >
          {showImg2Img ? "▾ Hide img2img workflow" : "▸ Add img2img workflow (optional)"}
        </button>

        {showImg2Img && (
          <div className="mt-3 space-y-3">
            <div>
              <label className="text-xs text-text-secondary block mb-1.5">Img2Img Workflow JSON</label>
              <textarea
                value={form.img2imgWorkflowJson}
                onChange={set("img2imgWorkflowJson")}
                rows={6}
                placeholder="Paste img2img workflow JSON…"
                className="w-full bg-surface-elevated border border-border rounded-lg px-3 py-2 text-xs text-text-primary font-mono outline-none focus:border-accent/50 transition-colors resize-y"
              />
            </div>
            <div>
              <label className="text-xs text-text-secondary block mb-1.5">Img2Img Placeholder Mappings</label>
              <textarea
                value={form.img2imgPlaceholders}
                onChange={set("img2imgPlaceholders")}
                rows={5}
                placeholder='{"positivePrompt":{"nodeId":"6","field":"text"},"referenceImage":{"nodeId":"20","field":"image"},...}'
                className="w-full bg-surface-elevated border border-border rounded-lg px-3 py-2 text-xs text-text-primary font-mono outline-none focus:border-accent/50 transition-colors resize-y"
              />
            </div>
          </div>
        )}
      </div>

      {/* Enhance prompts (collapsible) */}
      <div>
        <button
          type="button"
          onClick={() => setShowEnhance((v) => !v)}
          className="text-xs text-accent hover:underline outline-none"
        >
          {showEnhance ? "▾ Hide prompt enhancement settings" : "▸ Customize prompt enhancement"}
        </button>

        {showEnhance && (
          <div className="mt-3 space-y-3">
            <div className="flex items-center gap-2">
              <label className="text-xs text-text-secondary w-28 shrink-0">Model override</label>
              <input
                value={form.enhanceModel}
                onChange={set("enhanceModel")}
                placeholder="Leave blank to use default model"
                className="flex-1 bg-surface-elevated border border-border rounded-lg px-3 py-1.5 text-sm text-text-primary outline-none focus:border-accent/50 transition-colors"
              />
            </div>
            <div>
              <label className="text-xs text-text-secondary block mb-1.5">Text-to-image system prompt</label>
              <textarea
                value={form.enhanceSystemPrompt}
                onChange={set("enhanceSystemPrompt")}
                rows={6}
                className="w-full bg-surface-elevated border border-border rounded-lg px-3 py-2 text-xs text-text-primary outline-none focus:border-accent/50 transition-colors resize-y"
              />
            </div>
            <div>
              <label className="text-xs text-text-secondary block mb-1.5">Img2Img system prompt</label>
              <textarea
                value={form.enhanceImg2ImgSystemPrompt}
                onChange={set("enhanceImg2ImgSystemPrompt")}
                rows={6}
                className="w-full bg-surface-elevated border border-border rounded-lg px-3 py-2 text-xs text-text-primary outline-none focus:border-accent/50 transition-colors resize-y"
              />
            </div>
          </div>
        )}
      </div>

      {/* Set as default */}
      <label className="flex items-center gap-2 cursor-pointer">
        <input
          type="checkbox"
          checked={form.isDefault}
          onChange={(e) => setForm((f) => ({ ...f, isDefault: e.target.checked }))}
          className="accent-accent"
        />
        <span className="text-sm text-text-primary">Set as default profile</span>
      </label>

      {error && <p className="text-xs text-red-400">{error}</p>}

      <div className="flex gap-2 justify-end pt-1">
        <Button variant="ghost" size="sm" onClick={onCancel} disabled={saving}>
          Cancel
        </Button>
        <Button size="sm" onClick={handleSubmit} disabled={saving}>
          {saving ? "Saving…" : initial ? "Save changes" : "Create profile"}
        </Button>
      </div>
    </div>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

export function ComfyUIProfiles() {
  const [profiles, setProfiles] = useState<ProfileRow[]>([]);
  const [connectionStatus, setConnectionStatus] = useState<Record<string, "idle" | "checking" | "ok" | "fail">>({});
  const [editingId, setEditingId] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);
  const [saving, setSaving] = useState(false);
  const importFileRef = useRef<HTMLInputElement>(null);

  const loadProfiles = async () => {
    try {
      const res = await fetch("/api/comfyui-profiles");
      const data = await res.json();
      if (data.profiles) setProfiles(data.profiles);
    } catch { /* ignore */ }
  };

  useEffect(() => { loadProfiles(); }, []);

  const handleTest = async (id: string) => {
    setConnectionStatus((s) => ({ ...s, [id]: "checking" }));
    try {
      const res = await fetch(`/api/comfyui-profiles/${id}/test`, { method: "POST" });
      const data = await res.json();
      setConnectionStatus((s) => ({ ...s, [id]: data.connected ? "ok" : "fail" }));
    } catch {
      setConnectionStatus((s) => ({ ...s, [id]: "fail" }));
    }
  };

  const handleSetDefault = async (id: string) => {
    await fetch(`/api/comfyui-profiles/${id}/default`, { method: "POST" });
    await loadProfiles();
  };

  const handleExport = (id: string) => {
    window.open(`/api/comfyui-profiles/${id}/export`, "_blank");
  };

  const handleDelete = async (id: string, name: string) => {
    if (!confirm(`Delete profile "${name}"?`)) return;
    const res = await fetch(`/api/comfyui-profiles/${id}`, { method: "DELETE" });
    if (res.ok) {
      await loadProfiles();
    } else {
      const data = await res.json();
      alert(data.error ?? "Cannot delete profile");
    }
  };

  const buildBody = (form: FormState) => ({
    name: form.name,
    baseUrl: form.baseUrl,
    workflowJson: JSON.parse(form.workflowJson),
    img2imgWorkflowJson: form.img2imgWorkflowJson.trim() ? JSON.parse(form.img2imgWorkflowJson) : null,
    outputNodeId: form.outputNodeId || "9",
    placeholders: JSON.parse(form.placeholders),
    img2imgPlaceholders: form.img2imgPlaceholders.trim() ? JSON.parse(form.img2imgPlaceholders) : null,
    enhanceSystemPrompt: form.enhanceSystemPrompt || null,
    enhanceImg2ImgSystemPrompt: form.enhanceImg2ImgSystemPrompt || null,
    enhanceModel: form.enhanceModel || null,
    isDefault: form.isDefault,
  });

  const handleCreate = async (form: FormState) => {
    setSaving(true);
    try {
      const res = await fetch("/api/comfyui-profiles", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(buildBody(form)),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error ?? "Failed to create profile");
      }
      setCreating(false);
      await loadProfiles();
    } finally {
      setSaving(false);
    }
  };

  const handleUpdate = async (id: string, form: FormState) => {
    setSaving(true);
    try {
      const res = await fetch(`/api/comfyui-profiles/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(buildBody(form)),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error ?? "Failed to update profile");
      }
      setEditingId(null);
      await loadProfiles();
    } finally {
      setSaving(false);
    }
  };

  const handleImportFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = async (evt) => {
      const text = evt.target?.result as string;
      try {
        const parsed = JSON.parse(text);
        const res = await fetch("/api/comfyui-profiles/import", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(parsed),
        });
        if (!res.ok) {
          const data = await res.json();
          alert(data.error ?? "Import failed");
        } else {
          await loadProfiles();
        }
      } catch {
        alert("Invalid JSON file");
      }
    };
    reader.readAsText(file);
    e.target.value = "";
  };

  const connIcon = (status: "idle" | "checking" | "ok" | "fail" | undefined) => {
    if (status === "checking") return <span className="text-amber-400 text-xs">●</span>;
    if (status === "ok") return <span className="text-emerald-400 text-xs">●</span>;
    if (status === "fail") return <span className="text-red-400 text-xs">●</span>;
    return null;
  };

  return (
    <SettingsSection
      title="Image Profiles"
      description="ComfyUI connection profiles. Each profile stores a workflow, placeholder mappings, and prompt enhancement settings."
    >
      <input ref={importFileRef} type="file" accept=".json" className="hidden" onChange={handleImportFile} />

      {/* Action bar */}
      <div className="flex items-center gap-2 px-4 py-2.5 border-b border-border/30">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => { setCreating(true); setEditingId(null); }}
          className="gap-1.5"
        >
          <PlusIcon className="w-3.5 h-3.5" />
          Add profile
        </Button>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => importFileRef.current?.click()}
        >
          Import
        </Button>
      </div>

      {/* Create form */}
      {creating && (
        <div className="border-b border-border/30">
          <ProfileForm
            onSave={handleCreate}
            onCancel={() => setCreating(false)}
            saving={saving}
          />
        </div>
      )}

      {/* Profile list */}
      {profiles.length === 0 && !creating && (
        <p className="px-4 py-3 text-xs text-text-secondary">No profiles configured.</p>
      )}

      {profiles.map((profile) => (
        <div key={profile.id}>
          {/* Profile row */}
          {editingId !== profile.id && (
            <div className="flex items-center justify-between px-4 py-3.5 gap-3">
              <div className="min-w-0 flex items-center gap-2">
                {connIcon(connectionStatus[profile.id])}
                <div>
                  <div className="flex items-center gap-1.5">
                    <p className="text-sm font-medium text-text-primary">{profile.name}</p>
                    {profile.isDefault && (
                      <Badge variant="local">Default</Badge>
                    )}
                  </div>
                  <p className="text-xs text-text-secondary mt-0.5 truncate">{profile.baseUrl}</p>
                </div>
              </div>

              <div className="flex items-center gap-0.5 shrink-0">
                <button
                  type="button"
                  title="Test connection"
                  onClick={() => handleTest(profile.id)}
                  className={cn(
                    "p-1.5 rounded-lg text-text-secondary hover:text-text-primary hover:bg-surface-elevated transition-colors outline-none",
                    connectionStatus[profile.id] === "checking" && "opacity-50 pointer-events-none"
                  )}
                >
                  <RefreshIcon className="w-3.5 h-3.5" />
                </button>

                <button
                  type="button"
                  title="Edit profile"
                  onClick={() => { setEditingId(profile.id); setCreating(false); }}
                  className="p-1.5 rounded-lg text-text-secondary hover:text-text-primary hover:bg-surface-elevated transition-colors outline-none"
                >
                  <EditIcon className="w-3.5 h-3.5" />
                </button>

                <button
                  type="button"
                  title="Export profile"
                  onClick={() => handleExport(profile.id)}
                  className="p-1.5 rounded-lg text-text-secondary hover:text-text-primary hover:bg-surface-elevated transition-colors outline-none"
                >
                  <DownloadIcon className="w-3.5 h-3.5" />
                </button>

                {!profile.isDefault && (
                  <button
                    type="button"
                    title="Set as default"
                    onClick={() => handleSetDefault(profile.id)}
                    className="px-2 py-1 rounded-lg text-xs text-text-secondary hover:text-text-primary hover:bg-surface-elevated transition-colors outline-none"
                  >
                    Set default
                  </button>
                )}

                <button
                  type="button"
                  title="Delete profile"
                  onClick={() => handleDelete(profile.id, profile.name)}
                  className="p-1.5 rounded-lg text-text-secondary hover:text-red-400 hover:bg-surface-elevated transition-colors outline-none"
                >
                  <XIcon className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          )}

          {/* Inline edit form */}
          {editingId === profile.id && (
            <ProfileForm
              initial={profile}
              onSave={(form) => handleUpdate(profile.id, form)}
              onCancel={() => setEditingId(null)}
              saving={saving}
            />
          )}
        </div>
      ))}
    </SettingsSection>
  );
}
