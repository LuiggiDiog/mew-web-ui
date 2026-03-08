import * as AlertDialog from "@radix-ui/react-alert-dialog";
import * as ContextMenu from "@radix-ui/react-context-menu";
import { useState } from "react";
import { cn } from "@/modules/shared/utils/cn";
import type { Conversation } from "@/modules/conversations/types";

interface ConversationItemProps {
  conversation: Conversation;
  isActive: boolean;
  onClick: () => void;
  onDelete: (id: string) => void;
}

function formatRelativeTime(isoDate: string): string {
  const date = new Date(isoDate);
  const hours = date.getHours().toString().padStart(2, "0");
  const minutes = date.getMinutes().toString().padStart(2, "0");
  return `${hours}:${minutes}`;
}

export function ConversationItem({
  conversation,
  isActive,
  onClick,
  onDelete,
}: ConversationItemProps) {
  const [confirmOpen, setConfirmOpen] = useState(false);

  return (
    <AlertDialog.Root open={confirmOpen} onOpenChange={setConfirmOpen}>
      <ContextMenu.Root>
        <ContextMenu.Trigger asChild>
          <button
            onClick={onClick}
            aria-label={`Open conversation ${conversation.title}`}
            className={cn(
              "w-full min-w-0 text-left px-3 py-2.5 rounded-lg transition-colors group",
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
        </ContextMenu.Trigger>

        <ContextMenu.Portal>
          <ContextMenu.Content
            className="z-40 min-w-40 rounded-lg border border-border bg-surface-elevated p-1 shadow-lg"
            sideOffset={8}
          >
            <ContextMenu.Item
              onSelect={() => setConfirmOpen(true)}
              className="rounded-md px-2.5 py-2 text-sm text-error outline-none cursor-default data-[highlighted]:bg-error/10"
            >
              Delete chat
            </ContextMenu.Item>
          </ContextMenu.Content>
        </ContextMenu.Portal>
      </ContextMenu.Root>

      <AlertDialog.Portal>
        <AlertDialog.Overlay className="fixed inset-0 z-40 bg-black/70 backdrop-blur-sm" />
        <AlertDialog.Content className="fixed z-50 left-1/2 top-1/2 w-[92vw] max-w-sm -translate-x-1/2 -translate-y-1/2 rounded-xl border border-border bg-surface-elevated p-4 shadow-lg">
          <AlertDialog.Title className="text-sm font-semibold text-text-primary">
            Delete chat?
          </AlertDialog.Title>
          <AlertDialog.Description className="mt-2 text-xs text-text-secondary">
            This will permanently remove this conversation and all its messages.
          </AlertDialog.Description>
          <div className="mt-4 flex justify-end gap-2">
            <AlertDialog.Cancel asChild>
              <button className="rounded-md border border-border px-3 py-1.5 text-xs text-text-secondary hover:text-text-primary hover:bg-surface transition-colors">
                Cancel
              </button>
            </AlertDialog.Cancel>
            <AlertDialog.Action asChild>
              <button
                onClick={() => onDelete(conversation.id)}
                className="rounded-md bg-error/90 px-3 py-1.5 text-xs font-medium text-white hover:bg-error transition-colors"
              >
                Delete
              </button>
            </AlertDialog.Action>
          </div>
        </AlertDialog.Content>
      </AlertDialog.Portal>
    </AlertDialog.Root>
  );
}
