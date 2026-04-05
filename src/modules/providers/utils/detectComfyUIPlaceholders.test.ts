import { describe, it, expect } from "vitest";
import {
  detectComfyUIPlaceholders,
  detectWorkflowType,
  extractModelNames,
  stripNonFunctionalNodes,
} from "./detectComfyUIPlaceholders";

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

const Z_IMAGE_TURBO_WORKFLOW = {
  "16": { class_type: "UNETLoader", inputs: { unet_name: "model.safetensors" } },
  "18": { class_type: "CLIPLoader", inputs: { clip_name: "clip.safetensors" } },
  "17": { class_type: "VAELoader", inputs: { vae_name: "vae.safetensors" } },
  "11": { class_type: "ModelSamplingAuraFlow", inputs: { model: ["16", 0] } },
  "6": { class_type: "CLIPTextEncode", inputs: { clip: ["18", 0], text: "" } },
  "33": { class_type: "ConditioningZeroOut", inputs: { conditioning: ["6", 0] } },
  "13": { class_type: "EmptySD3LatentImage", inputs: { width: 1024, height: 1024, batch_size: 1 } },
  "3": {
    class_type: "KSampler",
    inputs: {
      model: ["11", 0],
      positive: ["6", 0],
      negative: ["33", 0],
      latent_image: ["13", 0],
      seed: 0,
      steps: 4,
      cfg: 1,
      sampler_name: "res_multistep",
      scheduler: "simple",
      denoise: 1.0,
    },
  },
  "8": { class_type: "VAEDecode", inputs: { samples: ["3", 0], vae: ["17", 0] } },
  "9": { class_type: "SaveImage", inputs: { filename_prefix: "mewui", images: ["8", 0] } },
};

const Z_IMAGE_TURBO_IMG2IMG_WORKFLOW = {
  ...Z_IMAGE_TURBO_WORKFLOW,
  "20": { class_type: "LoadImage", inputs: { image: "" } },
  "21": { class_type: "ImageScale", inputs: { image: ["20", 0], width: 1024, height: 1024 } },
};

describe("detectWorkflowType", () => {
  it("returns z-image-turbo when workflow contains UNETLoader", () => {
    expect(detectWorkflowType({ "1": { class_type: "UNETLoader", inputs: {} } })).toBe("z-image-turbo");
  });

  it("returns z-image-turbo when workflow contains ModelSamplingAuraFlow only", () => {
    expect(detectWorkflowType({ "1": { class_type: "ModelSamplingAuraFlow", inputs: {} } })).toBe("z-image-turbo");
  });

  it("returns z-image-turbo when workflow contains EmptySD3LatentImage only", () => {
    expect(detectWorkflowType({ "1": { class_type: "EmptySD3LatentImage", inputs: {} } })).toBe("z-image-turbo");
  });

  it("returns prefect-pony-xl when workflow contains CheckpointLoaderSimple", () => {
    expect(detectWorkflowType({ "1": { class_type: "CheckpointLoaderSimple", inputs: {} } })).toBe("prefect-pony-xl");
  });

  it("returns null for unknown workflow", () => {
    expect(detectWorkflowType({ "1": { class_type: "SomeCustomNode", inputs: {} } })).toBeNull();
  });

  it.each([null, "workflow", [1, 2, 3]])("returns null for invalid workflow input: %s", (input) => {
    expect(detectWorkflowType(input)).toBeNull();
  });
});

describe("extractModelNames", () => {
  it("extracts unet, clip and vae model names", () => {
    expect(extractModelNames(Z_IMAGE_TURBO_WORKFLOW)).toEqual({
      unet: "model.safetensors",
      clip: "clip.safetensors",
      vae: "vae.safetensors",
    });
  });

  it("returns empty object when model nodes are absent", () => {
    expect(extractModelNames(SD15_WORKFLOW)).toEqual({});
  });

  it("returns only fields present in workflow", () => {
    const workflow = {
      "1": { class_type: "UNETLoader", inputs: { unet_name: "custom_unet.safetensors" } },
      "2": { class_type: "CLIPLoader", inputs: { clip_name: "custom_clip.safetensors" } },
    };

    expect(extractModelNames(workflow)).toEqual({
      unet: "custom_unet.safetensors",
      clip: "custom_clip.safetensors",
    });
  });
});

