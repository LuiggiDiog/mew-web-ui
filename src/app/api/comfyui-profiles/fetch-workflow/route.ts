import { NextRequest, NextResponse } from "next/server";
import { getApiSession } from "@/modules/auth/services/api-auth";

// ── Format detection ─────────────────────────────────────────────────────────

function isApiFormat(workflow: unknown): boolean {
  if (typeof workflow !== "object" || workflow === null || Array.isArray(workflow)) return false;
  return Object.values(workflow as Record<string, unknown>).some(
    (v) => typeof v === "object" && v !== null && "class_type" in v
  );
}

function isVisualFormat(workflow: unknown): workflow is VisualWorkflow {
  if (typeof workflow !== "object" || workflow === null || Array.isArray(workflow)) return false;
  const w = workflow as Record<string, unknown>;
  return Array.isArray(w.nodes) && Array.isArray(w.links);
}

// ── Visual format types ──────────────────────────────────────────────────────

interface VisualNode {
  id: number;
  type: string;
  mode?: number;
  inputs?: { name: string; type: string; link: number | null }[];
  widgets_values?: unknown[];
}

interface VisualWorkflow {
  nodes: VisualNode[];
  links: unknown[][];
}

// Each entry in object_info: { input: { required: {...}, optional: {...} }, ... }
type InputDef = [unknown, ...unknown[]];
type ObjectInfo = Record<
  string,
  { input: { required?: Record<string, InputDef>; optional?: Record<string, InputDef> } }
>;

// ── Visual → API conversion ──────────────────────────────────────────────────

const WIDGET_TYPES = new Set(["INT", "FLOAT", "STRING", "BOOLEAN"]);

function isWidgetType(typeDef: unknown): boolean {
  if (Array.isArray(typeDef)) return true; // combo / dropdown
  return typeof typeDef === "string" && WIDGET_TYPES.has(typeDef);
}

/** If the input config has control_after_generate, an extra combo widget follows. */
function hasControlAfterGenerate(def: InputDef): boolean {
  const config = def[1];
  return typeof config === "object" && config !== null && "control_after_generate" in config;
}

function convertVisualToApi(
  visual: VisualWorkflow,
  objectInfo: ObjectInfo
): Record<string, { class_type: string; inputs: Record<string, unknown> }> {
  // Build link map: link_id → full link array
  // Link format: [link_id, source_node_id, source_output_slot, target_node_id, target_input_slot, type]
  const linkMap = new Map<number, unknown[]>();
  for (const link of visual.links) {
    if (Array.isArray(link) && typeof link[0] === "number") {
      linkMap.set(link[0], link);
    }
  }

  const output: Record<string, { class_type: string; inputs: Record<string, unknown> }> = {};

  for (const node of visual.nodes) {
    // mode 4 = bypassed/muted, skip
    if (node.mode === 4) continue;

    const info = objectInfo[node.type];

    if (!info) {
      // Node type not in object_info (e.g. custom node not yet loaded).
      // Still include it using the connection data from the visual graph so
      // that links to/from this node are not broken in the converted workflow.
      const inputs: Record<string, unknown> = {};
      if (node.inputs) {
        for (const inp of node.inputs) {
          if (inp.link != null) {
            const link = linkMap.get(inp.link);
            if (link) {
              inputs[inp.name] = [String(link[1]), link[2]];
            }
          }
        }
      }
      output[String(node.id)] = { class_type: node.type, inputs };
      continue;
    }

    const inputs: Record<string, unknown> = {};
    const inputDefs: Record<string, InputDef> = {
      ...info.input?.required,
      ...info.input?.optional,
    };

    // Build map of input name → link ID (null if slot exists but unlinked)
    const slotLinks = new Map<string, number | null>();
    if (node.inputs) {
      for (const inp of node.inputs) {
        slotLinks.set(inp.name, inp.link);
      }
    }

    let widgetIdx = 0;

    for (const [name, def] of Object.entries(inputDefs)) {
      const linkId = slotLinks.get(name);

      if (linkId != null) {
        // Input has an actual connection link — use it
        const link = linkMap.get(linkId);
        if (link) {
          inputs[name] = [String(link[1]), link[2]];
        }
        // Connected widgets don't consume a widgets_values slot
      } else if (isWidgetType(def[0])) {
        // Widget value — either not in node.inputs, or in node.inputs with link=null
        if (node.widgets_values && widgetIdx < node.widgets_values.length) {
          inputs[name] = node.widgets_values[widgetIdx];
        }
        widgetIdx++;

        // Extra combo widget for control_after_generate (e.g. seed → "randomize")
        if (hasControlAfterGenerate(def)) {
          widgetIdx++;
        }
      }
      // else: unconnected connection-type input, skip
    }

    output[String(node.id)] = { class_type: node.type, inputs };
  }

  return output;
}

// ── Route handler ────────────────────────────────────────────────────────────

export async function POST(request: NextRequest) {
  const { session, error } = await getApiSession();
  if (error) return error;
  void session;

  const body = await request.json().catch(() => null);
  if (!body || typeof body.url !== "string" || typeof body.filename !== "string") {
    return NextResponse.json({ error: "url and filename are required" }, { status: 400 });
  }

  const baseUrl = body.url.trim().replace(/\/+$/, "");

  // ComfyUI route is /userdata/{file} where {file} is a SINGLE path segment.
  // Slashes must be URL-encoded: "workflows/name.json" → "workflows%2Fname.json"
  const filePath = `workflows/${body.filename}`;
  const encodedFile = encodeURIComponent(filePath);

  const urls = [
    `${baseUrl}/userdata/${encodedFile}`,
    `${baseUrl}/api/userdata/${encodedFile}`,
  ];

  for (const fetchUrl of urls) {
    try {
      const res = await fetch(fetchUrl, { signal: AbortSignal.timeout(8000) });
      if (!res.ok) continue;

      const raw: unknown = await res.json();

      // Already API format — return as-is
      if (isApiFormat(raw)) {
        return NextResponse.json({ workflow: raw, apiFormat: true });
      }

      // Visual format — convert using object_info
      if (isVisualFormat(raw)) {
        const objInfoRes = await fetch(`${baseUrl}/object_info`, {
          signal: AbortSignal.timeout(15000),
        });
        if (!objInfoRes.ok) {
          return NextResponse.json(
            { error: "Fetched workflow but could not load object_info for conversion." },
            { status: 502 }
          );
        }
        const objectInfo: ObjectInfo = await objInfoRes.json();
        const apiWorkflow = convertVisualToApi(raw, objectInfo);
        return NextResponse.json({ workflow: apiWorkflow, apiFormat: true });
      }

      // Unknown format
      return NextResponse.json(
        { error: "Unrecognized workflow format." },
        { status: 422 }
      );
    } catch {
      continue;
    }
  }

  return NextResponse.json(
    { error: `Workflow "${body.filename}" not found.` },
    { status: 404 }
  );
}
