# Image Profiles — ComfyUI Multi-Project Support

## Overview

An **Image Profile** is the unit that encapsulates everything needed to generate images with a specific ComfyUI project. Instead of a single hardcoded workflow tied to environment variables, users can define, manage, export, and import multiple profiles — each pointing to a different ComfyUI instance or workflow setup.

This document covers the full architecture: database, backend, API, and frontend.

---

## Concept

Before profiles existed, Mew WebUI had a single, hardcoded workflow (Z-Image Turbo) configured through env vars (`COMFYUI_BASE_URL`, `COMFYUI_UNET_MODEL`, etc.). Generation was rigid — one server, one workflow, one set of model names.

With profiles, each profile stores:

- **Connection** — the base URL of the ComfyUI instance
- **Workflow JSON** — the full ComfyUI API-format workflow template for text-to-image
- **Img2Img Workflow JSON** — optional separate workflow for image-to-image generation
- **Placeholder mappings** — which node IDs receive dynamic values (prompt, seed, dimensions, denoise, reference image)
- **Output node ID** — which node produces the final image (default: `"9"`)
- **Prompt enhancement** — custom system prompts for Ollama-based prompt expansion, and optional model override

---

## Database Schema

**Table: `comfyui_profiles`** — defined in `src/db/schema/index.ts`

| Column | Type | Notes |
|--------|------|-------|
| `id` | uuid PK | auto-generated |
| `userId` | uuid FK → users | cascade delete |
| `name` | text NOT NULL | display name, unique per user |
| `baseUrl` | text NOT NULL | ComfyUI instance URL |
| `workflowJson` | jsonb NOT NULL | text2img workflow template |
| `img2imgWorkflowJson` | jsonb | optional img2img workflow |
| `outputNodeId` | text DEFAULT '9' | node ID to read images from |
| `placeholders` | jsonb NOT NULL | text2img placeholder map |
| `img2imgPlaceholders` | jsonb | img2img placeholder map |
| `enhanceSystemPrompt` | text | custom text2img enhance prompt |
| `enhanceImg2ImgSystemPrompt` | text | custom img2img enhance prompt |
| `enhanceModel` | text | Ollama model override (null = user default) |
| `isDefault` | boolean DEFAULT false | only one default per user |
| `createdAt` | timestamp | |
| `updatedAt` | timestamp | |

**Constraint:** `UNIQUE(userId, name)` — a user cannot have two profiles with the same name.

**Default profile rule:** only one profile per user can have `isDefault = true`. The repository automatically unsets other defaults when a new one is set.

---

## Placeholder Map

The placeholder map tells `ComfyUIClient` which node ID and input field to inject each dynamic value into. This makes the generation engine workflow-agnostic — it does not need to know what kind of nodes are in the workflow.

```json
{
  "positivePrompt": { "nodeId": "6", "field": "text" },
  "negativePrompt": { "nodeId": "7", "field": "text" },
  "width":          { "nodeId": "13", "field": "width" },
  "height":         { "nodeId": "13", "field": "height" },
  "seed":           { "nodeId": "3", "field": "seed" },
  "denoise":        { "nodeId": "3", "field": "denoise" },
  "referenceImage": { "nodeId": "20", "field": "image" }
}
```

**Important:** The text2img and img2img workflows often have different nodes for width/height. The Z-Image Turbo workflow uses node `"13"` (EmptySD3LatentImage) for text2img, and node `"21"` (ImageScale) for img2img. This is why there are two separate placeholder fields in the profile.

**Injection is safe:** if a placeholder points to a node that does not exist in the workflow JSON, the injection is silently skipped. Values typed as numbers (width, height, seed, denoise) are injected as numbers, not strings.

---

## Z-Image Turbo Default Profile

The built-in workflow builders and system prompts live in the ComfyUI service module:

```
src/modules/providers/services/comfyui/comfyui.ts
```

**Exported constants and functions:**

