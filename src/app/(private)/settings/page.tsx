import { ChatHeader } from "@/modules/chat/components/ChatHeader";
import { SettingsSection } from "@/modules/settings/components/SettingsSection";
import { SettingsToggle } from "@/modules/settings/components/SettingsToggle";
import { DefaultModelPicker } from "@/modules/settings/components/DefaultModelPicker";
import { ProvidersList } from "@/modules/settings/components/ProvidersList";

export default function SettingsPage() {
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
              defaultChecked
              settingKey="saveHistory"
            />
            <SettingsToggle
              label="Send usage statistics"
              description="Help improve the app (no prompts are shared)"
              settingKey="usageStats"
            />
          </SettingsSection>

          <SettingsSection title="Interface">
            <SettingsToggle
              label="Dark mode"
              defaultChecked
              settingKey="darkMode"
            />
            <SettingsToggle
              label="Compact message layout"
              description="Use a denser layout for messages"
              settingKey="compactLayout"
            />
          </SettingsSection>

          <ProvidersList />
        </div>
      </main>
    </div>
  );
}
