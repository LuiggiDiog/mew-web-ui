import type { PlaceholderMap } from "@/modules/providers/repositories/comfyui-profiles-repository";

interface ComfyNode {
  class_type: string;
  inputs: Record<string, unknown>;
}

type ComfyWorkflow = Record<string, ComfyNode>;

export interface BrokenReference {
  nodeId: string;
  classType: string;
  inputName: string;
  referencedNodeId: string;
}

export type WorkflowType = "z-image-turbo" | "prefect-pony-xl" | null;

export interface ExtractedModels {
  unet?: string;
  clip?: string;
  vae?: string;
}

export interface DetectionResult {
  placeholders: PlaceholderMap;
  outputNodeId: string;
  detected: string[];
  missing: string[];
  brokenReferences: BrokenReference[];
  workflowType: WorkflowType;
}

/** Detect if a workflow matches a known supported type based on its node class_types. */
export function detectWorkflowType(workflow: unknown): WorkflowType {
  if (typeof workflow !== "object" || workflow === null || Array.isArray(workflow)) return null;
  const classTypes = new Set(
    Object.values(workflow as Record<string, { class_type?: string }>)
      .map((n) => n?.class_type)
      .filter(Boolean) as string[]
  );
  if (classTypes.has("UNETLoader") || classTypes.has("ModelSamplingAuraFlow") || classTypes.has("EmptySD3LatentImage")) {
    return "z-image-turbo";
  }
  if (classTypes.has("CheckpointLoaderSimple")) {
    return "prefect-pony-xl";
  }
  return null;
}

/** Extract model filenames from a workflow for use when applying a preset. */
export function extractModelNames(workflow: unknown): ExtractedModels {
  if (typeof workflow !== "object" || workflow === null || Array.isArray(workflow)) return {};
  const result: ExtractedModels = {};
  for (const node of Object.values(workflow as Record<string, { class_type?: string; inputs?: Record<string, unknown> }>)) {
    if (!node?.class_type || !node.inputs) continue;
    if (node.class_type === "UNETLoader" && typeof node.inputs.unet_name === "string") {
      result.unet = node.inputs.unet_name;
    }
    if (node.class_type === "CLIPLoader" && typeof node.inputs.clip_name === "string") {
      result.clip = node.inputs.clip_name;
    }
    if (node.class_type === "VAELoader" && typeof node.inputs.vae_name === "string") {
      result.vae = node.inputs.vae_name;
    }
  }
  return result;
}

/**
 * Remove nodes not reachable from any output node (SaveImage/PreviewImage).
 * Strips annotation/visual-only nodes (MarkdownNote, Note, etc.) that cause
 * errors when submitted to the ComfyUI API.
 * If no output node is found, returns the workflow unchanged (safety fallback).
 */
export function stripNonFunctionalNodes(workflow: unknown): ComfyWorkflow {
  if (typeof workflow !== "object" || workflow === null || Array.isArray(workflow)) return {};

  const wf = workflow as ComfyWorkflow;
  const entries = Object.entries(wf);

  const outputIds = entries
    .filter(([, node]) => node?.class_type === "SaveImage" || node?.class_type === "PreviewImage")
    .map(([id]) => id);

  if (outputIds.length === 0) return { ...wf };

  const reachable = new Set<string>();
  const queue = [...outputIds];

  while (queue.length > 0) {
    const nodeId = queue.pop()!;
    if (reachable.has(nodeId)) continue;
    reachable.add(nodeId);

    const node = wf[nodeId];
    if (!node?.inputs) continue;

    for (const value of Object.values(node.inputs)) {
      if (Array.isArray(value) && typeof value[0] === "string" && wf[value[0]] && !reachable.has(value[0])) {
        queue.push(value[0]);
      }
    }
  }

  const clean: ComfyWorkflow = {};
  for (const id of reachable) clean[id] = wf[id];
  return clean;
}

const REQUIRED_KEYS = ["outputNodeId", "positivePrompt", "width", "height", "seed", "denoise"];
const OUTPUT_TYPES = new Set(["SaveImage", "PreviewImage"]);
const SAMPLER_TYPES = new Set(["KSampler", "KSamplerAdvanced"]);
const LATENT_TYPES = new Set(["EmptyLatentImage", "EmptySD3LatentImage"]);

export function detectComfyUIPlaceholders(workflow: unknown): DetectionResult {
  const placeholders: PlaceholderMap = {};
  const detected: string[] = [];
  const missing: string[] = [];
  const brokenReferences: BrokenReference[] = [];

  if (
    typeof workflow !== "object" ||
    workflow === null ||
    Array.isArray(workflow)
  ) {
    return { placeholders, outputNodeId: "9", detected, missing: [...REQUIRED_KEYS], brokenReferences, workflowType: null };
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
    // Only detected when the negative input is a CLIPTextEncode node.
    // Distilled models (e.g. Z-Image Turbo) use ConditioningZeroOut instead,
    // which has no text field — negativePrompt is simply not applicable.
    const negLink = samplerNode.inputs.negative;
    if (Array.isArray(negLink) && typeof negLink[0] === "string") {
      const negNode = wf[negLink[0]];
      if (negNode?.class_type === "CLIPTextEncode") {
        placeholders.negativePrompt = { nodeId: negLink[0], field: "text" };
        detected.push("negativePrompt");
      }
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

  // ── Validate node references ──────────────────────────────────────────────
  const nodeIds = new Set(Object.keys(wf));
  for (const [id, node] of entries) {
    if (!node?.inputs) continue;
    for (const [inputName, value] of Object.entries(node.inputs)) {
      if (Array.isArray(value) && typeof value[0] === "string" && !nodeIds.has(value[0])) {
        brokenReferences.push({
          nodeId: id,
          classType: node.class_type ?? "unknown",
          inputName,
          referencedNodeId: value[0],
        });
      }
    }
  }

  return { placeholders, outputNodeId, detected, missing, brokenReferences, workflowType: detectWorkflowType(workflow) };
}
