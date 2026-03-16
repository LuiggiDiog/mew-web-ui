import { describe, it, expect } from "vitest";
import { detectComfyUIPlaceholders } from "./detectComfyUIPlaceholders";

// ── Workflow fixtures ──────────────────────────────────────────────────────────

/** Standard SD1.5 workflow — all 7 keys detectable */
const SD15_WORKFLOW = {
  "4": { class_type: "CheckpointLoaderSimple", inputs: { ckpt_name: "v1-5.safetensors" } },
  "6": { class_type: "CLIPTextEncode", inputs: { clip: ["4", 1], text: "" } },
  "7": { class_type: "CLIPTextEncode", inputs: { clip: ["4", 1], text: "bad quality" } },
  "5": { class_type: "EmptyLatentImage", inputs: { width: 512, height: 512, batch_size: 1 } },
  "3": {
    class_type: "KSampler",
    inputs: {
      model: ["4", 0],
      positive: ["6", 0],
      negative: ["7", 0],
      latent_image: ["5", 0],
      seed: 42,
      steps: 20,
      cfg: 7,
      sampler_name: "euler",
      scheduler: "normal",
      denoise: 1.0,
    },
  },
  "8": { class_type: "VAEDecode", inputs: { samples: ["3", 0], vae: ["4", 2] } },
  "9": { class_type: "SaveImage", inputs: { filename_prefix: "ComfyUI", images: ["8", 0] } },
};

/** Z-Image Turbo / SD3 workflow — EmptySD3LatentImage */
const Z_IMAGE_TURBO_WORKFLOW = {
  "16": { class_type: "UNETLoader", inputs: { unet_name: "model.safetensors" } },
  "18": { class_type: "CLIPLoader", inputs: { clip_name: "clip.safetensors" } },
  "17": { class_type: "VAELoader", inputs: { vae_name: "vae.safetensors" } },
  "11": { class_type: "ModelSamplingAuraFlow", inputs: { model: ["16", 0] } },
  "6": { class_type: "CLIPTextEncode", inputs: { clip: ["18", 0], text: "" } },
  "7": { class_type: "CLIPTextEncode", inputs: { clip: ["18", 0], text: "blurry ugly bad" } },
  "13": { class_type: "EmptySD3LatentImage", inputs: { width: 1024, height: 1024, batch_size: 1 } },
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
  "8": { class_type: "VAEDecode", inputs: { samples: ["3", 0], vae: ["17", 0] } },
  "9": { class_type: "SaveImage", inputs: { filename_prefix: "mewui", images: ["8", 0] } },
};

/** Z-Image Turbo img2img — has LoadImage (node 20) but no EmptyLatentImage */
const Z_IMAGE_TURBO_IMG2IMG_WORKFLOW = {
  ...Z_IMAGE_TURBO_WORKFLOW,
  "20": { class_type: "LoadImage", inputs: { image: "" } },
  "21": { class_type: "ImageScale", inputs: { image: ["20", 0], width: 1024, height: 1024 } },
};

// ── Tests ─────────────────────────────────────────────────────────────────────

