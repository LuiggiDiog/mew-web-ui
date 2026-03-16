import { env } from "@/env";
import type { PlaceholderMap } from "@/modules/providers/repositories/comfyui-profiles-repository";

export interface ComfyModel {
  name: string;
}

interface ComfyOutputImage {
  filename: string;
  subfolder: string;
  type: string;
}

// ─── Z-Image Turbo default workflow builders ─────────────────────────────────
// Exported so they can be used in the seed script to populate the default profile.

export const Z_IMAGE_TURBO_OUTPUT_NODE = "9";

export const Z_IMAGE_TURBO_PLACEHOLDERS: PlaceholderMap = {
  positivePrompt: { nodeId: "6", field: "text" },
  negativePrompt: { nodeId: "7", field: "text" },
  width: { nodeId: "13", field: "width" },
  height: { nodeId: "13", field: "height" },
  seed: { nodeId: "3", field: "seed" },
  denoise: { nodeId: "3", field: "denoise" },
};

export const Z_IMAGE_TURBO_IMG2IMG_PLACEHOLDERS: PlaceholderMap = {
  ...Z_IMAGE_TURBO_PLACEHOLDERS,
  referenceImage: { nodeId: "20", field: "image" },
};

export function buildZImageTurboWorkflow(): object {
  return {
    "16": {
      class_type: "UNETLoader",
      inputs: { unet_name: env.comfyuiUnetModel, weight_dtype: "default" },
    },
    "18": {
      class_type: "CLIPLoader",
      inputs: { clip_name: env.comfyuiClipModel, type: "lumina2", device: "default" },
    },
    "17": {
      class_type: "VAELoader",
      inputs: { vae_name: env.comfyuiVaeModel },
    },
    "11": {
      class_type: "ModelSamplingAuraFlow",
      inputs: { model: ["16", 0], shift: 3 },
    },
    "6": {
      class_type: "CLIPTextEncode",
      inputs: { clip: ["18", 0], text: "" },
    },
    "7": {
      class_type: "CLIPTextEncode",
      inputs: { clip: ["18", 0], text: "blurry ugly bad" },
    },
    "13": {
      class_type: "EmptySD3LatentImage",
      inputs: { width: 1024, height: 1024, batch_size: 1 },
    },
    "3": {
      class_type: "KSampler",
      inputs: {
        model: ["11", 0],
        positive: ["6", 0],
        negative: ["7", 0],
        latent_image: ["13", 0],
        seed: 0,
        steps: 9,
        cfg: 1,
        sampler_name: "euler",
        scheduler: "simple",
        denoise: 1.0,
      },
    },
    "8": {
      class_type: "VAEDecode",
      inputs: { samples: ["3", 0], vae: ["17", 0] },
    },
    "9": {
      class_type: "SaveImage",
      inputs: { filename_prefix: "mewui", images: ["8", 0] },
    },
  };
}

export function buildZImageTurboImg2ImgWorkflow(): object {
  return {
    "16": {
      class_type: "UNETLoader",
      inputs: { unet_name: env.comfyuiUnetModel, weight_dtype: "default" },
    },
    "18": {
      class_type: "CLIPLoader",
      inputs: { clip_name: env.comfyuiClipModel, type: "lumina2", device: "default" },
    },
    "17": {
      class_type: "VAELoader",
      inputs: { vae_name: env.comfyuiVaeModel },
    },
    "11": {
      class_type: "ModelSamplingAuraFlow",
      inputs: { model: ["16", 0], shift: 3 },
    },
    "6": {
      class_type: "CLIPTextEncode",
      inputs: { clip: ["18", 0], text: "" },
    },
    "7": {
      class_type: "CLIPTextEncode",
      inputs: { clip: ["18", 0], text: "blurry ugly bad" },
    },
    "20": {
      class_type: "LoadImage",
      inputs: { image: "" },
    },
    "21": {
      class_type: "ImageScale",
      inputs: {
        image: ["20", 0],
        width: 1024,
        height: 1024,
        upscale_method: "lanczos",
        crop: "center",
      },
    },
    "22": {
      class_type: "VAEEncode",
      inputs: { pixels: ["21", 0], vae: ["17", 0] },
    },
    "3": {
      class_type: "KSampler",
      inputs: {
        model: ["11", 0],
        positive: ["6", 0],
        negative: ["7", 0],
        latent_image: ["22", 0],
        seed: 0,
        steps: 9,
        cfg: 1,
        sampler_name: "euler",
        scheduler: "simple",
        denoise: 0.65,
      },
    },
    "8": {
      class_type: "VAEDecode",
      inputs: { samples: ["3", 0], vae: ["17", 0] },
    },
    "9": {
      class_type: "SaveImage",
      inputs: { filename_prefix: "mewui", images: ["8", 0] },
    },
  };
}

// ─── System prompts ───────────────────────────────────────────────────────────
// Exported so they can be stored in the seed profile and overridden per profile.