| Export | Purpose |
|--------|---------|
| `buildZImageTurboWorkflow()` | Returns the text2img workflow JSON |
| `buildZImageTurboImg2ImgWorkflow()` | Returns the img2img workflow JSON |
| `Z_IMAGE_TURBO_PLACEHOLDERS` | text2img placeholder map |
| `Z_IMAGE_TURBO_IMG2IMG_PLACEHOLDERS` | img2img placeholder map |
| `Z_IMAGE_TURBO_OUTPUT_NODE` | `"9"` |
| `ENHANCE_SYSTEM_PROMPT` | Default text2img enhancement prompt |
| `ENHANCE_IMG2IMG_SYSTEM_PROMPT` | Default img2img enhancement prompt |

These are used by the seed script to create the default profile. They are **not** used at runtime — once the profile exists in the database, the workflow JSON stored there is what drives generation.

**Seed command:**
```bash
SEED_EMAIL=your@email.com npm run db:seed
```

The seed only inserts the default profile if the user has no profiles yet. Rerunning it is safe.

---

## ComfyUIClient

**File:** `src/modules/providers/services/comfyui/comfyui.ts`

The client is now workflow-agnostic. The `generate()` method accepts a single config object:

```typescript
interface GenerateConfig {
  workflowJson: object;       // the workflow template from the profile
  placeholders: PlaceholderMap;
  outputNodeId: string;
  values: {
    prompt: string;
    width: number;
    height: number;
    seed?: number;
    denoise?: number;
    referenceImage?: string;  // filename on the ComfyUI server after upload
  };
}
```

**Flow for text-to-image:**
1. Deep-clone `workflowJson`
2. Inject `values` into nodes specified by `placeholders`
3. POST to `/prompt` on the profile's `baseUrl`
4. Poll `/history/{promptId}` until `outputs[outputNodeId].images` appears
5. Fetch the image from `/view`

**Flow for img2img:**
Same, but uses `img2imgWorkflowJson` and `img2imgPlaceholders`. The reference image is first uploaded to ComfyUI via `uploadImage()`, and the returned filename is passed as `values.referenceImage`.

**`isConnected()`** checks `GET /system_stats` — this endpoint is available on any ComfyUI instance regardless of which nodes are installed.

**`listModels()`** still uses `/object_info/UNETLoader` — it lists available UNET model files on the server.

---

## Repository

**File:** `src/modules/providers/repositories/comfyui-profiles-repository/comfyui-profiles-repository.ts`

All functions are user-scoped (always filter by `userId`):

| Function | Description |
|----------|-------------|
| `listProfilesByUserId(userId)` | All profiles ordered by createdAt |
| `findProfileById(userId, profileId)` | Single profile |
| `findDefaultProfile(userId)` | Profile with `isDefault = true`; falls back to oldest if none set |
| `createProfile(data)` | Insert; auto-unsets other defaults if `isDefault: true` |
| `updateProfile(userId, profileId, data)` | Partial update; auto-unsets other defaults if `isDefault: true` |
| `deleteProfile(userId, profileId)` | Rejects if it's the only profile; promotes next oldest to default if deleted one was default |
| `setDefaultProfile(userId, profileId)` | Unsets all other defaults, sets this one |

---

## API Routes

All routes require an authenticated session.

### Profile CRUD

| Method | Route | Description |
|--------|-------|-------------|
| `GET` | `/api/comfyui-profiles` | List all profiles for current user |
| `POST` | `/api/comfyui-profiles` | Create a new profile |
| `GET` | `/api/comfyui-profiles/[id]` | Get a single profile |
| `PUT` | `/api/comfyui-profiles/[id]` | Update a profile |
| `DELETE` | `/api/comfyui-profiles/[id]` | Delete a profile |

### Profile Actions

| Method | Route | Description |
|--------|-------|-------------|
| `POST` | `/api/comfyui-profiles/[id]/test` | Test connection to the profile's baseUrl |
| `POST` | `/api/comfyui-profiles/[id]/default` | Set this profile as the user's default |
| `GET` | `/api/comfyui-profiles/[id]/export` | Download profile as a portable JSON file |
| `POST` | `/api/comfyui-profiles/import` | Import a profile from a JSON body |

