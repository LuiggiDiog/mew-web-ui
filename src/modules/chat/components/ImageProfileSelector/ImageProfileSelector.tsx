"use client";

import { useEffect, useState } from "react";
import { useChatStore } from "@/modules/chat/store/chatStore";
import { cn } from "@/modules/shared/utils/cn";
import { ChevronDownIcon } from "@/modules/shared/components/icons";

interface ProfileOption {
  id: string;
  name: string;
  isDefault: boolean;
}

export function ImageProfileSelector() {
  const { activeImageProfileId, activeImageProfileName, setActiveImageProfile } = useChatStore();
  const [profiles, setProfiles] = useState<ProfileOption[]>([]);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    fetch("/api/comfyui-profiles")
      .then((r) => r.json())
      .then((data) => {
        if (!data.profiles) return;
        const list: ProfileOption[] = data.profiles;
        setProfiles(list);

        // Auto-select default profile if nothing is selected yet
        if (!activeImageProfileId) {
          const def = list.find((p) => p.isDefault) ?? list[0];
          if (def) setActiveImageProfile(def.id, def.name);
        }
      })
      .catch(() => {});
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (profiles.length <= 1) {
    // Nothing to choose — just show the name
    return (
      <span className="text-xs text-text-secondary">
        {activeImageProfileName ?? profiles[0]?.name ?? "ComfyUI"}
      </span>
    );
  }

  const displayName = activeImageProfileName ?? profiles.find((p) => p.isDefault)?.name ?? "ComfyUI";

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className={cn(
          "inline-flex items-center gap-1 text-xs rounded-md px-2 py-0.5 transition-colors outline-none",
          open
            ? "bg-surface-elevated text-text-primary"
            : "text-text-secondary hover:text-text-primary hover:bg-surface-elevated"
        )}
      >
        {displayName}
        <ChevronDownIcon className={cn("w-3 h-3 transition-transform", open && "rotate-180")} />
      </button>

      {open && (
        <>
          {/* Backdrop */}
          <div className="fixed inset-0 z-10" onClick={() => setOpen(false)} />

          {/* Dropdown */}
          <div className="absolute bottom-full mb-1 left-0 z-20 min-w-40 rounded-xl border border-border bg-surface shadow-lg overflow-hidden">
            {profiles.map((p) => (
              <button
                key={p.id}
                type="button"
                onClick={() => {
                  setActiveImageProfile(p.id, p.name);
                  setOpen(false);
                }}
                className={cn(
                  "w-full text-left px-3 py-2 text-sm transition-colors outline-none",
                  p.id === activeImageProfileId
                    ? "text-accent bg-accent/10"
                    : "text-text-primary hover:bg-surface-elevated"
                )}
              >
                {p.name}
                {p.isDefault && (
                  <span className="ml-1.5 text-xs text-text-secondary">(default)</span>
                )}
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