export const ENHANCE_SYSTEM_PROMPT = `You are a prompt enhancer for Z-Image Turbo.
Turn the user's input into a single final image-generation prompt in English.

Your priority is: preserve the user's intent first, enrich only where it helps.

Follow these rules strictly:

1. Identify and preserve every immutable element from the user's prompt:
   - main subject and subject count
   - action, pose, expression, and state
   - named characters, brands, IPs, products, or specific objects
   - explicitly requested colors, clothing, props, symbols, setting, era, framing, or angle
   - every piece of text that must appear inside the image
   Never remove, rename, paraphrase, or contradict these.

2. If the request is abstract, conceptual, or solution-oriented instead of a direct scene description,
   silently invent one clear, concrete visual scenario that best expresses the request before enriching it.

3. Add only supportive detail:
   physical traits, materials, textures, lighting, atmosphere, color relationships, background, spatial depth,
   composition, and environmental context.

4. Use camera, lens, and photographic language only when it improves the result.
   For posters, packaging, logos, UI, diagrams, menus, typography, product renders, or graphic design tasks,
   prioritize layout, hierarchy, readability, placement, surface finish, and design structure instead of cinematic jargon.

5. If visible text must appear in the image, reproduce it exactly and wrap each literal text string in double quotes.
   Also describe where the text appears, its size, style, material, and layout.
   Never invent text unless the user's request clearly implies it.

6. If the user asks for a minimal, simple, flat, icon-like, clean, or product-focused image,
   keep the prompt restrained, precise, and uncluttered.
   Do not force cinematic, ornate, or overly dramatic detail.

7. Write in clear, literal, visual English prose.
   Avoid metaphor, poetic language, vague hype, and meta tags such as:
   masterpiece, best quality, 8k, trending on artstation, award-winning, ultra detailed.

8. Do not add extra people, objects, actions, emotions, story beats, or symbolism unless they are clearly implied by the user's request.

9. If the user's prompt is already detailed and well-structured, refine it lightly instead of rewriting it aggressively.

10. Adapt the length to the request:
   - simple/minimal prompts: 60-100 words
   - normal scenes: 100-160 words
   - complex or text-heavy scenes: 140-220 words
   Stay shorter when simplicity is part of the request.

11. You may receive prior conversation messages for context before the current request.
    Use them to understand references like "add X to it", "make it more Y", "now change the background to Z", or "remove the X".
    The conversation history tells you what the user previously requested and what was generated.
    Incorporate relevant context from prior messages into the new prompt, but always treat the latest user message as the primary intent.
    If there is no prior context, treat the current request as standalone.

Output only the final enhanced prompt as one plain paragraph.
No explanations.
No markdown.
No lists.
No quotation marks around the whole output.`;

export const ENHANCE_IMG2IMG_SYSTEM_PROMPT = `You are a prompt enhancer for Z-Image Turbo image-to-image generation.
The user has provided a reference image and wants to modify it. Your job is to turn their modification request into a clear, concrete image-generation prompt.

Your priority is: understand what they want to change about the reference image, then write a prompt that describes the desired final result.

Follow these rules strictly:

1. The user's message describes what they want to CHANGE, ADD, or REMOVE from their reference image.
   Interpret instructions like "make it red", "add sunglasses", "remove the background", "make it look like winter" as edits to the existing image.

2. Write a prompt that describes the FINAL desired image, not the edit operation itself.
   Bad: "Change the background to a beach"
   Good: "A person standing on a sandy beach with turquoise ocean waves and clear blue sky, golden sunlight"

3. Preserve elements from the user's description that should remain unchanged.
   If they say "make the cat wear a hat", the prompt should still describe the cat — just now wearing a hat.

4. If the user gives a detailed or specific instruction, follow it precisely.
   If the user gives a vague instruction like "make it better" or "improve it", enhance the overall quality descriptors: lighting, detail, composition, atmosphere.

5. Use prior conversation messages for context when available.
   The conversation history tells you what images were previously generated and what changes were requested.
   Build on this context to understand iterative refinements.

6. Keep prompts concise and focused on visual attributes:
   - Simple edits (color change, add object): 40-80 words
   - Moderate changes (style transfer, scene change): 80-140 words
   - Complex transformations: 120-180 words

7. Write in clear, literal, visual English prose.
   Avoid metaphor, poetic language, and meta tags like masterpiece, best quality, 8k, trending.

8. Do not add extra elements, people, objects, or dramatic changes unless the user requests them.
   The reference image is the baseline — respect it.

Output only the final enhanced prompt as one plain paragraph.
No explanations.
No markdown.
No lists.
No quotation marks around the whole output.`;

// ─── ComfyUIClient ────────────────────────────────────────────────────────────

