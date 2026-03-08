"use client";

import { useEffect, useState } from "react";
import { cn } from "@/modules/shared/utils/cn";
import { ChevronDownIcon } from "@/modules/shared/components/icons";
import type { OllamaModel } from "@/modules/providers/lib/ollama";

export function DefaultModelPicker() {
  const [models, setModels] = useState<OllamaModel[]>([]);
  const [selected, setSelected] = useState<string>("");
  const [reachable, setReachable] = useState(true);
  const [saving, setSaving] = useState(false);
  const [open, setOpen] = useState(false);

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
    setOpen(false);
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
    <div className="px-4 py-3.5">
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between md:gap-4">
        <div className="min-w-0 md:flex-1">
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
          <div className="relative w-full md:w-80 md:max-w-[46%]">
            <button
              type="button"
              onClick={() => setOpen((v) => !v)}
              disabled={saving}
              aria-label="Select default model"
              aria-haspopup="listbox"
              aria-expanded={open}
              className={cn(
                "w-full min-w-0 h-11 rounded-xl px-3 border",
                "flex items-center justify-between gap-3",
                "bg-surface-elevated text-text-primary border-border",
                "transition-colors",
                "hover:border-accent/60 hover:bg-surface",
                "focus:outline-none focus:ring-2 focus:ring-accent/50",
                "disabled:opacity-60 disabled:cursor-not-allowed"
              )}
              title={selected}
            >
              <span className="min-w-0 truncate text-sm">{selected}</span>
              <ChevronDownIcon
                className={cn(
                  "shrink-0 text-text-secondary transition-transform duration-200",
                  open && "rotate-180"
                )}
              />
            </button>

            {open && (
              <>
                <div className="fixed inset-0 z-10" onClick={() => setOpen(false)} />
                <div className="absolute left-0 right-0 top-[calc(100%+0.5rem)] z-20 rounded-xl border border-border bg-surface-elevated shadow-xl overflow-hidden">
                  <div className="max-h-64 overflow-y-auto p-1.5" role="listbox" aria-label="Default model options">
                    {models.map((m) => (
                      <button
                        type="button"
                        role="option"
                        aria-selected={m.name === selected}
                        key={m.name}
                        onClick={() => handleChange(m.name)}
                        className={cn(
                          "w-full rounded-lg px-3 py-2 text-left text-sm transition-colors",
                          "truncate",
                          m.name === selected
                            ? "bg-accent/20 text-accent"
                            : "text-text-primary hover:bg-surface hover:text-text-primary"
                        )}
                        title={m.name}
                      >
                        {m.name}
                      </button>
                    ))}
                  </div>
                </div>
              </>
            )}

            {saving && (
              <p className="mt-1 text-[11px] text-text-secondary">Saving...</p>
            )}
          </div>
        )}

      </div>
    </div>
  );
}