### Export Format

The export strips `id`, `userId`, `createdAt`, `updatedAt`, and `isDefault` so the file is portable between users and instances. On import, the profile is always inserted as non-default so it does not accidentally replace the existing default.

---

## Image Generation Route

**File:** `src/app/api/image/route.ts`

The route now accepts an optional `profileId` in the request body:

```typescript
{
  prompt: string;
  profileId?: string;       // UUID of the profile to use
  conversationId?: string;
  width?: number;
  height?: number;
  seed?: number;
  preview?: boolean;
  referenceImage?: string;  // data URL
  denoise?: number;
  chatHistory?: { role: string; content: string }[];
  skipUserMessage?: boolean;
  replaceMessageId?: string;
}
```

**Profile resolution logic:**
1. If `profileId` is a valid UUID → `findProfileById(userId, profileId)`
2. Otherwise → `findDefaultProfile(userId)`
3. If no profile found → returns `422` with a descriptive error

**Prompt enhancement priority:**
1. `profile.enhanceModel` (if set)
2. `settingsMap.defaultModel`
3. `DEFAULT_MODEL` constant

**System prompt priority:**
1. `profile.enhanceSystemPrompt` / `profile.enhanceImg2ImgSystemPrompt` (if set)
2. Built-in `ENHANCE_SYSTEM_PROMPT` / `ENHANCE_IMG2IMG_SYSTEM_PROMPT` constants

**Conversation `model` field** is now set to `profile.name` (e.g., "Z-Image Turbo") instead of the hardcoded string `"z-image-turbo"`.

---

## Frontend

### Settings Page — Image Profiles

**Component:** `src/modules/providers/components/ComfyUIProfiles/ComfyUIProfiles.tsx`

Rendered on the settings page (`src/app/(private)/settings/page.tsx`) as a section titled "Image Profiles".

**Features:**
- Lists all profiles with name, base URL, connection status dot, and default badge
- **Test connection** (refresh icon) — calls `/api/comfyui-profiles/[id]/test` and updates the status dot inline
- **Edit** (pencil icon) — expands an inline form with all profile fields
- **Export** (download icon) — opens the export URL in a new tab
- **Set default** — appears only on non-default profiles
- **Delete** (X icon) — asks for confirmation, then calls DELETE
- **Add profile** button — expands a blank inline form at the top
- **Import** button — opens a file picker; accepts both raw ComfyUI workflow JSON (just fills the workflow field) and full exported profile JSON (fills all fields)

**Profile form sections:**
- Basic: name, base URL, output node ID
- Workflow JSON (textarea, with "Load from file" shortcut)
- Placeholder mappings (JSON textarea, pre-filled with Z-Image Turbo defaults)
- Img2img (collapsible): img2img workflow JSON + img2img placeholders
- Prompt enhancement (collapsible): model override, text2img system prompt, img2img system prompt
- "Set as default" checkbox

### ChatComposer — Profile Selector

**Component:** `src/modules/chat/components/ImageProfileSelector/ImageProfileSelector.tsx`

Rendered in the status line at the bottom of `ChatComposer` when image mode is active. Replaces the static "ComfyUI" label.

- **If only one profile exists:** shows the profile name as plain text (no dropdown)
- **If multiple profiles exist:** shows a clickable dropdown listing all profiles; the selected one is highlighted in accent color

On mount, the component fetches `/api/comfyui-profiles`, auto-selects the default profile if nothing is currently selected in the store, and updates Zustand.

### Zustand Store

**File:** `src/modules/chat/store/chatStore/chatStore.ts`

New state fields:
- `activeImageProfileId: string | null` — UUID of the selected profile
- `activeImageProfileName: string | null` — display name (for the status line)

New action:
- `setActiveImageProfile(id, name)` — sets both fields at once

`ChatArea` reads `activeImageProfileId` and passes it as `profileId` in every `/api/image` request (both `handleSendImage` and `handleUpscale`).

---

## Environment Variables

After the profiles system, the ComfyUI env vars have a narrower role:

