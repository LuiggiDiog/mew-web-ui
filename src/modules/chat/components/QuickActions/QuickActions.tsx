"use client";

import { QUICK_ACTIONS } from "@/modules/shared/constants";
import { cn } from "@/modules/shared/utils/cn";

interface QuickActionsProps {
  onSelect?: (prompt: string) => void;
}

export function QuickActions({ onSelect }: QuickActionsProps) {
  return (
    <div className="flex flex-wrap justify-center gap-2 max-w-sm">
      {QUICK_ACTIONS.map((action) => (
        <button
          key={action.id}
          onClick={() => onSelect?.(action.prompt)}
          className={cn(
            "px-4 py-2 rounded-full text-sm text-text-secondary",
            "border border-border hover:border-border/80",
            "hover:bg-surface hover:text-text-primary",
            "transition-colors"
          )}
        >
          {action.label}
        </button>
      ))}
    </div>
  );
}
