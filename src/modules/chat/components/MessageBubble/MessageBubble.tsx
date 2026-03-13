import { useState, useCallback } from "react";
import { cn } from "@/modules/shared/utils/cn";
import { Avatar } from "@/modules/shared/components/Avatar";
import { Badge } from "@/modules/shared/components/Badge";
import { EditableChatMessage } from "@/modules/chat/components/EditableChatMessage";
import { RefreshIcon, EditIcon } from "@/modules/shared/components/icons";
import { ImageGeneratingPlaceholder } from "@/modules/chat/components/ImageGeneratingPlaceholder";
import { ImageLightbox } from "@/modules/chat/components/ImageLightbox";
import { useChatStore } from "@/modules/chat/store/chatStore";
import type { Message } from "@/modules/chat/types";

interface PreviewParams {
  seed: number;
  fullWidth: number;
  fullHeight: number;
}

interface ReferenceContent {
  referenceUrl: string;
  text: string;
}

function parseReferenceContent(content: string): ReferenceContent | null {
  if (!content.startsWith("[[ref:")) return null;
  const endIdx = content.indexOf("]]");
  if (endIdx === -1) return null;
  return {
    referenceUrl: content.slice(6, endIdx),
    text: content.slice(endIdx + 2).trim(),
  };
}

function parsePreviewParams(url: string): PreviewParams | null {
  try {
    const params = new URL(url, "http://x").searchParams;
    const s = params.get("s");
    const fw = params.get("fw");
    const fh = params.get("fh");
    if (s && fw && fh) {
      return { seed: Number(s), fullWidth: Number(fw), fullHeight: Number(fh) };
    }
  } catch {
    // ignore
  }
  return null;
}

interface MessageBubbleProps {
  message: Message;
  showRegenerateAction?: boolean;
  showEditAction?: boolean;
  onRegenerate?: () => void;
  onEdit?: (messageId: string, content: string) => void;
  onUpscale?: (seed: number, fullWidth: number, fullHeight: number) => void;
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
  onUpscale,
  actionsDisabled = false,
}: MessageBubbleProps) {
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const isUser = message.role === "user";
  const isThinking = !isUser && message.content.trim().length === 0;
  const isImageMessage = message.type === "image";

  const handleUseAsReference = useCallback(async () => {
    if (!isImageMessage || !message.content) return;
    try {
      const res = await fetch(message.content);
      const blob = await res.blob();
      const reader = new FileReader();
      reader.onload = () => {
        const dataUrl = reader.result as string;
        const store = useChatStore.getState();
        store.setReferenceImage(dataUrl, "Generated image");
        if (!store.imageMode) {
          store.toggleImageMode();
        }
      };
      reader.readAsDataURL(blob);
    } catch {
      // ignore fetch errors
    }
  }, [isImageMessage, message.content]);

  const refContent = isUser ? parseReferenceContent(message.content) : null;

  if (isUser) {
    return (
      <EditableChatMessage
        messageId={message.id}
        content={refContent ? refContent.text : message.content}
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
              {/* Reference image thumbnail */}
              {refContent && !isEditing && (
                <div className="rounded-2xl rounded-tr-sm overflow-hidden">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={refContent.referenceUrl}
                    alt="Reference image"
                    className="max-w-48 max-h-48 object-cover rounded-2xl rounded-tr-sm"
                    loading="lazy"
                  />
                </div>
              )}
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
    <div className={cn("flex gap-2.5 max-w-[85%]", "mr-auto")}>
      <Avatar
        name="AI"
        role="assistant"
        size="sm"
        className="mt-1 shrink-0"
      />

      <div className={cn("flex flex-col gap-1", "items-start")}>
        <div
          className={cn(
            "text-sm leading-relaxed",
            isImageMessage && message.content
              ? "p-0 bg-transparent border-transparent"
              : isImageMessage && isThinking
                ? "p-0 bg-transparent border-transparent"
                : "px-4 py-2.5 whitespace-pre-wrap bg-surface text-text-primary rounded-2xl border border-border/50 rounded-tl-sm",
          )}
        >
          {isImageMessage && message.content ? (
            <>
              <button
                type="button"
                onClick={() => setLightboxOpen(true)}
                className="cursor-zoom-in relative block outline-none"
                aria-label="View full image"
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={message.content}
                  alt="Generated image"
                  className="rounded-2xl max-w-full"
                  loading="lazy"
                />
              </button>
              <div className="flex items-center gap-3 mt-1.5">
                {(() => {
                  const preview = parsePreviewParams(message.content);
                  return preview && onUpscale ? (
                    <button
                      type="button"
                      onClick={() => onUpscale(preview.seed, preview.fullWidth, preview.fullHeight)}
                      className="inline-flex items-center gap-1 text-xs text-amber-400 hover:text-amber-300 transition-colors outline-none"
                      title={`Generate full-size ${preview.fullWidth}×${preview.fullHeight} version`}
                    >
                      ↑ Full size ({preview.fullWidth}×{preview.fullHeight})
                    </button>
                  ) : null;
                })()}
                <button
                  type="button"
                  onClick={handleUseAsReference}
                  disabled={actionsDisabled}
                  className="inline-flex items-center gap-1 text-xs text-accent hover:text-accent/80 transition-colors outline-none disabled:opacity-40 disabled:cursor-not-allowed"
                  title="Use this image as reference for img2img"
                >
                  <EditIcon className="w-3 h-3" />
                  Edit
                </button>
              </div>
              {lightboxOpen && (
                <ImageLightbox
                  src={message.content}
                  onClose={() => setLightboxOpen(false)}
                />
              )}
            </>
          ) : isImageMessage && isThinking ? (
            <ImageGeneratingPlaceholder />
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