| Variable | Role |
|----------|------|
| `COMFYUI_BASE_URL` | Used by the legacy `/api/providers/comfyui/health` health check route, and as the default `baseUrl` when seeding the first profile |
| `COMFYUI_UNET_MODEL` | Only used by `buildZImageTurboWorkflow()` at seed time |
| `COMFYUI_CLIP_MODEL` | Only used by `buildZImageTurboWorkflow()` at seed time |
| `COMFYUI_VAE_MODEL` | Only used by `buildZImageTurboWorkflow()` at seed time |

At runtime, image generation reads everything from the database profile. The env vars are only needed the first time you seed the default profile.

---

## Adding a New ComfyUI Project

To connect a different ComfyUI instance or workflow:

1. In ComfyUI, build and test your workflow.
2. Enable **Dev Mode** in ComfyUI settings (gear icon → Enable Dev mode Options).
3. Click **Save (API Format)** — this downloads a `workflow_api.json`.
4. In Mew WebUI, go to **Settings → Image Profiles → Add profile**.
5. Fill in the name and base URL.
6. In the Workflow JSON field, click **Load from file** and select your `workflow_api.json`.
7. Update the **Placeholder Mappings** JSON to point to the correct node IDs for your workflow:
   - `positivePrompt` → the node that receives the text prompt
   - `width` / `height` → the node that sets dimensions
   - `seed` → the KSampler node
   - `denoise` → the KSampler node (if different from seed)
8. Set the **Output Node ID** to the SaveImage or PreviewImage node in your workflow.
9. Optionally add an img2img workflow and its own placeholder map.
10. Optionally customize the enhance system prompt for your model/workflow style.
11. Click **Create profile**.
12. Click the **Test connection** button to verify the connection.

---

## Key Files Reference

| File | Role |
|------|------|
| `src/db/schema/index.ts` | `comfyuiProfiles` table definition |
| `src/db/migrations/0003_square_vampiro.sql` | Migration adding the table |
| `src/db/migrations/0004_magical_puppet_master.sql` | Migration adding `img2imgPlaceholders` column |
| `src/db/seed.ts` | Seeds the default Z-Image Turbo profile |
| `src/modules/providers/repositories/comfyui-profiles-repository/` | CRUD repository |
| `src/modules/providers/services/comfyui/comfyui.ts` | Refactored client + exported workflow builders + system prompts |
| `src/app/api/comfyui-profiles/route.ts` | List + create |
| `src/app/api/comfyui-profiles/[id]/route.ts` | Get + update + delete |
| `src/app/api/comfyui-profiles/[id]/test/route.ts` | Connection test |
| `src/app/api/comfyui-profiles/[id]/default/route.ts` | Set default |
| `src/app/api/comfyui-profiles/[id]/export/route.ts` | Export profile |
| `src/app/api/comfyui-profiles/import/route.ts` | Import profile |
| `src/app/api/image/route.ts` | Image generation — loads profile, drives generation |
| `src/modules/providers/components/ComfyUIProfiles/` | Settings UI |
| `src/modules/chat/components/ImageProfileSelector/` | ChatComposer selector |
| `src/modules/chat/store/chatStore/chatStore.ts` | `activeImageProfileId` state |

---

## Invariants and Rules

- A user must always have at least one profile. The repository rejects deletion of the last profile.
- `isDefault = true` is always unique per user. The repository enforces this automatically in `createProfile`, `updateProfile`, and `setDefaultProfile`.
- `findDefaultProfile` never returns `undefined` if the user has at least one profile — it falls back to the oldest profile if no default is explicitly set.
- The image route returns `422` (not `503`) when no profile exists. This is an application configuration error, not a connectivity error.
- Workflow JSON stored in the database is treated as a template. It is never modified in place — `ComfyUIClient.injectValues()` always deep-clones before injecting.
- The `enhanceSystemPrompt` fields on the profile are nullable. `null` means "use the built-in default", not "disable enhancement". Disable enhancement via the `enhancePrompt` user setting.
- `profileId` in the `/api/image` request body is optional. Omitting it always resolves to the user's default profile.
