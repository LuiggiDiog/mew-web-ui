import { SettingsSection } from "@/modules/settings/components/SettingsSection";
import { ProviderBadge } from "@/modules/providers/components/ProviderBadge";
import { MOCK_PROVIDERS } from "@/modules/providers/mocks";

export function ProvidersList() {
  return (
    <SettingsSection
      title="Providers"
      description="Configure AI providers. Local providers run on your machine."
    >
      {MOCK_PROVIDERS.map((provider) => (
        <div
          key={provider.id}
          className="flex items-center justify-between px-4 py-3.5 gap-4"
        >
          <div className="min-w-0">
            <p className="text-sm font-medium text-text-primary">{provider.name}</p>
            {provider.baseUrl && (
              <p className="text-xs text-text-secondary mt-0.5 truncate">
                {provider.baseUrl}
              </p>
            )}
            {!provider.baseUrl && (
              <p className="text-xs text-text-secondary mt-0.5">
                API key required
              </p>
            )}
          </div>
          <ProviderBadge provider={provider} />
        </div>
      ))}
    </SettingsSection>
  );
}
