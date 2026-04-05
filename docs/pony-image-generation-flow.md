# Pony Image Generation Flow (profile: `image_generation_11`)

## Target Configuration

This flow documents the configuration shown in your setup:

- Image mode: enabled
- Active aspect ratio: `1:1`
- Resolution: `1024x1024`
- Draft mode: disabled (full resolution generation)
- Draft policy (when enabled): SDXL-safe downscale (`75%` scale, nearest multiple of `8`, shortest side floor at `512`)
- Image profile: `image_generation_11` (default)
- ComfyUI base URL (profile list): `http://192.168.1.202:8188`
- Context-aware prompts: enabled
- Enhance image prompts: enabled
- Translate prompts to Chinese (Simplified): disabled
- Reference image: not attached (text-to-image path)

## End-to-End Flow

1. User writes prompt in chat composer.
2. Frontend sends `POST /api/image` with:
   - `prompt`
   - `width: 1024`
   - `height: 1024`
   - `preview: false`
   - `chatHistory` (up to 10 recent messages)
   - `profileId` (selected profile, if set in store)
3. API validates session, prompt, UUIDs, and optional reference image payload.
4. API resolves profile:
   - If `profileId` is valid: load that profile.
   - Otherwise: load user default profile.
5. API creates conversation if needed and stores user message.
6. API reads user settings from DB (`contextAwarePrompts`, `enhancePrompt`, `translatePromptToChinese`).
7. API builds `finalPrompt` from `inputPrompt` using settings:
   - **Context-aware ON + Enhance OFF**:
     - Last user prompts from history are semantically merged into a single coherent description via an LLM call using `CONTEXT_MERGE_SYSTEM_PROMPT`.
     - Iterative modifications are resolved: "red hair" then "brown hair" → only "brown hair" in the merged output.
   - **Context-aware ON + Enhance ON**:
     - The semantic merge step is skipped. Instead, the enhance LLM receives `historyMessages` directly and resolves context via system prompt rules.
     - A `contextPrompt` (all history + current message joined by `. `) is built and passed to the Pony enhancer for tag reference injection.
   - **Enhance ON**:
     - System chooses enhance prompt in this priority:
       1. Profile custom enhance prompt (if present)
       2. Pony default enhancer if profile is detected as Pony
       3. Generic image enhancer otherwise
     - Pony detection is true when profile name or checkpoint name contains `pony` / `prefectpony`.
     - For Pony transformer prompts, the server runs `generateLazyPonyPrompt(...)`.
   - **Translate OFF**:
     - Chinese translation step is skipped.
8. API computes render size:
   - Requested: `1024x1024`
   - Actual: `1024x1024` (because `preview=false` in this captured setup)
   - If `preview=true`: API applies SDXL-safe draft sizing (not raw half-resolution).
9. API calls `ComfyUIClient.generate(...)` with profile workflow and placeholders.
10. ComfyUI path:
    - Inject runtime values (prompt, width, height, seed, denoise if present) into workflow nodes.
    - Submit workflow to `/prompt`.
    - Poll `/history/{promptId}` until output node has images.
    - Fetch image bytes from `/view`.
11. API stores image under `public/generated/<uuid>.png`.
12. API stores assistant image message and returns:
    - `imageUrl`
    - `conversationId`
    - `seed`
    - `fullWidth`
    - `fullHeight`

## Draft Resolution Guidance (Pony / SDXL)

Recommended practical floor for Draft mode: **512px on the shortest side**.

Why:

- Pony Diffusion V6 XL (author guidance) recommends `1024px` and notes it supports SDXL resolutions.
- Official SDXL docs state most checkpoints work best at `1024x1024`, `768x768` / `512x512` are supported with quality tradeoffs, and **below `512x512` is not recommended**.

References:

- https://archive.ph/o6uJW (Pony Diffusion V6 XL model page snapshot)
- https://huggingface.co/docs/diffusers/v0.33.1/en/api/pipelines/stable_diffusion/stable_diffusion_xl
- https://huggingface.co/docs/diffusers/v0.29.2/en/using-diffusers/sdxl

Applied policy in this codebase:

