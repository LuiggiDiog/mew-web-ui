import { env } from "@/env";

export interface ComfyModel {
  name: string;
}

interface ComfyOutputImage {
  filename: string;
  subfolder: string;
  type: string;
}

export class ComfyUIClient {
  constructor(private baseUrl: string) {}

  async isConnected(): Promise<boolean> {
    try {
      const res = await fetch(`${this.baseUrl}/object_info/UNETLoader`);
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

  async generate(prompt: string, width: number = 1024, height: number = 1024): Promise<Buffer> {
    const clientId = crypto.randomUUID();
    const workflow = this.buildWorkflow(prompt, width, height);

    const submitRes = await fetch(`${this.baseUrl}/prompt`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ prompt: workflow, client_id: clientId }),
    });
    if (!submitRes.ok) throw new Error(`ComfyUI prompt submission failed: ${submitRes.status}`);
    const { prompt_id } = await submitRes.json();

    const image = await this.pollForResult(prompt_id);
    return this.fetchImage(image.filename, image.subfolder, image.type);
  }

  private async pollForResult(promptId: string): Promise<ComfyOutputImage> {
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
        entry?.outputs?.["9"]?.images;
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

  // Z-Image Turbo workflow (matches z_image_turbo_example)
  // Models: z_image_turbo_nvfp4.safetensors (UNET) + qwen_3_4b_fp4_mixed.safetensors (CLIP) + ae.safetensors (VAE)
  private buildWorkflow(prompt: string, width: number = 1024, height: number = 1024): object {
    return {
      // UNET model loader
      "16": {
        class_type: "UNETLoader",
        inputs: {
          unet_name: env.comfyuiUnetModel,
          weight_dtype: "default",
        },
      },
      // CLIP / text encoder (Qwen 3 4B)
      "18": {
        class_type: "CLIPLoader",
        inputs: {
          clip_name: env.comfyuiClipModel,
          type: "lumina2",
          device: "default",
        },
      },
      // VAE
      "17": {
        class_type: "VAELoader",
        inputs: {
          vae_name: env.comfyuiVaeModel,
        },
      },
      // AuraFlow-compatible sampling shift
      "11": {
        class_type: "ModelSamplingAuraFlow",
        inputs: {
          model: ["16", 0],
          shift: 3,
        },
      },
      // Positive prompt
      "6": {
        class_type: "CLIPTextEncode",
        inputs: {
          clip: ["18", 0],
          text: prompt,
        },
      },
      // Negative prompt
      "7": {
        class_type: "CLIPTextEncode",
        inputs: {
          clip: ["18", 0],
          text: "blurry ugly bad",
        },
      },
      // Latent image
      "13": {
        class_type: "EmptySD3LatentImage",
        inputs: { width, height, batch_size: 1 },
      },
      // Sampler (9 steps, euler/simple as in original)
      "3": {
        class_type: "KSampler",
        inputs: {
          model: ["11", 0],
          positive: ["6", 0],
          negative: ["7", 0],
          latent_image: ["13", 0],
          seed: Math.floor(Math.random() * 2 ** 32),
          steps: 9,
          cfg: 1,
          sampler_name: "euler",
          scheduler: "simple",
          denoise: 1.0,
        },
      },
      // Decode
      "8": {
        class_type: "VAEDecode",
        inputs: { samples: ["3", 0], vae: ["17", 0] },
      },
      // Save
      "9": {
        class_type: "SaveImage",
        inputs: { filename_prefix: "mewui", images: ["8", 0] },
      },
    };
  }
}
