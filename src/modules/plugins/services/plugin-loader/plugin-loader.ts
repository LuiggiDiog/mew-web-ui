import path from "path";
import { readFile } from "fs/promises";
import { pathToFileURL } from "url";
import { listInstalledPlugins } from "@/modules/plugins/repositories/plugins-repository";
import type { EnhancePlugin } from "@/modules/plugins/types";

// Built-in plugins have been extracted to standalone packages in plugins-local/.
// Install them via the Plugin Manager in Settings, or add new built-ins here.
const BUILT_IN_PLUGINS: EnhancePlugin[] = [];

const PLUGINS_DIR = path.join(process.cwd(), "plugins-local");

// Cache loaded plugins in globalThis to survive HMR without re-loading on every request.
// The cache is invalidated explicitly after install/uninstall via invalidatePluginCache().
const g = globalThis as typeof globalThis & {
  _enhancePluginCache: EnhancePlugin[] | undefined;
};

export async function getEnhancePlugins(): Promise<EnhancePlugin[]> {
  if (g._enhancePluginCache) return g._enhancePluginCache;

  const plugins: EnhancePlugin[] = [...BUILT_IN_PLUGINS];

  try {
    const rows = await listInstalledPlugins();
    const externalRows = rows.filter((r) => r.isActive && !r.isBuiltIn && r.kind === "enhance");

    for (const row of externalRows) {
      try {
        const pluginDir = path.join(PLUGINS_DIR, row.directoryName);

        // Read the plugin's package.json to resolve the main entry file.
        // ESM does not support directory imports — we must point to the exact file.
        let mainFile = "index.js";
        try {
          const pkgRaw = await readFile(path.join(pluginDir, "package.json"), "utf-8");
          const pkg = JSON.parse(pkgRaw) as { main?: string };
          if (pkg.main) mainFile = pkg.main;
        } catch { /* use default */ }

        const moduleUrl = pathToFileURL(path.join(pluginDir, mainFile)).href;
        // Use new Function to bypass webpack's static import analysis.
        // eslint-disable-next-line @typescript-eslint/no-explicit-any, no-new-func
        const dynamicImport = new Function("url", "return import(url)") as (url: string) => Promise<any>;
        const mod = await dynamicImport(moduleUrl);
        const plugin: EnhancePlugin = mod.default ?? mod;

        if (
          plugin &&
          typeof plugin.id === "string" &&
          typeof plugin.match === "function" &&
          typeof plugin.enhance === "function"
        ) {
          plugins.push(plugin);
        } else {
          console.warn(`[plugin-loader] Plugin at ${pluginDir} does not conform to EnhancePlugin contract — skipping`);
        }
      } catch (err) {
        console.error(`[plugin-loader] Failed to load external plugin "${row.pluginId}":`, err);
      }
    }
  } catch (err) {
    console.error("[plugin-loader] Failed to query installed plugins from DB:", err);
  }

  g._enhancePluginCache = plugins;
  return plugins;
}

export function invalidatePluginCache(): void {
  g._enhancePluginCache = undefined;
}

export function resolveEnhancePlugin(
  plugins: EnhancePlugin[],
  profile: { name?: string | null; workflowJson?: unknown }
): EnhancePlugin | null {
  let best: EnhancePlugin | null = null;
  let bestScore = 0;

  for (const plugin of plugins) {
    const score = plugin.match(profile);
    if (score > bestScore) {
      bestScore = score;
      best = plugin;
    }
  }

  return best;
}