- Start at `75%` of requested dimensions (lighter draft than full render).
- Round to nearest multiple of `8` (ComfyUI/latent-friendly sizing).
- If draft falls below `512` on the shortest side, scale it back up proportionally to keep quality/stability.
- Never exceed requested full resolution.

Examples from current presets:

- `1024x1024` -> `768x768`
- `1024x768` -> `768x576`
- `1024x576` -> `912x512`
- `576x1024` -> `512x912`

## Negative Prompt

The negative prompt is **not generated dynamically**. The API never passes `negativePrompt` to `ComfyUIClient.generate()`. The negative prompt used in each generation is whatever is hardcoded in the stored workflow JSON of the profile (node 7 text by default — usually empty unless manually customized in the profile).

## Context-Aware Prompt Strategy

### When Enhance is OFF

An LLM call using `CONTEXT_MERGE_SYSTEM_PROMPT` merges all previous user messages into one coherent natural-language description. Rules:

- Latest message wins on contradictions (e.g., "red hair" → "brown hair" = only brown hair).
- Additions are incorporated (e.g., "a woman" → "on the beach" = "a woman on the beach").
- Removals are respected.
- Output language matches the latest message.

### When Enhance is ON (Pony path)

The context merge LLM call is skipped to avoid a double LLM round-trip. Instead:

- `historyMessages` (previous user messages only, up to 10) are passed as chat context to the enhance LLM.
- A `contextPrompt` is built by joining all history content + current prompt with `. ` separators.
- `contextPrompt` is used for tag reference injection (not the short current message alone).
- The LLM chat sequence is: `[system, ...historyMessages, currentUserMessage]`.

## Pony Prompt Enhancement Details

When Pony mode is active, enhancement is tag-focused and goes through `generateLazyPonyPrompt`.

### Philosophy

**Trust the LLM, filter minimally.** The pipeline guides the LLM with a strong system prompt and a tag reference shortlist, then validates output lightly. Aggressive post-processing that second-guesses the LLM has been removed in favor of letting the LLM handle context-resolution, iterative modifications, and tag selection.

### Tag Reference Injection

- `injectPrefectPonyTagReference(systemPrompt, contextPrompt)` replaces `{{PREFECT_PONY_XL_TAG_REFERENCE}}` in the system prompt with a dynamically scored tag shortlist.
- Up to 72 tags are injected (52 scored by lexical overlap + up to 20 curated/popularity fallback), derived from derpibooru, danbooru, and e621 CSV datasets.
- `getTopPrefectPonyTagsForPrompt(contextPrompt, 24)` fetches the top 24 reference tags for use as fallback content when the LLM returns unstructured output.
- Both calls use `contextPrompt` (full accumulated description), not just the current short message.

### Output Format

- The LLM must return a structured JSON object:
  ```json
  {"content_tags": [...], "must_keep_tags": [...], "source": "source_anime", "rating": "rating_safe"}
  ```
- If JSON parsing fails, output is split on commas as fallback. When no JSON is present at all, the top reference-locked tags are used as content.

### Source and Rating Resolution

- **Source tag**: The LLM's `source` field is used directly if it is a valid value (`source_pony`, `source_furry`, `source_cartoon`, `source_anime`). Falls back to keyword detection only when the LLM returns an invalid or missing value.
- **Rating tag**: The more restrictive of the LLM's `rating` and the keyword-detected rating is used. Keyword detection acts as a safety floor — explicit keywords like `nsfw` or `desnuda` always elevate the rating to `rating_explicit` even if the LLM returned `rating_safe`.

### Tag Assembly (3 channels)

1. **LLM output** — `must_keep_tags` + `content_tags` from the JSON response, validated against the booru dataset.
2. **User-locked tags** — derived from user prompt tokens via `USER_LOCK_HINTS` (Spanish/English dictionary, ~70 entries). These always appear in the output and bypass content filtering.
3. **Booru validation** — multi-part tags (containing `_`) must exist in the merged derpibooru/danbooru/e621 tag set. Single-part tags always pass. This replaces the old tiered-relevance filter and prevents hallucinated character-name tags (e.g., `james_cabello`, `senran_kagura_peach_beach_splash`).

### Output Filtering

Three lightweight filters are applied to content tags:

