import { cn } from "@/modules/shared/utils/cn";
import type { Conversation } from "@/modules/conversations/types";

interface ConversationItemProps {
  conversation: Conversation;
  isActive: boolean;
  onClick: () => void;
}

function formatRelativeTime(isoDate: string): string {
  const date = new Date(isoDate);
  const hours = date.getUTCHours().toString().padStart(2, "0");
  const minutes = date.getUTCMinutes().toString().padStart(2, "0");
  return `${hours}:${minutes}`;
}

export function ConversationItem({
  conversation,
  isActive,
  onClick,
}: ConversationItemProps) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "w-full text-left px-3 py-2.5 rounded-lg transition-colors group",
        isActive
          ? "bg-surface-elevated text-text-primary"
          : "text-text-secondary hover:bg-surface hover:text-text-primary"
      )}
    >
      <div className="flex items-start justify-between gap-2 min-w-0">
        <span className="text-sm font-medium truncate leading-snug">
          {conversation.title}
        </span>
        <span className="text-xs text-text-secondary shrink-0 mt-0.5">
          {formatRelativeTime(conversation.updatedAt)}
        </span>
      </div>
      <p className="text-xs text-text-secondary truncate mt-0.5 leading-relaxed">
        {conversation.preview}
      </p>
    </button>
  );
}
