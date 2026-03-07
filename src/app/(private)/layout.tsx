import { ConversationDrawer } from "@/modules/chat/components/ConversationDrawer";

// AppShell layout — wraps all private routes (chat, settings)
export default function AppShellLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex h-screen overflow-hidden bg-background">
      <ConversationDrawer />
      <div className="flex flex-1 flex-col min-w-0 overflow-hidden">
        {children}
      </div>
    </div>
  );
}