- **Safe explicit blocklist**: blocks sexual/nude tags (`nude`, `penis`, `cum`, etc.) when rating is `rating_safe`.
- **Disallowed quality spam**: strips `lowres`, `blurry`, `masterpiece`, `8k`, etc.
- **Archetype blocklist** (4 tags): blocks `tsundere`, `kuudere`, `yandere`, `dandere` — anime archetypes that Pony cannot render and the LLM tends to hallucinate. Other personality/emotion tags (`cheerful`, `energetic`, `shy`, etc.) are allowed through when the LLM generates them.

### Quality Tags and Output Assembly

- Output format target: one comma-separated positive tag line.
- Quality prefix (always first):
  `score_9, score_8_up, score_7_up, score_6_up, score_5_up, score_4_up`
- Exactly one source tag.
- Exactly one rating tag.
- User-locked tags (from user prompt keywords via `USER_LOCK_HINTS`).
- Content tags (from LLM, validated by booru dataset).
- Max **35 tags** total (6 quality + 1 source + 1 rating + up to 25 content + user-locked).

### System Prompt Rules Summary (`PREFECT_PONY_XL_ENHANCE_SYSTEM_PROMPT`)

**#1 PRIORITY**: faithfully represent everything the user described — subject, appearance, actions, setting, mood, and style.

1. Accept Spanish or English input; output tags in English only.
2. Output exactly one source tag in the JSON `source` field.
3. Output exactly one rating tag in the JSON `rating` field (default: `rating_safe`).
4. Order content tags using the BASE framework: Acts (character count, actions) → Specs (hair, eyes, clothing) → Envs (environment, lighting).
5. Only use verified booru tags from danbooru, e621, or derpibooru. Do not invent compound character-name tags.
6. Tag count targets (content only): 10-18 (simple), 15-25 (normal), 20-30 (complex).
7. Use lowercase snake_case.
8. No artist names, quality spam, or negative prompt content.
9. Do NOT add personality/emotion/archetype tags unless the user explicitly described them.
10. Use the injected lexicon reference for tag suggestions.
11. Use conversation history to resolve iterative modifications: REPLACE contradictions, ADD new elements, REMOVE when asked, KEEP everything else. Latest message wins.

## Default Prefect Pony XL Workflow Reference

If `image_generation_11` uses the Prefect Pony XL preset, the default workflow characteristics are:

- Sampler: `euler_ancestral`
- Steps: `25`
- CFG: `6.8`
- Scheduler: `simple`
- Clip skip: `-2` (`CLIPSetLastLayer`)
- Checkpoint loader: `CheckpointLoaderSimple` (`prefectPonyXL_v6.safetensors` by default)
- Output node: `9` (`SaveImage`)
- Placeholder mapping:
  - `positivePrompt -> node 6.text`
  - `negativePrompt -> node 7.text`
  - `width -> node 5.width`
  - `height -> node 5.height`
  - `seed -> node 3.seed`
  - `denoise -> node 3.denoise`

Note: the API currently sends only positive prompt values by default. Negative prompt remains whatever the stored workflow defines (usually empty unless customized).

## Practical Input/Output Example

Iterative conversation (enhance ON, context-aware ON):

| Turn | User message | `contextPrompt` passed to enhancer |
|------|-------------|-------------------------------------|
| 1 | `Una mujer` | `Una mujer` |
| 2 | `cabello rojo` | `Una mujer. cabello rojo` |
| 3 | `en la playa` | `Una mujer. cabello rojo. en la playa` |
| 4 | `La mujer es morena` | `Una mujer. cabello rojo. en la playa. La mujer es morena` |

Expected enhanced output at turn 4 (via LLM + normalization):

```
score_9, score_8_up, score_7_up, score_6_up, score_5_up, score_4_up, source_anime, rating_safe,
1girl, female, brown_hair, beach, outdoors, ...
```

- `red_hair` is absent because the LLM applies the iterative modification rule (latest message replaces contradicted attributes) and `brown_hair` is in `must_keep_tags`.
- Tags like `james_cabello`, `senran_kagura_peach_beach_splash` are blocked by booru validation (multi-part tags not found in the dataset).
- Tags like `tsundere`, `yandere` are blocked by the archetype blocklist. Tags like `cheerful`, `energetic` are now allowed through.