export interface GenerateConfig {
  workflowJson: object;
  placeholders: PlaceholderMap;
  outputNodeId: string;
  values: {
    prompt: string;
    width: number;
    height: number;
    seed?: number;
    denoise?: number;
    referenceImage?: string; // uploaded filename on ComfyUI server
  };
}

export class ComfyUIClient {
  constructor(private baseUrl: string) {}

  async isConnected(): Promise<boolean> {
    try {
      const res = await fetch(`${this.baseUrl}/system_stats`);
      return res.ok;
    } catch {
      return false;
    }
  }

  async listModels(): Promise<ComfyModel[]> {
    const res = await fetch(`${this.baseUrl}/object_info/UNETLoader`);
    if (!res.ok) throw new Error(`ComfyUI returned ${res.status}`);
    const data = await res.json();
    const names: string[] =
      data?.UNETLoader?.input?.required?.unet_name?.[0] ?? [];
    return names.map((name) => ({ name }));
  }

  async uploadImage(buffer: Buffer, filename: string): Promise<string> {
    const formData = new FormData();
    const blob = new Blob([new Uint8Array(buffer)], { type: "image/png" });
    formData.append("image", blob, filename);
    formData.append("overwrite", "true");

    const res = await fetch(`${this.baseUrl}/upload/image`, {
      method: "POST",
      body: formData,
    });
    if (!res.ok) throw new Error(`ComfyUI image upload failed: ${res.status}`);
    const data = await res.json();
    return data.name as string;
  }

  async generate(config: GenerateConfig): Promise<{ buffer: Buffer; seed: number }> {
    const usedSeed = config.values.seed ?? Math.floor(Math.random() * 2 ** 32);
    const clientId = crypto.randomUUID();

    const workflow = this.injectValues(config.workflowJson, config.placeholders, {
      ...config.values,
      seed: usedSeed,
    });

    const submitRes = await fetch(`${this.baseUrl}/prompt`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ prompt: workflow, client_id: clientId }),
    });
    if (!submitRes.ok) {
      const errorBody = await submitRes.text().catch(() => "");
      throw new Error(`ComfyUI prompt submission failed (${submitRes.status}): ${errorBody}`);
    }
    const { prompt_id } = await submitRes.json();

    const image = await this.pollForResult(prompt_id, config.outputNodeId);
    const buffer = await this.fetchImage(image.filename, image.subfolder, image.type);
    return { buffer, seed: usedSeed };
  }

  private injectValues(
    workflowJson: object,
    placeholders: PlaceholderMap,
    values: GenerateConfig["values"] & { seed: number }
  ): object {
    // Deep clone to avoid mutating the profile's stored workflow
    const workflow = JSON.parse(JSON.stringify(workflowJson)) as Record<string, { inputs: Record<string, unknown> }>;

    const inject = (nodeId: string | undefined, field: string | undefined, value: unknown) => {
      if (!nodeId || !field || value === undefined || value === null) return;
      if (workflow[nodeId]?.inputs) {
        workflow[nodeId].inputs[field] = value;
      }
    };

    inject(placeholders.positivePrompt?.nodeId, placeholders.positivePrompt?.field, values.prompt);
    inject(placeholders.width?.nodeId, placeholders.width?.field, values.width);
    inject(placeholders.height?.nodeId, placeholders.height?.field, values.height);
    inject(placeholders.seed?.nodeId, placeholders.seed?.field, values.seed);

    if (values.denoise !== undefined) {
      inject(placeholders.denoise?.nodeId, placeholders.denoise?.field, values.denoise);
    }

    if (values.referenceImage) {
      inject(placeholders.referenceImage?.nodeId, placeholders.referenceImage?.field, values.referenceImage);
    }

    return workflow;
  }

  private async pollForResult(promptId: string, outputNodeId: string): Promise<ComfyOutputImage> {
    const TIMEOUT_MS = 120_000;
    const POLL_INTERVAL_MS = 1_000;
    const deadline = Date.now() + TIMEOUT_MS;

    while (Date.now() < deadline) {
      await new Promise((res) => setTimeout(res, POLL_INTERVAL_MS));

      const res = await fetch(`${this.baseUrl}/history/${promptId}`);
      if (!res.ok) continue;

      const history = await res.json();
      const entry = history[promptId];
      if (!entry) continue;

      const images: ComfyOutputImage[] | undefined =
        entry?.outputs?.[outputNodeId]?.images;
      if (images && images.length > 0) {
        return images[0];
      }
    }

    throw new Error("ComfyUI generation timed out");
  }

  private async fetchImage(
    filename: string,
    subfolder: string,
    type: string
  ): Promise<Buffer> {
    const params = new URLSearchParams({ filename, subfolder, type });
    const res = await fetch(`${this.baseUrl}/view?${params.toString()}`);
    if (!res.ok) throw new Error(`ComfyUI image fetch failed: ${res.status}`);
    const arrayBuffer = await res.arrayBuffer();
    return Buffer.from(arrayBuffer);
  }
}
