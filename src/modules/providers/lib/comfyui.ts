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
      const res = await fetch(`${this.baseUrl}/object_info/CheckpointLoaderSimple`);
      return res.ok;
    } catch {
      return false;
    }
  }

  async listModels(): Promise<ComfyModel[]> {
    const res = await fetch(`${this.baseUrl}/object_info/CheckpointLoaderSimple`);
    if (!res.ok) throw new Error(`ComfyUI returned ${res.status}`);
    const data = await res.json();
    const names: string[] =
      data?.CheckpointLoaderSimple?.input?.required?.ckpt_name?.[0] ?? [];
    return names.map((name) => ({ name }));
  }

  async generate(prompt: string, model: string): Promise<Buffer> {
    const clientId = crypto.randomUUID();
    const workflow = this.buildWorkflow(prompt, model);

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

  private buildWorkflow(prompt: string, model: string): object {
    return {
      "3": {
        class_type: "KSampler",
        inputs: {
          model: ["4", 0],
          positive: ["6", 0],
          negative: ["7", 0],
          latent_image: ["5", 0],
          seed: Math.floor(Math.random() * 2 ** 32),
          steps: 20,
          cfg: 7.0,
          sampler_name: "euler",
          scheduler: "karras",
          denoise: 1.0,
        },
      },
      "4": {
        class_type: "CheckpointLoaderSimple",
        inputs: { ckpt_name: model },
      },
      "5": {
        class_type: "EmptyLatentImage",
        inputs: { width: 512, height: 512, batch_size: 1 },
      },
      "6": {
        class_type: "CLIPTextEncode",
        inputs: { clip: ["4", 1], text: prompt },
      },
      "7": {
        class_type: "CLIPTextEncode",
        inputs: {
          clip: ["4", 1],
          text: "nsfw, blurry, bad anatomy, watermark, low quality",
        },
      },
      "8": {
        class_type: "VAEDecode",
        inputs: { samples: ["3", 0], vae: ["4", 2] },
      },
      "9": {
        class_type: "SaveImage",
        inputs: { filename_prefix: "mewui", images: ["8", 0] },
      },
    };
  }
}
