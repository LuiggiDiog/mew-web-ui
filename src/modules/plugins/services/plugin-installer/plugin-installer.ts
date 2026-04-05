import path from "path";
import { mkdir, rm, readFile } from "fs/promises";
import { exec as execCb } from "child_process";
import { promisify } from "util";
import { pathToFileURL } from "url";
import {
  findPluginByPluginId,
  insertPlugin,
  removePlugin,
  type InstalledPluginRecord,
} from "@/modules/plugins/repositories/plugins-repository";
import { invalidatePluginCache } from "@/modules/plugins/services/plugin-loader";

const exec = promisify(execCb);

const PLUGINS_DIR = path.join(process.cwd(), "plugins-local");

// Wrap a path in double quotes so exec (shell mode) handles spaces correctly.
function q(p: string): string {
  return `"${p}"`;
}

// Only allow GitHub HTTPS URLs. Rejects anything else to prevent command injection.
const GITHUB_URL_REGEX = /^https:\/\/github\.com\/[a-zA-Z0-9_.-]+\/[a-zA-Z0-9_.-]+(\.git)?\/?$/;

function sanitizeDirectoryName(raw: string): string {
  return raw
    .toLowerCase()
    .replace(/[^a-z0-9-]/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function deriveDirectoryName(githubUrl: string): string {
  const clean = githubUrl.replace(/\.git\/?$/, "").replace(/\/$/, "");
  const parts = clean.split("/");
  const owner = parts[parts.length - 2] ?? "unknown";
  const repo = parts[parts.length - 1] ?? "plugin";
  return sanitizeDirectoryName(`${owner}--${repo}`);
}

type PluginPackageJson = {
  name?: string;
  version?: string;
  main?: string;
  dependencies?: Record<string, string>;
  scripts?: Record<string, string>;
};

async function readPluginPackageJson(pluginDir: string): Promise<PluginPackageJson> {
  try {
    const content = await readFile(path.join(pluginDir, "package.json"), "utf-8");
    return JSON.parse(content) as PluginPackageJson;
  } catch {
    return {};
  }
}

async function validatePluginContract(pluginDir: string, pkg: PluginPackageJson): Promise<{
  pluginId: string;
  name: string;
  version: string;
}> {
  const mainFile = pkg.main ?? "index.js";
  const mainPath = path.join(pluginDir, mainFile);
  const moduleUrl = pathToFileURL(mainPath).href;

  // Use new Function to bypass webpack's static import analysis.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any, no-new-func
  const dynamicImport = new Function("url", "return import(url)") as (url: string) => Promise<any>;
  const mod = await dynamicImport(moduleUrl);
  const plugin = mod.default ?? mod;

  if (
    !plugin ||
    typeof plugin.id !== "string" ||
    typeof plugin.match !== "function" ||
    typeof plugin.enhance !== "function"
  ) {
    throw new Error(
      `Plugin at ${mainPath} does not conform to the EnhancePlugin contract. ` +
      `Expected: { id: string, match: function, enhance: function }`
    );
  }

  return {
    pluginId: plugin.id as string,
    name: (typeof plugin.name === "string" ? plugin.name : plugin.id) as string,
    version: (typeof plugin.version === "string" ? plugin.version : pkg.version ?? "0.0.0") as string,
  };
}

/**
 * Installs a plugin from a GitHub URL.
 * Steps: validate URL → clone → npm install → npm run build → validate contract → register in DB
 */
export async function installPluginFromGitHub(githubUrl: string): Promise<InstalledPluginRecord> {
  const cleanUrl = githubUrl.trim();

  if (!GITHUB_URL_REGEX.test(cleanUrl)) {
    throw new Error("Invalid GitHub URL. Must match: https://github.com/<owner>/<repo>");
  }

  const directoryName = deriveDirectoryName(cleanUrl);
  if (!directoryName || directoryName.includes("..")) {
    throw new Error("Could not derive a safe directory name from the GitHub URL.");
  }

  const targetDir = path.join(PLUGINS_DIR, directoryName);

  // Ensure plugins-local/ exists
  await mkdir(PLUGINS_DIR, { recursive: true });

  // Convert HTTPS GitHub URL to SSH so private repos work with local SSH keys.
  // https://github.com/owner/repo  →  git@github.com:owner/repo.git
  const sshUrl = cleanUrl
    .replace(/^https:\/\/github\.com\//, "git@github.com:")
    .replace(/\.git\/?$/, "") + ".git";

  // Clone the repo
  try {
    await exec(`git clone --depth 1 ${sshUrl} ${q(targetDir)}`, {
      timeout: 120_000,
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    throw new Error(`git clone failed: ${msg}`);
  }

  // From this point, clean up the directory if anything fails
  try {
    const pkg = await readPluginPackageJson(targetDir);

    // Install production dependencies if any
    if (pkg.dependencies && Object.keys(pkg.dependencies).length > 0) {
      await exec("npm install --omit=dev", {
        cwd: targetDir,
        timeout: 120_000,
      });
    }

    // Run build script if present
    if (pkg.scripts?.build) {
      await exec("npm run build", {
        cwd: targetDir,
        timeout: 120_000,
      });
    }

    // Validate the plugin contract and extract metadata
    const { pluginId, name, version } = await validatePluginContract(targetDir, pkg);

    // Check for duplicate plugin IDs
    const existing = await findPluginByPluginId(pluginId);
    if (existing) {
      throw new Error(`Plugin with id "${pluginId}" is already installed.`);
    }

    // Register in DB
    const record = await insertPlugin({
      pluginId,
      name,
      version,
      githubUrl: cleanUrl,
      directoryName,
      kind: "enhance",
      isBuiltIn: false,
      isActive: true,
    });

    invalidatePluginCache();
    return record;
  } catch (err) {
    // Cleanup on failure
    await rm(targetDir, { recursive: true, force: true }).catch(() => undefined);
    throw err;
  }
}

/**
 * Uninstalls an external plugin: removes from DB and deletes its directory.
 * Refuses to uninstall built-in plugins.
 */
export async function uninstallPlugin(pluginId: string): Promise<void> {
  const record = await findPluginByPluginId(pluginId);

  if (!record) {
    throw new Error(`Plugin "${pluginId}" not found.`);
  }

  if (record.isBuiltIn) {
    throw new Error(`Plugin "${pluginId}" is a built-in plugin and cannot be uninstalled.`);
  }

  await removePlugin(pluginId);

  const targetDir = path.join(PLUGINS_DIR, record.directoryName);
  await rm(targetDir, { recursive: true, force: true });

  invalidatePluginCache();
}