describe("detectComfyUIPlaceholders", () => {
  it("detects all keys in a standard SD1.5 workflow", () => {
    const result = detectComfyUIPlaceholders(SD15_WORKFLOW);

    expect(result.outputNodeId).toBe("9");
    expect(result.workflowType).toBe("prefect-pony-xl");
    expect(result.placeholders.positivePrompt).toEqual({ nodeId: "6", field: "text" });
    expect(result.placeholders.negativePrompt).toEqual({ nodeId: "7", field: "text" });
    expect(result.placeholders.width).toEqual({ nodeId: "5", field: "width" });
    expect(result.placeholders.height).toEqual({ nodeId: "5", field: "height" });
    expect(result.placeholders.seed).toEqual({ nodeId: "3", field: "seed" });
    expect(result.placeholders.denoise).toEqual({ nodeId: "3", field: "denoise" });
    expect(result.missing).toHaveLength(0);
    expect(result.brokenReferences).toEqual([]);
  });

  it("detects Z-Image Turbo workflow and workflowType", () => {
    const result = detectComfyUIPlaceholders(Z_IMAGE_TURBO_WORKFLOW);

    expect(result.outputNodeId).toBe("9");
    expect(result.workflowType).toBe("z-image-turbo");
    expect(result.placeholders.positivePrompt).toEqual({ nodeId: "6", field: "text" });
    expect(result.placeholders.negativePrompt).toBeUndefined();
    expect(result.placeholders.width).toEqual({ nodeId: "13", field: "width" });
    expect(result.placeholders.height).toEqual({ nodeId: "13", field: "height" });
    expect(result.placeholders.seed).toEqual({ nodeId: "3", field: "seed" });
    expect(result.placeholders.denoise).toEqual({ nodeId: "3", field: "denoise" });
    expect(result.missing).toHaveLength(0);
  });

  it("does not map negativePrompt when KSampler negative uses ConditioningZeroOut", () => {
    const result = detectComfyUIPlaceholders(Z_IMAGE_TURBO_WORKFLOW);

    expect(result.placeholders.negativePrompt).toBeUndefined();
    expect(result.detected).not.toContain("negativePrompt");
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

  it("detects broken node reference", () => {
    const workflow = {
      ...SD15_WORKFLOW,
      "3": {
        ...SD15_WORKFLOW["3"],
        inputs: {
          ...SD15_WORKFLOW["3"].inputs,
          model: ["11", 0],
        },
      },
    };

    const result = detectComfyUIPlaceholders(workflow);
    expect(result.brokenReferences).toEqual([
      {
        nodeId: "3",
        classType: "KSampler",
        inputName: "model",
        referencedNodeId: "11",
      },
    ]);
  });

  it("returns empty brokenReferences when all node references are valid", () => {
    const result = detectComfyUIPlaceholders(SD15_WORKFLOW);
    expect(result.brokenReferences).toEqual([]);
  });

  it("detects multiple broken node references", () => {
    const workflow = {
      ...SD15_WORKFLOW,
      "3": {
        ...SD15_WORKFLOW["3"],
        inputs: {
          ...SD15_WORKFLOW["3"].inputs,
          model: ["11", 0],
          negative: ["12", 0],
        },
      },
    };

    const result = detectComfyUIPlaceholders(workflow);
    expect(result.brokenReferences).toEqual([
      {
        nodeId: "3",
        classType: "KSampler",
        inputName: "model",
        referencedNodeId: "11",
      },
      {
        nodeId: "3",
        classType: "KSampler",
        inputName: "negative",
        referencedNodeId: "12",
      },
    ]);
  });

  it("gracefully handles unknown node types only", () => {
    const workflow = {
      "1": { class_type: "SomeCustomNode", inputs: {} },
      "2": { class_type: "AnotherCustomNode", inputs: {} },
    };
    const result = detectComfyUIPlaceholders(workflow);

    expect(result.outputNodeId).toBe("9");
    expect(result.workflowType).toBeNull();
    expect(result.placeholders).toEqual({});
    expect(result.detected).toHaveLength(0);
    expect(result.brokenReferences).toEqual([]);
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
    expect(result.workflowType).toBeNull();
    expect(result.placeholders).toEqual({});
    expect(result.detected).toHaveLength(0);
    expect(result.missing.length).toBeGreaterThan(0);
  });

  it.each([null, "string", [1, 2, 3], 42])("does not throw for non-object input: %s", (input) => {
    expect(() => detectComfyUIPlaceholders(input)).not.toThrow();
    const result = detectComfyUIPlaceholders(input);
    expect(result.workflowType).toBeNull();
    expect(result.placeholders).toEqual({});
    expect(result.brokenReferences).toEqual([]);
    expect(result.outputNodeId).toBe("9");
  });

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
        inputs: {
          model: [],
          positive: ["6", 0],
          negative: ["7", 0],
          latent_image: [],
          seed: 1,
          steps: 20,
          cfg: 7,
          sampler_name: "euler",
          scheduler: "normal",
          denoise: 1.0,
        },
      },
      "4": {
        class_type: "KSampler",
        inputs: {
          model: [],
          positive: ["10", 0],
          negative: ["11", 0],
          latent_image: [],
          seed: 2,
          steps: 20,
          cfg: 7,
          sampler_name: "euler",
          scheduler: "normal",
          denoise: 0.5,
        },
      },
      "9": { class_type: "SaveImage", inputs: {} },
    };
    const result = detectComfyUIPlaceholders(workflow);

    expect(result.placeholders.seed).toEqual({ nodeId: "3", field: "seed" });
    expect(result.placeholders.positivePrompt).toEqual({ nodeId: "6", field: "text" });
    expect(result.placeholders.negativePrompt).toEqual({ nodeId: "7", field: "text" });
  });
});

