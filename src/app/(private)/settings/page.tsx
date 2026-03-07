import { ChatHeader } from "@/modules/chat/components/ChatHeader";
import { SettingsSection } from "@/modules/settings/components/SettingsSection";
import { SettingsToggle } from "@/modules/settings/components/SettingsToggle";
import { ProvidersList } from "@/modules/settings/components/ProvidersList";

export default function SettingsPage() {
  return (
    <div className="flex flex-col h-full">
      <ChatHeader title="Settings" />
      <main className="flex-1 overflow-y-auto">
        <div className="max-w-2xl mx-auto px-4 py-6 space-y-4">

          <SettingsSection title="General">
            <SettingsToggle
              label="Save conversation history"
              description="Store conversations locally on this device"
              defaultChecked
            />
            <SettingsToggle
              label="Send usage statistics"
              description="Help improve the app (no prompts are shared)"
            />
          </SettingsSection>

          <SettingsSection title="Interface">
            <SettingsToggle
              label="Dark mode"
              defaultChecked
            />
            <SettingsToggle
              label="Compact message layout"
              description="Use a denser layout for messages"
            />
          </SettingsSection>

          <ProvidersList />

          <p className="text-xs text-text-secondary text-center pb-4">
            Settings are visual only in Phase 1 — no persistence yet.
          </p>
        </div>
      </main>
    </div>
  );
}
