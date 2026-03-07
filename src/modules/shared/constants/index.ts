export const APP_NAME = "Workspace";

export const DEFAULT_PROVIDER = "ollama";
export const DEFAULT_MODEL = "llama3.2";

export const QUICK_ACTIONS = [
  { id: "explain", label: "Explain something", prompt: "Explain " },
  { id: "write", label: "Write", prompt: "Write a " },
  { id: "summarize", label: "Summarize", prompt: "Summarize this: " },
  { id: "analyze", label: "Analyze", prompt: "Analyze " },
  { id: "translate", label: "Translate", prompt: "Translate to English: " },
  { id: "brainstorm", label: "Brainstorm", prompt: "Brainstorm ideas for " },
] as const;

export type QuickAction = (typeof QUICK_ACTIONS)[number];
