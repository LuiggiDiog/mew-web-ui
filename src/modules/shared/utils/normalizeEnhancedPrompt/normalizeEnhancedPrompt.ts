/**
 * Strips LLM formatting artifacts from a prose-style enhanced prompt.
 * Used in context-merge, translate, and enhance paths.
 */
export function normalizeEnhancedPrompt(text: string): string {
  return text
    .replace(/^```(?:text|markdown)?\s*/i, "")
    .replace(/\s*```$/i, "")
    .replace(/^(enhanced prompt|prompt)\s*:\s*/i, "")
    .replace(/^["'""]+|["'""]+$/g, "")
    .replace(/\s+/g, " ")
    .trim();
}
