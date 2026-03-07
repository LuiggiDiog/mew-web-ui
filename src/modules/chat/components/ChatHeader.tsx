"use client";

import Link from "next/link";
import { cn } from "@/modules/shared/utils/cn";
import {
  MenuIcon,
  ArrowLeftIcon,
  SettingsIcon,
} from "@/modules/shared/components/icons";
import { useChatStore } from "@/modules/chat/store/chatStore";
import { APP_NAME } from "@/modules/shared/constants";

interface ChatHeaderProps {
  title?: string;
  showBack?: boolean;
}

export function ChatHeader({ title, showBack = false }: ChatHeaderProps) {
  const { toggleDrawer } = useChatStore();

  return (
    <header
      className={cn(
        "sticky top-0 z-10 flex items-center justify-between h-14 px-4",
        "bg-background/80 backdrop-blur-sm border-b border-border/50",
        "shrink-0"
      )}
    >
      {/* Left side */}
      <div className="flex items-center gap-2">
        {showBack ? (
          <Link
            href="/chat"
            className="p-2 -ml-2 rounded-lg text-text-secondary hover:text-text-primary hover:bg-surface-elevated transition-colors"
            aria-label="Back to chat"
          >
            <ArrowLeftIcon />
          </Link>
        ) : (
          <button
            onClick={toggleDrawer}
            className="p-2 -ml-2 rounded-lg text-text-secondary hover:text-text-primary hover:bg-surface-elevated transition-colors"
            aria-label="Toggle sidebar"
          >
            <MenuIcon />
          </button>
        )}

        <span className="text-sm font-medium text-text-primary truncate max-w-[200px]">
          {title ?? APP_NAME}
        </span>
      </div>

      {/* Right side */}
      <Link
        href="/settings"
        className="p-2 -mr-2 rounded-lg text-text-secondary hover:text-text-primary hover:bg-surface-elevated transition-colors"
        aria-label="Settings"
      >
        <SettingsIcon />
      </Link>
    </header>
  );
}
