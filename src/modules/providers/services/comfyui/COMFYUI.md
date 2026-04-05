# ComfyUI Integration

## What is ComfyUI

ComfyUI is an external image generation server with a node-based workflow engine.
Mew WebUI connects to it via its REST API to generate images from text prompts.

## Workflow JSON Structure

A ComfyUI API workflow is a JSON object where:
- **Keys** are string node IDs (e.g. `"3"`, `"8"`, `"33"`)
- **Values** have `class_type` (the node type) and `inputs` (configuration)
- **Node references** use the tuple format `["nodeId", outputIndex]`

Example:
```json
{
  "3": {
    "class_type": "KSampler",
    "inputs": {
      "model": ["11", 0],
      "positive": ["6", 0],
      "negative": ["33", 0],
      "seed": 0,
      "steps": 4
    }
  }
}
```

## Placeholder System

`PlaceholderMap` maps semantic names to specific node IDs and field names within a workflow.
This lets the app inject runtime values (prompt, dimensions, seed) without knowing the full workflow structure.

```typescript
type PlaceholderMap = {
  positivePrompt?: { nodeId: string; field: string };
  negativePrompt?: { nodeId: string; field: string };  // optional, not used by distilled models
  width?: { nodeId: string; field: string };
  height?: { nodeId: string; field: string };
  seed?: { nodeId: string; field: string };
  denoise?: { nodeId: string; field: string };
  referenceImage?: { nodeId: string; field: string };  // img2img only
};
```

## Supported Workflow Types

### Z-Image Turbo (distilled model)
- **Negative conditioning**: `ConditioningZeroOut` — zeroed out, no text input. No `negativePrompt` placeholder.
- **Sampler**: `res_multistep`, 4 steps, cfg 1
- **Model loading**: UNETLoader + CLIPLoader + VAELoader (three separate components)
- **Prompt enhancement**: Natural language prose (60-220 words)

### Prefect Pony XL (traditional model)
- **Negative conditioning**: `CLIPTextEncode` with text — has `negativePrompt` placeholder
- **Sampler**: `euler_ancestral`, 28 steps, cfg 6.8
- **Model loading**: `CheckpointLoaderSimple` (single checkpoint file)
- **Prompt enhancement**: Booru-style comma-separated tags with quality/source/rating prefixes

## Key API Endpoints (ComfyUI server)

| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/system_stats` | GET | Health check |
| `/prompt` | POST | Submit workflow for execution |
| `/history/{promptId}` | GET | Poll for generation result |
| `/view?filename=...` | GET | Fetch generated image |
| `/upload/image` | POST | Upload reference image (img2img) |
| `/object_info/UNETLoader` | GET | List available models |

## Profile Architecture

Profiles are stored in the `comfyui_profiles` DB table and contain:
- `workflowJson` — full ComfyUI API workflow
- `img2imgWorkflowJson` — optional img2img variant
- `placeholders` / `img2imgPlaceholders` — placeholder mappings
- `outputNodeId` — which SaveImage/PreviewImage node produces the output
- `enhanceSystemPrompt` — custom system prompt for LLM-based prompt enhancement
- `baseUrl` — ComfyUI server address

## Important Notes

- When adding new workflow presets, always check the official ComfyUI templates at
  https://github.com/Comfy-Org/workflow_templates to ensure node types and sampler settings match.
- Distilled models (Z-Image Turbo) do NOT use classifier-free guidance or text-based negative prompts.
  Their negative conditioning uses `ConditioningZeroOut` instead of `CLIPTextEncode`.
- The `detectComfyUIPlaceholders` utility auto-detects placeholder mappings from imported workflows.
  It treats `negativePrompt` as optional to support both traditional and distilled model workflows.
