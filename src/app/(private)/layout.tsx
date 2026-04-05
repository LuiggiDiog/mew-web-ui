import { redirect } from "next/navigation";
import { getSession } from "@/modules/auth/services/session";
import { findUserById } from "@/modules/auth/repositories/users-repository";
import { ConversationDrawer } from "@/modules/chat/components/ConversationDrawer";

// AppShell layout wraps all private routes (chat, settings)
export default async function AppShellLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await getSession();

  if (!session.userId) {
    redirect("/login");
  }

  const user = await findUserById(session.userId);
  if (!user) {
    redirect("/login?reauth=1");
  }

  return (
    <div className="flex h-dvh overflow-hidden bg-background">
      <ConversationDrawer />
      <div className="flex flex-1 flex-col min-w-0 overflow-hidden">
        {children}
      </div>
    </div>
  );
}
