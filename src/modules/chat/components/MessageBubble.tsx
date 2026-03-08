import { cn } from "@/modules/shared/utils/cn";
import { Avatar } from "@/modules/shared/components/Avatar";
import { Badge } from "@/modules/shared/components/Badge";
import { RefreshIcon } from "@/modules/shared/components/icons";
import type { Message } from "@/modules/chat/types";

interface MessageBubbleProps {
  message: Message;
  showActions?: boolean;
  onRegenerate?: () => void;
  actionsDisabled?: boolean;
}

function formatTime(isoDate: string): string {
  const date = new Date(isoDate);
  const hours = date.getHours().toString().padStart(2, "0");
  const minutes = date.getMinutes().toString().padStart(2, "0");
  return `${hours}:${minutes}`;
}

export function MessageBubble({
  message,
  showActions = false,
  onRegenerate,
  actionsDisabled = false,
}: MessageBubbleProps) {
  const isUser = message.role === "user";
  const isThinking = !isUser && message.content.trim().length === 0;

  return (
    <div
      className={cn(
        "flex gap-2.5 max-w-[85%]",
        isUser ? "ml-auto flex-row-reverse" : "mr-auto",
      )}
    >
      <Avatar
        name={isUser ? "You" : "AI"}
        role={isUser ? "user" : "assistant"}
        size="sm"
        className="mt-1 shrink-0"
      />

      <div
        className={cn(
          "flex flex-col gap-1",
          isUser ? "items-end" : "items-start",
        )}
      >
        <div
          className={cn(
            "px-4 py-2.5 text-sm leading-relaxed whitespace-pre-wrap",
            isUser
              ? "bg-accent text-white rounded-2xl rounded-tr-sm"
              : "bg-surface text-text-primary rounded-2xl rounded-tl-sm border border-border/50",
          )}
        >
          {isThinking ? (
            <div
              className="inline-flex items-center gap-1.5 py-0.5"
              role="status"
              aria-live="polite"
              aria-label="Assistant is thinking"
            >
              <span
                data-thinking-dot="true"
                className="h-1 w-1 rounded-full bg-text-secondary/80 animate-pulse"
                style={{ animationDelay: "0ms" }}
              />
              <span
                data-thinking-dot="true"
                className="h-1 w-1 rounded-full bg-text-secondary/80 animate-pulse"
                style={{ animationDelay: "180ms" }}
              />
              <span
                data-thinking-dot="true"
                className="h-1 w-1 rounded-full bg-text-secondary/80 animate-pulse"
                style={{ animationDelay: "360ms" }}
              />
            </div>
          ) : (
            message.content
          )}
        </div>

        <div className="flex max-w-full min-w-0 items-center gap-2 whitespace-nowrap px-1">
          <span className="text-xs text-text-secondary">
            {formatTime(message.createdAt)}
          </span>
          {!isUser && message.model && (
            <Badge
              variant="default"
              className="min-w-0 max-w-44 text-[10px] pl-1.5 pr-2.5 py-0 sm:max-w-52"
            >
              <span className="block min-w-0 overflow-hidden text-ellipsis whitespace-nowrap">
                {message.model}
              </span>
            </Badge>
          )}
          {showActions && !isUser && onRegenerate && (
            <button
              onClick={onRegenerate}
              disabled={actionsDisabled}
              className="p-1 rounded-md text-text-secondary hover:text-text-primary hover:bg-surface-elevated transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
              aria-label="Regenerate response"
            >
              <RefreshIcon className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
