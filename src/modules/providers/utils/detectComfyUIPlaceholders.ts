import type { PlaceholderMap } from "@/modules/providers/repositories/comfyui-profiles-repository";

interface ComfyNode {
  class_type: string;
  inputs: Record<string, unknown>;
}

type ComfyWorkflow = Record<string, ComfyNode>;

export interface DetectionResult {
  placeholders: PlaceholderMap;
  outputNodeId: string;
  detected: string[];
  missing: string[];
}

const REQUIRED_KEYS = ["outputNodeId", "positivePrompt", "negativePrompt", "width", "height", "seed", "denoise"];
const OUTPUT_TYPES = new Set(["SaveImage", "PreviewImage"]);
const SAMPLER_TYPES = new Set(["KSampler", "KSamplerAdvanced"]);
const LATENT_TYPES = new Set(["EmptyLatentImage", "EmptySD3LatentImage"]);

export function detectComfyUIPlaceholders(workflow: unknown): DetectionResult {
  const placeholders: PlaceholderMap = {};
  const detected: string[] = [];
  const missing: string[] = [];

  if (
    typeof workflow !== "object" ||
    workflow === null ||
    Array.isArray(workflow)
  ) {
    return { placeholders, outputNodeId: "9", detected, missing: [...REQUIRED_KEYS] };
  }

  const wf = workflow as ComfyWorkflow;
  const entries = Object.entries(wf);

  // ── Output node ───────────────────────────────────────────────────────────
  let outputNodeId = "9";
  const outputEntry = entries.find(([, node]) => OUTPUT_TYPES.has(node?.class_type));
  if (outputEntry) {
    outputNodeId = outputEntry[0];
    detected.push("outputNodeId");
  } else {
    missing.push("outputNodeId");
  }

  // ── KSampler ─────────────────────────────────────────────────────────────
  const samplerEntry = entries.find(([, node]) => SAMPLER_TYPES.has(node?.class_type));
  if (samplerEntry) {
    const [samplerId, samplerNode] = samplerEntry;

    // seed
    if (typeof samplerNode.inputs.seed === "number") {
      placeholders.seed = { nodeId: samplerId, field: "seed" };
      detected.push("seed");
    } else {
      missing.push("seed");
    }

    // denoise
    if (typeof samplerNode.inputs.denoise === "number") {
      placeholders.denoise = { nodeId: samplerId, field: "denoise" };
      detected.push("denoise");
    } else {
      missing.push("denoise");
    }

    // positivePrompt — trace the "positive" link: ["nodeId", outputIndex]
    const posLink = samplerNode.inputs.positive;
    if (Array.isArray(posLink) && typeof posLink[0] === "string") {
      const posNode = wf[posLink[0]];
      if (posNode?.class_type === "CLIPTextEncode") {
        placeholders.positivePrompt = { nodeId: posLink[0], field: "text" };
        detected.push("positivePrompt");
      } else {
        missing.push("positivePrompt");
      }
    } else {
      missing.push("positivePrompt");
    }

    // negativePrompt — trace the "negative" link
    const negLink = samplerNode.inputs.negative;
    if (Array.isArray(negLink) && typeof negLink[0] === "string") {
      const negNode = wf[negLink[0]];
      if (negNode?.class_type === "CLIPTextEncode") {
        placeholders.negativePrompt = { nodeId: negLink[0], field: "text" };
        detected.push("negativePrompt");
      } else {
        missing.push("negativePrompt");
      }
    } else {
      missing.push("negativePrompt");
    }
  } else {
    missing.push("seed", "denoise", "positivePrompt", "negativePrompt");
  }

  // ── Latent image (dimensions) ─────────────────────────────────────────────
  const latentEntry = entries.find(([, node]) => LATENT_TYPES.has(node?.class_type));
  if (latentEntry) {
    const [latentId] = latentEntry;
    placeholders.width = { nodeId: latentId, field: "width" };
    placeholders.height = { nodeId: latentId, field: "height" };
    detected.push("width", "height");
  } else {
    missing.push("width", "height");
  }

  // ── Reference image (optional) ────────────────────────────────────────────
  const loadImageEntry = entries.find(([, node]) => node?.class_type === "LoadImage");
  if (loadImageEntry) {
    placeholders.referenceImage = { nodeId: loadImageEntry[0], field: "image" };
    detected.push("referenceImage");
  }

  return { placeholders, outputNodeId, detected, missing };
}
