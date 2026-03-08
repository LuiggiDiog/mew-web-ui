"use client";

import { useEffect, useState } from "react";
import { cn } from "@/modules/shared/utils/cn";
import { ChevronDownIcon } from "@/modules/shared/components/icons";
import { useChatStore } from "@/modules/chat/store/chatStore";
import type { OllamaModel } from "@/modules/providers/lib/ollama";

export function ModelSelector() {
  const { activeModel, activeProvider, setModel, setProvider } = useChatStore();
  const [open, setOpen] = useState(false);
  const [ollamaModels, setOllamaModels] = useState<OllamaModel[]>([]);
  const [ollamaReachable, setOllamaReachable] = useState(true);

  useEffect(() => {
    fetch("/api/providers/ollama/models")
      .then((r) => {
        if (!r.ok) { setOllamaReachable(false); return null; }
        return r.json();
      })
      .then((data) => {
        if (data?.models) setOllamaModels(data.models);
      })
      .catch(() => setOllamaReachable(false));
  }, []);

  return (
    <div className="relative">
      <button
        onClick={() => setOpen((v) => !v)}
        className={cn(
          "flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs",
          "text-text-secondary hover:text-text-primary hover:bg-surface-elevated",
          "transition-colors border border-transparent hover:border-border"
        )}
        aria-label="Select model"
      >
        <span className="font-medium text-text-primary">{activeModel}</span>
        <span className="text-text-secondary">/</span>
        <span>Ollama</span>
        <ChevronDownIcon
          className={cn("transition-transform duration-200", open && "rotate-180")}
        />
      </button>

      {open && (
        <>
          {/* Backdrop */}
          <div className="fixed inset-0 z-10" onClick={() => setOpen(false)} />
          {/* Dropdown */}
          <div className="absolute bottom-full mb-2 left-0 z-20 w-64 bg-surface-elevated border border-border rounded-xl shadow-xl overflow-hidden">
            <div className="px-3 py-2 text-xs font-medium text-text-secondary uppercase tracking-wider border-b border-border/50 flex items-center gap-2">
              Ollama
              {!ollamaReachable && (
                <span className="text-zinc-500">(unreachable)</span>
              )}
            </div>
            {ollamaModels.length === 0 && (
              <p className="px-3 py-3 text-xs text-text-secondary">
                {ollamaReachable ? "No models found." : "Start Ollama to load models."}
              </p>
            )}
            {ollamaModels.map((model) => (
              <button
                key={model.name}
                onClick={() => {
                  setModel(model.name);
                  setProvider("ollama");
                  setOpen(false);
                }}
                className={cn(
                  "w-full text-left px-3 py-2 text-sm transition-colors",
                  activeModel === model.name && activeProvider === "ollama"
                    ? "bg-accent/20 text-accent"
                    : "text-text-secondary hover:bg-surface hover:text-text-primary"
                )}
              >
                {model.name}
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
