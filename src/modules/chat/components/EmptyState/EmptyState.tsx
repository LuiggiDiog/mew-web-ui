"use client";

import { QuickActions } from "@/modules/chat/components/QuickActions";
import { getWelcomeMessageByHour } from "@/modules/chat/mocks/welcomeMessages";

interface EmptyStateProps {
  welcomeSeed?: number;
}

export function EmptyState({ welcomeSeed = 0 }: EmptyStateProps) {
  const welcome = getWelcomeMessageByHour(new Date().getHours(), welcomeSeed);

  return (
    <div className="flex flex-col items-center gap-6 text-center px-4 py-12 max-w-md w-full">
      <div className="space-y-2">
        <h2 className="text-xl font-medium text-text-primary">{welcome.title}</h2>
        <p className="text-text-secondary text-sm leading-relaxed">{welcome.subtitle}</p>
      </div>

      <QuickActions />
    </div>
  );
}
