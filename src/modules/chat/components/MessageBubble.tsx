import { cn } from "@/modules/shared/utils/cn";
import { Avatar } from "@/modules/shared/components/Avatar";
import { Badge } from "@/modules/shared/components/Badge";
import type { Message } from "@/modules/chat/types";

interface MessageBubbleProps {
  message: Message;
}

function formatTime(isoDate: string): string {
  const date = new Date(isoDate);
  const hours = date.getHours().toString().padStart(2, "0");
  const minutes = date.getMinutes().toString().padStart(2, "0");
  return `${hours}:${minutes}`;
}

export function MessageBubble({ message }: MessageBubbleProps) {
  const isUser = message.role === "user";

  return (
    <div
      className={cn(
        "flex gap-2.5 max-w-[85%]",
        isUser ? "ml-auto flex-row-reverse" : "mr-auto"
      )}
    >
      <Avatar
        name={isUser ? "You" : "AI"}
        role={isUser ? "user" : "assistant"}
        size="sm"
        className="mt-1 shrink-0"
      />

      <div className={cn("flex flex-col gap-1", isUser ? "items-end" : "items-start")}>
        <div
          className={cn(
            "px-4 py-2.5 text-sm leading-relaxed whitespace-pre-wrap",
            isUser
              ? "bg-accent text-white rounded-2xl rounded-tr-sm"
              : "bg-surface text-text-primary rounded-2xl rounded-tl-sm border border-border/50"
          )}
        >
          {message.content}
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
        </div>
      </div>
    </div>
  );
}
