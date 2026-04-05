"use client";

import { useEffect, useState } from "react";
import { SettingsSection } from "@/modules/settings/components/SettingsSection";
import { Badge } from "@/modules/shared/components/Badge";

interface ProviderRow {
  id: string;
  name: string;
  type: string;
  baseUrl?: string | null;
  isActive: boolean;
  connected: boolean;
}

export function ProvidersList() {
  const [providers, setProviders] = useState<ProviderRow[]>([]);

  useEffect(() => {
    fetch("/api/providers")
      .then((r) => r.json())
      .then((data) => { if (data.providers) setProviders(data.providers); })
      .catch(() => {});
  }, []);

  return (
    <SettingsSection
      title="Providers"
      description="Configure AI providers. Local providers run on your machine."
    >
      {providers.length === 0 && (
        <p className="px-4 py-3 text-xs text-text-secondary">No providers configured.</p>
      )}
      {providers.map((provider) => (
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
              <p className="text-xs text-text-secondary mt-0.5">API key required</p>
            )}
          </div>
          <Badge variant={provider.connected ? "success" : provider.isActive ? "warning" : "default"}>
            {provider.connected ? "Active" : provider.isActive ? "Offline" : "Inactive"}
          </Badge>
        </div>
      ))}
    </SettingsSection>
  );
}
