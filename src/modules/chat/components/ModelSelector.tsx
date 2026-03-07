"use client";

import { useState } from "react";
import { cn } from "@/modules/shared/utils/cn";
import { ChevronDownIcon } from "@/modules/shared/components/icons";
import { useChatStore } from "@/modules/chat/store/chatStore";
import { MOCK_PROVIDERS, getModelsForProvider } from "@/modules/providers/mocks";

export function ModelSelector() {
  const { activeModel, activeProvider, setModel, setProvider } = useChatStore();
  const [open, setOpen] = useState(false);

  const currentProvider = MOCK_PROVIDERS.find((p) => p.id === activeProvider);
  const providerModels = getModelsForProvider(activeProvider);

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
        <span>{currentProvider?.name ?? activeProvider}</span>
        <ChevronDownIcon
          className={cn("transition-transform duration-200", open && "rotate-180")}
        />
      </button>

      {open && (
        <>
          {/* Backdrop */}
          <div
            className="fixed inset-0 z-10"
            onClick={() => setOpen(false)}
          />
          {/* Dropdown */}
          <div className="absolute bottom-full mb-2 left-0 z-20 w-64 bg-surface-elevated border border-border rounded-xl shadow-xl overflow-hidden">
            {MOCK_PROVIDERS.map((provider) => (
              <div key={provider.id}>
                <div className="px-3 py-2 text-xs font-medium text-text-secondary uppercase tracking-wider border-b border-border/50">
                  {provider.name}
                  {!provider.isActive && (
                    <span className="ml-2 text-zinc-600">(inactive)</span>
                  )}
                </div>
                {getModelsForProvider(provider.id).map((model) => (
                  <button
                    key={model.id}
                    onClick={() => {
                      setModel(model.id);
                      setProvider(provider.id);
                      setOpen(false);
                    }}
                    className={cn(
                      "w-full text-left px-3 py-2 text-sm transition-colors",
                      activeModel === model.id && activeProvider === provider.id
                        ? "bg-accent/20 text-accent"
                        : "text-text-secondary hover:bg-surface hover:text-text-primary",
                      !provider.isActive && "opacity-50"
                    )}
                    disabled={!provider.isActive}
                  >
                    {model.name}
                  </button>
                ))}
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
