import type { PlaceholderMap } from "@/modules/providers/repositories/comfyui-profiles-repository";
import { stripNonFunctionalNodes } from "@/modules/providers/utils/detectComfyUIPlaceholders";

export interface ComfyModel {
  name: string;
}

interface ComfyOutputImage {
  filename: string;
  subfolder: string;
  type: string;
}

// ─── System prompts ───────────────────────────────────────────────────────────

export const TRANSLATE_TO_CHINESE_SYSTEM_PROMPT = `You are a prompt translator for image generation.
Translate the user's image-generation prompt to Chinese (Simplified).

Follow these rules strictly:

1. Translate the entire prompt to Chinese (Simplified).
2. Text enclosed in double quotes ("") must NOT be translated. Preserve the quoted text exactly as-is, including the quotes.
3. Keep the same structure, meaning, and level of detail as the original.
4. Do not add, remove, or reinterpret any visual elements.
5. Do not add explanations, commentary, or markdown.
6. If the prompt contains booru-style tags (comma-separated short phrases), translate each tag individually while preserving the comma-separated format.

Output only the translated prompt.
No explanations.
No markdown.
No lists.
No quotation marks around the whole output.`;

export const CONTEXT_MERGE_SYSTEM_PROMPT = `You are a context merger for an iterative image-generation conversation.
The user sends multiple messages that iteratively describe and modify an image.
Your job is to merge ALL messages into ONE coherent image description that reflects the final desired state.

Follow these rules strictly:

1. The user may write in Spanish, English, or mixed. Output in the SAME language as the latest message.
2. When the latest message contradicts an earlier one, the latest message wins.
   Example: previous said "red hair", now says "brown hair" -> keep only "brown hair".
3. When the latest message adds to the description, incorporate it.
   Example: "a woman" then "on the beach" -> "a woman on the beach".
4. When the latest message removes something, omit it from the result.
5. Keep all previous elements that are not contradicted or removed.
6. Output a single natural-language description of the final image. No explanations. No lists. No markdown.
7. Keep it concise (1-3 sentences).`;

// ─── Workflow presets ─────────────────────────────────────────────────────────

export const Z_IMAGE_TURBO_OUTPUT_NODE = "9";
export const PREFECT_PONY_XL_OUTPUT_NODE = "9";

export const Z_IMAGE_TURBO_PLACEHOLDERS: PlaceholderMap = {
  positivePrompt: { nodeId: "6", field: "text" },
  width:          { nodeId: "13", field: "width" },
  height:         { nodeId: "13", field: "height" },
  seed:           { nodeId: "3", field: "seed" },
  denoise:        { nodeId: "3", field: "denoise" },
};

export const Z_IMAGE_TURBO_IMG2IMG_PLACEHOLDERS: PlaceholderMap = {
  positivePrompt: { nodeId: "6", field: "text" },
  width:          { nodeId: "21", field: "width" },
  height:         { nodeId: "21", field: "height" },
  seed:           { nodeId: "3", field: "seed" },
  denoise:        { nodeId: "3", field: "denoise" },
  referenceImage: { nodeId: "20", field: "image" },
};

export const PREFECT_PONY_XL_PLACEHOLDERS: PlaceholderMap = {
  positivePrompt: { nodeId: "6", field: "text" },
  negativePrompt: { nodeId: "7", field: "text" },
  width:          { nodeId: "5", field: "width" },
  height:         { nodeId: "5", field: "height" },
  seed:           { nodeId: "3", field: "seed" },
  denoise:        { nodeId: "3", field: "denoise" },
};

export const Z_IMAGE_TURBO_ENHANCE_SYSTEM_PROMPT = `You are a prompt enhancer for Z-Image Turbo, a distilled flow-matching image generation model.
Write a cinematic scene description in natural-language prose.

Rules:

1. The user may write in Spanish or English. Output in English only.
2. Write descriptive prose — not booru tags, not bullet lists, not comma-separated phrases.
3. Cover visual elements: subject, appearance, actions, setting, lighting, mood, style, composition.
4. Length: 60-220 words. Be specific and vivid.
5. Faithfully represent EVERYTHING the user described. Do not drop, substitute, or add elements the user did not mention.
6. Do not add explanations, disclaimers, or markdown.
7. If given prior conversation messages, apply iterative modifications:
   replace contradicted elements, add new ones, remove deleted ones, keep the rest.

Output only the scene description. No preamble.`;

/** Build a Z-Image Turbo txt2img workflow with the given model names. */
export function buildZImageTurboWorkflow(unet: string, clip: string, vae: string): object {
  return {
    "16": { class_type: "UNETLoader",            inputs: { unet_name: unet, weight_dtype: "default" } },
    "11": { class_type: "ModelSamplingAuraFlow",  inputs: { model: ["16", 0], shift: 3.0 } },
    "18": { class_type: "CLIPLoader",             inputs: { clip_name: clip, type: "lumina2" } },
    "17": { class_type: "VAELoader",              inputs: { vae_name: vae } },
    "6":  { class_type: "CLIPTextEncode",         inputs: { text: "", clip: ["18", 0] } },
    "15": { class_type: "CLIPTextEncode",         inputs: { text: "", clip: ["18", 0] } },
    "12": { class_type: "ConditioningZeroOut",    inputs: { conditioning: ["15", 0] } },
    "13": { class_type: "EmptySD3LatentImage",    inputs: { width: 832, height: 1216, batch_size: 1 } },
    "3":  { class_type: "KSampler",              inputs: {
      model: ["11", 0], positive: ["6", 0], negative: ["12", 0], latent_image: ["13", 0],
      seed: 42, sampler_name: "res_multistep", scheduler: "simple", steps: 4, cfg: 1, denoise: 1.0,
    }},
    "8":  { class_type: "VAEDecode",              inputs: { samples: ["3", 0], vae: ["17", 0] } },
    "9":  { class_type: "SaveImage",              inputs: { images: ["8", 0], filename_prefix: "ComfyUI" } },
  };
}