describe("stripNonFunctionalNodes", () => {
  it("strips unreachable annotation node (MarkdownNote)", () => {
    const workflow = {
      ...SD15_WORKFLOW,
      "99": { class_type: "MarkdownNote", inputs: { text: "some note" } },
    };
    const result = stripNonFunctionalNodes(workflow);

    expect(Object.keys(result)).not.toContain("99");
    expect(Object.keys(result)).toContain("9"); // SaveImage
    expect(Object.keys(result)).toContain("3"); // KSampler
  });

  it("keeps all reachable nodes in a clean workflow", () => {
    const result = stripNonFunctionalNodes(SD15_WORKFLOW);

    expect(Object.keys(result).sort()).toEqual(Object.keys(SD15_WORKFLOW).sort());
  });

  it("strips multiple unreachable annotation nodes", () => {
    const workflow = {
      ...SD15_WORKFLOW,
      "98": { class_type: "Note", inputs: { text: "note 1" } },
      "99": { class_type: "MarkdownNote", inputs: { text: "note 2" } },
    };
    const result = stripNonFunctionalNodes(workflow);

    expect(Object.keys(result)).not.toContain("98");
    expect(Object.keys(result)).not.toContain("99");
    expect(Object.keys(result).sort()).toEqual(Object.keys(SD15_WORKFLOW).sort());
  });

  it("returns empty object for non-object input", () => {
    expect(stripNonFunctionalNodes(null)).toEqual({});
    expect(stripNonFunctionalNodes("string")).toEqual({});
    expect(stripNonFunctionalNodes([1, 2, 3])).toEqual({});
  });

  it("returns workflow as-is when no output node exists", () => {
    const workflow = {
      "1": { class_type: "CLIPTextEncode", inputs: { text: "hello" } },
      "2": { class_type: "KSampler", inputs: { seed: 0 } },
    };
    const result = stripNonFunctionalNodes(workflow);

    expect(Object.keys(result).sort()).toEqual(["1", "2"]);
  });

  it("handles workflow with multiple output nodes", () => {
    const workflow = {
      ...SD15_WORKFLOW,
      "10": { class_type: "SaveImage", inputs: { images: ["8", 0] } },
      "99": { class_type: "MarkdownNote", inputs: {} },
    };
    const result = stripNonFunctionalNodes(workflow);

    expect(Object.keys(result)).toContain("9");
    expect(Object.keys(result)).toContain("10");
    expect(Object.keys(result)).not.toContain("99");
  });
});
