"use client";

import { useRouter } from "next/navigation";
import { cn } from "@/modules/shared/utils/cn";
import { PlusIcon, XIcon } from "@/modules/shared/components/icons";
import { useChatStore } from "@/modules/chat/store/chatStore";
import { useMediaQuery } from "@/modules/shared/hooks/useMediaQuery";
import { ConversationItem } from "@/modules/conversations/components/ConversationItem";
import {
  MOCK_CONVERSATIONS,
  groupConversationsByDate,
} from "@/modules/conversations/mocks";
import { APP_NAME } from "@/modules/shared/constants";

const DATE_GROUP_ORDER = ["Today", "Yesterday", "Last week"];

export function ConversationDrawer() {
  const router = useRouter();
  const {
    drawerOpen,
    closeDrawer,
    selectedConversationId,
    selectConversation,
  } = useChatStore();

  const isDesktop = useMediaQuery("(min-width: 768px)");
  const isVisible = isDesktop || drawerOpen;

  const groups = groupConversationsByDate(MOCK_CONVERSATIONS);

  const handleSelectConversation = (id: string) => {
    selectConversation(id);
    router.push(`/chat/${id}`);
    if (!isDesktop) closeDrawer();
  };

  const handleNewChat = () => {
    selectConversation(null);
    router.push("/chat");
    if (!isDesktop) closeDrawer();
  };

  return (
    <>
      {/* Mobile backdrop */}
      {!isDesktop && drawerOpen && (
        <div
          className="fixed inset-0 z-20 bg-black/60 backdrop-blur-sm"
          onClick={closeDrawer}
          aria-hidden="true"
        />
      )}

      {/* Drawer / Sidebar */}
      <aside
        className={cn(
          "flex flex-col bg-surface border-r border-border shrink-0 overflow-hidden",
          // Mobile: fixed overlay
          "fixed top-0 left-0 h-full z-30 w-72",
          "transition-transform duration-300 ease-in-out",
          !isDesktop && !drawerOpen && "-translate-x-full",
          !isDesktop && drawerOpen && "translate-x-0",
          // Desktop: static sidebar
          "md:relative md:translate-x-0 md:w-64 md:z-auto"
        )}
        aria-label="Conversations"
      >
        {/* Drawer header */}
        <div className="flex items-center justify-between px-4 h-14 border-b border-border/50 shrink-0">
          <span className="text-sm font-semibold text-text-primary">{APP_NAME}</span>
          {!isDesktop && (
            <button
              onClick={closeDrawer}
              className="p-1.5 rounded-lg text-text-secondary hover:text-text-primary hover:bg-surface-elevated transition-colors"
              aria-label="Close sidebar"
            >
              <XIcon />
            </button>
          )}
        </div>

        {/* New Chat button */}
        <div className="px-3 pt-3 pb-2 shrink-0">
          <button
            onClick={handleNewChat}
            className={cn(
              "w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm",
              "text-text-secondary hover:text-text-primary hover:bg-surface-elevated",
              "border border-border/50 hover:border-border",
              "transition-colors"
            )}
          >
            <PlusIcon />
            <span>New chat</span>
          </button>
        </div>

        {/* Conversation list */}
        <div className="flex-1 overflow-y-auto px-3 pb-4 space-y-4">
          {DATE_GROUP_ORDER.map((label) => {
            const convs = groups[label];
            if (!convs?.length) return null;
            return (
              <div key={label}>
                <p className="px-2 pb-1 pt-2 text-xs font-medium text-text-secondary uppercase tracking-wider">
                  {label}
                </p>
                <div className="space-y-0.5">
                  {convs.map((conv) => (
                    <ConversationItem
                      key={conv.id}
                      conversation={conv}
                      isActive={selectedConversationId === conv.id}
                      onClick={() => handleSelectConversation(conv.id)}
                    />
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      </aside>
    </>
  );
}
