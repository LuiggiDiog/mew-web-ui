"use client";

import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
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
  backMode?: "chat" | "history";
  showSettingsButton?: boolean;
}

export function ChatHeader({
  title,
  showBack = false,
  backMode = "chat",
  showSettingsButton = true,
}: ChatHeaderProps) {
  const { toggleDrawer } = useChatStore();
  const router = useRouter();

  const handleBack = () => {
    if (typeof window !== "undefined" && window.history.length > 1) {
      router.back();
      return;
    }

    router.push("/chat");
  };

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
          backMode === "history" ? (
            <button
              onClick={handleBack}
              className="p-2 -ml-2 rounded-lg text-text-secondary hover:text-text-primary hover:bg-surface-elevated transition-colors"
              aria-label="Back"
            >
              <ArrowLeftIcon />
            </button>
          ) : (
            <Link
              href="/chat"
              className="p-2 -ml-2 rounded-lg text-text-secondary hover:text-text-primary hover:bg-surface-elevated transition-colors"
              aria-label="Back to chat"
            >
              <ArrowLeftIcon />
            </Link>
          )
        ) : (
          <button
            onClick={toggleDrawer}
            className="p-2 -ml-2 rounded-lg text-text-secondary hover:text-text-primary hover:bg-surface-elevated transition-colors"
            aria-label="Toggle sidebar"
          >
            <MenuIcon />
          </button>
        )}

        <Image
          src="/isotype.svg"
          alt={`${APP_NAME} isotype`}
          width={20}
          height={20}
          className="h-5 w-5 shrink-0"
        />
        <span className="text-sm font-medium text-text-primary truncate max-w-[172px]">
          {title ?? APP_NAME}
        </span>
      </div>

      {/* Right side */}
      {showSettingsButton ? (
        <Link
          href="/settings"
          className="p-2 -mr-2 rounded-lg text-text-secondary hover:text-text-primary hover:bg-surface-elevated transition-colors"
          aria-label="Settings"
        >
          <SettingsIcon />
        </Link>
      ) : (
        <div className="w-9 h-9" aria-hidden />
      )}
    </header>
  );
}
