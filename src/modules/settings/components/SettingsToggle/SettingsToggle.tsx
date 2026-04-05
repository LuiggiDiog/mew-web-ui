"use client";

import { useState } from "react";
import { cn } from "@/modules/shared/utils/cn";

interface SettingsToggleProps {
  label: string;
  description?: string;
  defaultChecked?: boolean;
  settingKey?: string;
}

export function SettingsToggle({
  label,
  description,
  defaultChecked = false,
  settingKey,
}: SettingsToggleProps) {
  const [enabled, setEnabled] = useState(defaultChecked);

  return (
    <div className="flex items-center justify-between px-4 py-3.5 gap-4">
      <div className="min-w-0">
        <p className="text-sm text-text-primary">{label}</p>
        {description && (
          <p className="text-xs text-text-secondary mt-0.5">{description}</p>
        )}
      </div>

      <button
        role="switch"
        aria-checked={enabled}
        onClick={() => {
          const next = !enabled;
          setEnabled(next);
          if (settingKey) {
            fetch("/api/settings", {
              method: "PATCH",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ [settingKey]: String(next) }),
            }).catch(() => {});
          }
        }}
        className={cn(
          "relative inline-flex h-5 w-9 shrink-0 rounded-full transition-colors duration-200",
          enabled ? "bg-accent" : "bg-zinc-700"
        )}
      >
        <span
          className={cn(
            "absolute top-0.5 left-0.5 inline-block h-4 w-4 rounded-full bg-white shadow-sm",
            "transition-transform duration-200",
            enabled ? "translate-x-4" : "translate-x-0"
          )}
        />
      </button>
    </div>
  );
}
