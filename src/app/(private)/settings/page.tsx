import { ChatHeader } from "@/modules/chat/components/ChatHeader";
import { SettingsSection } from "@/modules/settings/components/SettingsSection";
import { SettingsToggle } from "@/modules/settings/components/SettingsToggle";
import { DefaultModelPicker } from "@/modules/settings/components/DefaultModelPicker";
import { ProvidersList } from "@/modules/settings/components/ProvidersList";
import { db } from "@/db";
import { settings } from "@/db/schema";
import { eq } from "drizzle-orm";
import { getSession } from "@/modules/auth/lib/session";

export default async function SettingsPage() {
  const session = await getSession();
  const rows = session.userId
    ? await db.select().from(settings).where(eq(settings.userId, session.userId))
    : [];
  const s = Object.fromEntries(rows.map((r) => [r.key, r.value]));
  const bool = (key: string, fallback = false) =>
    key in s ? s[key] === "true" : fallback;

  return (
    <div className="flex flex-col h-full">
      <ChatHeader title="Settings" showBack backMode="history" showSettingsButton={false} />
      <main className="flex-1 overflow-y-auto">
        <div className="max-w-2xl mx-auto px-4 py-6 space-y-4">

          <SettingsSection title="General">
            <DefaultModelPicker />
            <SettingsToggle
              label="Save conversation history"
              description="Store conversations locally on this device"
              defaultChecked={bool("saveHistory", true)}
              settingKey="saveHistory"
            />
            <SettingsToggle
              label="Send usage statistics"
              description="Help improve the app (no prompts are shared)"
              defaultChecked={bool("usageStats")}
              settingKey="usageStats"
            />
          </SettingsSection>

          <SettingsSection title="Interface">
            <SettingsToggle
              label="Dark mode"
              defaultChecked={bool("darkMode", true)}
              settingKey="darkMode"
            />
            <SettingsToggle
              label="Compact message layout"
              description="Use a denser layout for messages"
              defaultChecked={bool("compactLayout")}
              settingKey="compactLayout"
            />
          </SettingsSection>

          <SettingsSection title="Image Generation">
            <SettingsToggle
              label="Enhance image prompts"
              description="Use the default text model to expand your prompt before generating"
              defaultChecked={bool("enhancePrompt")}
              settingKey="enhancePrompt"
            />
          </SettingsSection>

          <ProvidersList />
        </div>
      </main>
    </div>
  );
}
