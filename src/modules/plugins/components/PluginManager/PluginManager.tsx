"use client";

import { useEffect, useState } from "react";
import { SettingsSection } from "@/modules/settings/components/SettingsSection";
import { Button } from "@/modules/shared/components/Button";
import { Badge } from "@/modules/shared/components/Badge";

interface PluginRecord {
  id: string;
  pluginId: string;
  name: string;
  version: string;
  githubUrl: string | null;
  kind: string;
  isBuiltIn: boolean;
  isActive: boolean;
}

export function PluginManager() {
  const [plugins, setPlugins] = useState<PluginRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [installUrl, setInstallUrl] = useState("");
  const [installing, setInstalling] = useState(false);
  const [installError, setInstallError] = useState<string | null>(null);
  const [pendingId, setPendingId] = useState<string | null>(null);

  async function fetchPlugins() {
    try {
      const res = await fetch("/api/plugins");
      if (res.ok) {
        const data = await res.json() as { plugins: PluginRecord[] };
        setPlugins(data.plugins);
      }
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void fetchPlugins();
  }, []);

  async function handleInstall() {
    if (!installUrl.trim()) return;
    setInstalling(true);
    setInstallError(null);
    try {
      const res = await fetch("/api/plugins/install", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ githubUrl: installUrl.trim() }),
      });
      const data = await res.json() as { plugin?: PluginRecord; error?: string };
      if (!res.ok) {
        setInstallError(data.error ?? "Installation failed");
        return;
      }
      setInstallUrl("");
      await fetchPlugins();
    } catch {
      setInstallError("Network error. Please try again.");
    } finally {
      setInstalling(false);
    }
  }

  async function handleToggle(pluginId: string) {
    setPendingId(pluginId);
    try {
      const res = await fetch(`/api/plugins/${pluginId}/activate`, { method: "POST" });
      if (res.ok) await fetchPlugins();
    } finally {
      setPendingId(null);
    }
  }

  async function handleUninstall(pluginId: string) {
    if (!confirm(`Uninstall plugin "${pluginId}"? This will delete its files.`)) return;
    setPendingId(pluginId);
    try {
      const res = await fetch("/api/plugins/uninstall", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ pluginId }),
      });
      if (res.ok) await fetchPlugins();
    } finally {
      setPendingId(null);
    }
  }

  return (
    <SettingsSection title="Plugins">
      {/* Install form */}
      <div className="space-y-2">
        <label className="text-sm font-medium text-text-primary">
          Install from GitHub
        </label>
        <div className="flex gap-2">
          <input
            type="text"
            value={installUrl}
            onChange={(e) => {
              setInstallUrl(e.target.value);
              setInstallError(null);
            }}
            onKeyDown={(e) => { if (e.key === "Enter") void handleInstall(); }}
            placeholder="https://github.com/owner/plugin-repo"
            disabled={installing}
            className="flex-1 min-w-0 px-3 py-2 text-sm rounded-lg border border-border bg-(--color-surface-secondary) text-text-primary placeholder-(--color-text-tertiary) focus:outline-none focus:ring-2 focus:ring-accent disabled:opacity-50"
          />
          <Button
            onClick={() => void handleInstall()}
            disabled={installing || !installUrl.trim()}
            size="sm"
          >
            {installing ? "Installing…" : "Install"}
          </Button>
        </div>
        {installError && (
          <p className="text-sm text-red-500">{installError}</p>
        )}
        <p className="text-xs text-(--color-text-tertiary)">
          Plugins run with full server privileges. Only install from trusted sources.
        </p>
      </div>

      {/* Plugin list */}
      <div className="space-y-2 mt-4">
        {loading ? (
          <p className="text-sm text-(--color-text-tertiary)">Loading plugins…</p>
        ) : plugins.length === 0 ? (
          <p className="text-sm text-(--color-text-tertiary)">No plugins installed.</p>
        ) : (
          plugins.map((plugin) => (
            <div
              key={plugin.id}
              className="flex items-center justify-between gap-3 px-3 py-2.5 rounded-lg border border-border bg-(--color-surface-secondary)"
            >
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-sm font-medium text-text-primary truncate">
                    {plugin.name}
                  </span>
                  <span className="text-xs text-(--color-text-tertiary)">v{plugin.version}</span>
                  {plugin.isBuiltIn && <Badge>Built-in</Badge>}
                  {!plugin.isActive && <Badge variant="warning">Disabled</Badge>}
                </div>
                {plugin.githubUrl && (
                  <p className="text-xs text-(--color-text-tertiary) truncate mt-0.5">
                    {plugin.githubUrl}
                  </p>
                )}
              </div>

              <div className="flex items-center gap-2 shrink-0">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => void handleToggle(plugin.pluginId)}
                  disabled={pendingId === plugin.pluginId}
                >
                  {plugin.isActive ? "Disable" : "Enable"}
                </Button>
                {!plugin.isBuiltIn && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => void handleUninstall(plugin.pluginId)}
                    disabled={pendingId === plugin.pluginId}
                    className="text-red-500 hover:text-red-400"
                  >
                    Uninstall
                  </Button>
                )}
              </div>
            </div>
          ))
        )}
      </div>
    </SettingsSection>
  );
}
