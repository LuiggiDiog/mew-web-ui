"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { cn } from "@/modules/shared/utils/cn";
import { PlusIcon, XIcon } from "@/modules/shared/components/icons";
import { useChatStore } from "@/modules/chat/store/chatStore";
import { useMediaQuery } from "@/modules/shared/hooks/useMediaQuery";
import { ConversationItem } from "@/modules/conversations/components/ConversationItem";
import { groupConversationsByDate } from "@/modules/conversations/mocks";
import { APP_NAME } from "@/modules/shared/constants";
import type { Conversation } from "@/modules/conversations/types";

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

  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<{ displayName: string; email: string } | null>(null);

  useEffect(() => {
    fetch("/api/conversations")
      .then((r) => r.json())
      .then((data) => { if (data.conversations) setConversations(data.conversations); })
      .catch(() => {})
      .finally(() => setLoading(false));

    fetch("/api/auth/me")
      .then((r) => r.json())
      .then((data) => { if (data.user) setUser(data.user); })
      .catch(() => {});
  }, []);

  const handleLogout = async () => {
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/login");
  };

  const groups = groupConversationsByDate(conversations);
  const groupLabels = [
    ...DATE_GROUP_ORDER.filter((l) => groups[l]),
    ...Object.keys(groups).filter((l) => !DATE_GROUP_ORDER.includes(l)).sort(),
  ];

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
          {loading && (
            <div className="space-y-2 pt-2">
              {[1, 2, 3].map((i) => (
                <div key={i} className="h-9 rounded-lg bg-surface-elevated animate-pulse" />
              ))}
            </div>
          )}

          {!loading && groupLabels.length === 0 && (
            <p className="px-2 pt-4 text-xs text-text-secondary">No conversations yet.</p>
          )}

          {!loading && groupLabels.map((label) => {
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

        {/* User footer */}
        {user && (
          <div className="shrink-0 border-t border-border/50 px-3 py-3">
            <div className="flex items-center gap-3">
              {/* Avatar */}
              <div className="w-7 h-7 rounded-full bg-accent/20 flex items-center justify-center shrink-0">
                <span className="text-xs font-semibold text-accent">
                  {user.displayName.charAt(0).toUpperCase()}
                </span>
              </div>
              {/* Name + email */}
              <div className="flex-1 min-w-0">
                <p className="text-xs font-medium text-text-primary truncate">{user.displayName}</p>
                <p className="text-xs text-text-secondary truncate">{user.email}</p>
              </div>
              {/* Logout */}
              <button
                onClick={handleLogout}
                title="Sign out"
                className="p-1.5 rounded-lg text-text-secondary hover:text-error hover:bg-error/10 transition-colors shrink-0"
                aria-label="Sign out"
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
                  <polyline points="16 17 21 12 16 7" />
                  <line x1="21" y1="12" x2="9" y2="12" />
                </svg>
              </button>
            </div>
          </div>
        )}
      </aside>
    </>
  );
}