describe("detectComfyUIPlaceholders", () => {
  it("detects all keys in a standard SD1.5 workflow", () => {
    const result = detectComfyUIPlaceholders(SD15_WORKFLOW);

    expect(result.outputNodeId).toBe("9");
    expect(result.placeholders.positivePrompt).toEqual({ nodeId: "6", field: "text" });
    expect(result.placeholders.negativePrompt).toEqual({ nodeId: "7", field: "text" });
    expect(result.placeholders.width).toEqual({ nodeId: "5", field: "width" });
    expect(result.placeholders.height).toEqual({ nodeId: "5", field: "height" });
    expect(result.placeholders.seed).toEqual({ nodeId: "3", field: "seed" });
    expect(result.placeholders.denoise).toEqual({ nodeId: "3", field: "denoise" });
    expect(result.detected).toContain("outputNodeId");
    expect(result.detected).toContain("positivePrompt");
    expect(result.detected).toContain("negativePrompt");
    expect(result.detected).toContain("width");
    expect(result.detected).toContain("height");
    expect(result.detected).toContain("seed");
    expect(result.detected).toContain("denoise");
    expect(result.missing).toHaveLength(0);
  });

  it("detects Z-Image Turbo workflow matching known constants", () => {
    const result = detectComfyUIPlaceholders(Z_IMAGE_TURBO_WORKFLOW);

    expect(result.outputNodeId).toBe("9");
    expect(result.placeholders.positivePrompt).toEqual({ nodeId: "6", field: "text" });
    expect(result.placeholders.negativePrompt).toEqual({ nodeId: "7", field: "text" });
    expect(result.placeholders.width).toEqual({ nodeId: "13", field: "width" });
    expect(result.placeholders.height).toEqual({ nodeId: "13", field: "height" });
    expect(result.placeholders.seed).toEqual({ nodeId: "3", field: "seed" });
    expect(result.placeholders.denoise).toEqual({ nodeId: "3", field: "denoise" });
    expect(result.missing).toHaveLength(0);
  });

  it("detects referenceImage in img2img workflow", () => {
    const result = detectComfyUIPlaceholders(Z_IMAGE_TURBO_IMG2IMG_WORKFLOW);

    expect(result.placeholders.referenceImage).toEqual({ nodeId: "20", field: "image" });
    expect(result.detected).toContain("referenceImage");
  });

  it("does not add referenceImage to missing when LoadImage is absent", () => {
    const result = detectComfyUIPlaceholders(SD15_WORKFLOW);

    expect(result.placeholders.referenceImage).toBeUndefined();
    expect(result.missing).not.toContain("referenceImage");
  });

  it("gracefully handles unknown node types only", () => {
    const workflow = {
      "1": { class_type: "SomeCustomNode", inputs: {} },
      "2": { class_type: "AnotherCustomNode", inputs: {} },
    };
    const result = detectComfyUIPlaceholders(workflow);

    expect(result.outputNodeId).toBe("9");
    expect(result.placeholders).toEqual({});
    expect(result.detected).toHaveLength(0);
    expect(result.missing).toContain("outputNodeId");
    expect(result.missing).toContain("positivePrompt");
    expect(result.missing).toContain("negativePrompt");
    expect(result.missing).toContain("width");
    expect(result.missing).toContain("height");
    expect(result.missing).toContain("seed");
    expect(result.missing).toContain("denoise");
  });

  it("gracefully handles empty workflow", () => {
    const result = detectComfyUIPlaceholders({});

    expect(result.outputNodeId).toBe("9");
    expect(result.placeholders).toEqual({});
    expect(result.detected).toHaveLength(0);
    expect(result.missing.length).toBeGreaterThan(0);
  });

  it.each([null, "string", [1, 2, 3], 42])(
    "does not throw for non-object input: %s",
    (input) => {
      expect(() => detectComfyUIPlaceholders(input)).not.toThrow();
      const result = detectComfyUIPlaceholders(input);
      expect(result.placeholders).toEqual({});
      expect(result.outputNodeId).toBe("9");
    }
  );

  it("handles KSamplerAdvanced the same as KSampler", () => {
    const workflow = {
      ...SD15_WORKFLOW,
      "3": { ...SD15_WORKFLOW["3"], class_type: "KSamplerAdvanced" },
    };
    const result = detectComfyUIPlaceholders(workflow);

    expect(result.placeholders.seed).toEqual({ nodeId: "3", field: "seed" });
    expect(result.placeholders.denoise).toEqual({ nodeId: "3", field: "denoise" });
    expect(result.placeholders.positivePrompt).toEqual({ nodeId: "6", field: "text" });
  });

  it("detects PreviewImage as the output node", () => {
    const workflow = {
      ...SD15_WORKFLOW,
      "9": { class_type: "PreviewImage", inputs: { images: ["8", 0] } },
    };
    const result = detectComfyUIPlaceholders(workflow);

    expect(result.outputNodeId).toBe("9");
    expect(result.detected).toContain("outputNodeId");
  });

  it("uses first insertion-order KSampler when multiple exist", () => {
    const workflow = {
      "6": { class_type: "CLIPTextEncode", inputs: { text: "" } },
      "7": { class_type: "CLIPTextEncode", inputs: { text: "bad" } },
      "10": { class_type: "CLIPTextEncode", inputs: { text: "another positive" } },
      "11": { class_type: "CLIPTextEncode", inputs: { text: "another negative" } },
      "5": { class_type: "EmptyLatentImage", inputs: { width: 512, height: 512, batch_size: 1 } },
      "3": {
        class_type: "KSampler",
        inputs: { model: [], positive: ["6", 0], negative: ["7", 0], latent_image: [], seed: 1, steps: 20, cfg: 7, sampler_name: "euler", scheduler: "normal", denoise: 1.0 },
      },
      "4": {
        class_type: "KSampler",
        inputs: { model: [], positive: ["10", 0], negative: ["11", 0], latent_image: [], seed: 2, steps: 20, cfg: 7, sampler_name: "euler", scheduler: "normal", denoise: 0.5 },
      },
      "9": { class_type: "SaveImage", inputs: {} },
    };
    const result = detectComfyUIPlaceholders(workflow);

    // Node "3" comes first in insertion order
    expect(result.placeholders.seed).toEqual({ nodeId: "3", field: "seed" });
    expect(result.placeholders.positivePrompt).toEqual({ nodeId: "6", field: "text" });
    expect(result.placeholders.negativePrompt).toEqual({ nodeId: "7", field: "text" });
  });
});
