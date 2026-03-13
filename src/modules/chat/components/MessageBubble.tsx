import { cn } from "@/modules/shared/utils/cn";
import { Avatar } from "@/modules/shared/components/Avatar";
import { Badge } from "@/modules/shared/components/Badge";
import { EditableChatMessage } from "@/modules/chat/components/EditableChatMessage";
import { RefreshIcon } from "@/modules/shared/components/icons";
import type { Message } from "@/modules/chat/types";

interface MessageBubbleProps {
  message: Message;
  showRegenerateAction?: boolean;
  showEditAction?: boolean;
  onRegenerate?: () => void;
  onEdit?: (messageId: string, content: string) => void;
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
  showRegenerateAction = false,
  showEditAction = false,
  onRegenerate,
  onEdit,
  actionsDisabled = false,
}: MessageBubbleProps) {
  const isUser = message.role === "user";
  const isThinking = !isUser && message.content.trim().length === 0;

  if (isUser) {
    return (
      <EditableChatMessage
        messageId={message.id}
        content={message.content}
        showEditAction={showEditAction}
        actionsDisabled={actionsDisabled}
        onEdit={onEdit}
      >
        {({ isEditing, contentNode, editActionNode }) => (
          <div className="flex gap-2.5 max-w-[85%] ml-auto flex-row-reverse">
            <Avatar
              name="You"
              role="user"
              size="sm"
              className="mt-1 shrink-0"
            />
            <div className="flex flex-col gap-1 items-end">
              <div
                className={cn(
                  "px-4 py-2.5 text-sm leading-relaxed whitespace-pre-wrap",
                  !isEditing
                    ? "bg-accent text-white rounded-2xl rounded-tr-sm"
                    : "rounded-tr-sm bg-transparent border-transparent p-0",
                )}
              >
                {contentNode}
              </div>
              <div className="flex max-w-full min-w-0 items-center gap-2 whitespace-nowrap px-1">
                <span className="text-xs text-text-secondary">
                  {formatTime(message.createdAt)}
                </span>
                {editActionNode}
              </div>
            </div>
          </div>
        )}
      </EditableChatMessage>
    );
  }

  return (
    <div
      className={cn(
        "flex gap-2.5 max-w-[85%]",
        "mr-auto",
      )}
    >
      <Avatar
        name="AI"
        role="assistant"
        size="sm"
        className="mt-1 shrink-0"
      />

      <div
        className={cn(
          "flex flex-col gap-1",
          "items-start",
        )}
      >
        <div
          className={cn(
            "text-sm leading-relaxed",
            message.type === "image" && message.content
              ? "p-0 bg-transparent border-transparent"
              : "px-4 py-2.5 whitespace-pre-wrap bg-surface text-text-primary rounded-2xl border border-border/50 rounded-tl-sm",
          )}
        >
          {message.type === "image" && message.content ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={message.content}
              alt="Generated image"
              className="rounded-2xl max-w-full"
              loading="lazy"
            />
          ) : isThinking ? (
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
          {message.model && (
            <Badge
              variant="default"
              className="min-w-0 max-w-44 text-[10px] pl-1.5 pr-2.5 py-0 sm:max-w-52"
            >
              <span className="block min-w-0 overflow-hidden text-ellipsis whitespace-nowrap">
                {message.model}
              </span>
            </Badge>
          )}
          {showRegenerateAction && onRegenerate && (
            <button
              type="button"
              onClick={onRegenerate}
              disabled={actionsDisabled}
              className="inline-flex h-6 w-6 items-center justify-center rounded-md border border-transparent text-text-secondary transition-colors hover:border-border/60 hover:bg-surface-elevated hover:text-text-primary disabled:opacity-40 disabled:cursor-not-allowed"
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