/** Build a Z-Image Turbo img2img workflow with the given model names. */
export function buildZImageTurboImg2ImgWorkflow(unet: string, clip: string, vae: string): object {
  return {
    "16": { class_type: "UNETLoader",            inputs: { unet_name: unet, weight_dtype: "default" } },
    "11": { class_type: "ModelSamplingAuraFlow",  inputs: { model: ["16", 0], shift: 3.0 } },
    "18": { class_type: "CLIPLoader",             inputs: { clip_name: clip, type: "lumina2" } },
    "17": { class_type: "VAELoader",              inputs: { vae_name: vae } },
    "6":  { class_type: "CLIPTextEncode",         inputs: { text: "", clip: ["18", 0] } },
    "15": { class_type: "CLIPTextEncode",         inputs: { text: "", clip: ["18", 0] } },
    "12": { class_type: "ConditioningZeroOut",    inputs: { conditioning: ["15", 0] } },
    "20": { class_type: "LoadImage",              inputs: { image: "", upload: "image" } },
    "21": { class_type: "ImageScale",             inputs: { image: ["20", 0], upscale_method: "lanczos", width: 832, height: 1216, crop: "center" } },
    "22": { class_type: "VAEEncode",              inputs: { pixels: ["21", 0], vae: ["17", 0] } },
    "3":  { class_type: "KSampler",              inputs: {
      model: ["11", 0], positive: ["6", 0], negative: ["12", 0], latent_image: ["22", 0],
      seed: 42, sampler_name: "res_multistep", scheduler: "simple", steps: 4, cfg: 1, denoise: 0.65,
    }},
    "8":  { class_type: "VAEDecode",              inputs: { samples: ["3", 0], vae: ["17", 0] } },
    "9":  { class_type: "SaveImage",              inputs: { images: ["8", 0], filename_prefix: "ComfyUI" } },
  };
}

/** Build a Prefect Pony XL txt2img workflow with the given checkpoint name. */
export function buildPrefectPonyXLWorkflow(checkpoint: string): object {
  return {
    "4":  { class_type: "CheckpointLoaderSimple", inputs: { ckpt_name: checkpoint } },
    "10": { class_type: "CLIPSetLastLayer",        inputs: { clip: ["4", 1], stop_at_clip_layer: -2 } },
    "6":  { class_type: "CLIPTextEncode",          inputs: { text: "", clip: ["10", 0] } },
    "7":  { class_type: "CLIPTextEncode",          inputs: { text: "", clip: ["10", 0] } },
    "5":  { class_type: "EmptyLatentImage",        inputs: { width: 832, height: 1216, batch_size: 1 } },
    "3":  { class_type: "KSampler",               inputs: {
      model: ["4", 0], positive: ["6", 0], negative: ["7", 0], latent_image: ["5", 0],
      seed: 42, sampler_name: "euler_ancestral", scheduler: "simple", steps: 25, cfg: 6.8, denoise: 1,
    }},
    "8":  { class_type: "VAEDecode",               inputs: { samples: ["3", 0], vae: ["4", 2] } },
    "9":  { class_type: "SaveImage",               inputs: { images: ["8", 0], filename_prefix: "ComfyUI" } },
  };
}

// ─── ComfyUIClient ────────────────────────────────────────────────────────────

export interface GenerateConfig {
  workflowJson: object;
  placeholders: PlaceholderMap;
  outputNodeId: string;
  values: {
    prompt: string;
    negativePrompt?: string;
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

    const workflow = this.injectValues(
      stripNonFunctionalNodes(config.workflowJson),
      config.placeholders,
      { ...config.values, seed: usedSeed },
    );

    this.validateNodeReferences(workflow);

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
    inject(placeholders.negativePrompt?.nodeId, placeholders.negativePrompt?.field, values.negativePrompt);
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

  /** Throws a clear error if any node input references a node ID that doesn't exist in the workflow. */
  private validateNodeReferences(workflow: object): void {
    const wf = workflow as Record<string, { inputs?: Record<string, unknown> }>;
    const nodeIds = new Set(Object.keys(wf));

    for (const [id, node] of Object.entries(wf)) {
      if (!node.inputs) continue;
      for (const [inputName, value] of Object.entries(node.inputs)) {
        if (Array.isArray(value) && typeof value[0] === "string" && !nodeIds.has(value[0])) {
          throw new Error(
            `Workflow is invalid: node "${id}" (${(node as Record<string, unknown>).class_type ?? "unknown"}) ` +
            `input "${inputName}" references node "${value[0]}" which does not exist. ` +
            `Present nodes: [${[...nodeIds].join(", ")}]. ` +
            `Please edit this profile and re-apply the correct preset workflow.`
          );
        }
      }
    }
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
