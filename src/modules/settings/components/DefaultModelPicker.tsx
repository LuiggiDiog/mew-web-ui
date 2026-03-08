"use client";

import { useEffect, useState } from "react";
import { cn } from "@/modules/shared/utils/cn";
import type { OllamaModel } from "@/modules/providers/lib/ollama";

export function DefaultModelPicker() {
  const [models, setModels] = useState<OllamaModel[]>([]);
  const [selected, setSelected] = useState<string>("");
  const [reachable, setReachable] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    Promise.all([
      fetch("/api/providers/ollama/models").then((r) => (r.ok ? r.json() : null)),
      fetch("/api/settings").then((r) => (r.ok ? r.json() : null)),
    ]).then(([modelData, settingsData]) => {
      if (!modelData?.models) { setReachable(false); return; }
      const list: OllamaModel[] = modelData.models;
      setModels(list);
      const saved: string = settingsData?.defaultModel ?? "";
      setSelected(list.some((m) => m.name === saved) ? saved : (list[0]?.name ?? ""));
    }).catch(() => setReachable(false));
  }, []);

  function handleChange(value: string) {
    setSelected(value);
    setSaving(true);
    fetch("/api/settings", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ defaultModel: value }),
    })
      .catch(() => {})
      .finally(() => setSaving(false));
  }

  return (
    <div className="flex items-center justify-between px-4 py-3.5 gap-4">
      <div className="min-w-0">
        <p className="text-sm text-text-primary">Default model</p>
        <p className="text-xs text-text-secondary mt-0.5">
          Model selected automatically on new chats
        </p>
      </div>

      {!reachable ? (
        <span className="text-xs text-zinc-500">Ollama unreachable</span>
      ) : models.length === 0 ? (
        <span className="text-xs text-text-secondary">Loading...</span>
      ) : (
        <select
          value={selected}
          onChange={(e) => handleChange(e.target.value)}
          disabled={saving}
          className={cn(
            "text-xs rounded-lg px-2.5 py-1.5 border border-border",
            "bg-surface-elevated text-text-primary",
            "focus:outline-none focus:ring-2 focus:ring-accent/50",
            "disabled:opacity-50"
          )}
        >
          {models.map((m) => (
            <option key={m.name} value={m.name}>
              {m.name}
            </option>
          ))}
        </select>
      )}
    </div>
  );
}
