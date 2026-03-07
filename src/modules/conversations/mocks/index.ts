import type { Conversation } from "@/modules/conversations/types";

// Dates relative to 2026-03-07 (current date)
export const MOCK_CONVERSATIONS: Conversation[] = [
  // Today
  {
    id: "conv-1",
    title: "Explain async/await in JavaScript",
    preview: "Can you explain how async/await works under the hood?",
    createdAt: "2026-03-07T10:23:00Z",
    updatedAt: "2026-03-07T10:41:00Z",
    model: "llama3.2",
    provider: "ollama",
    messageCount: 12,
  },
  {
    id: "conv-2",
    title: "Draft email to the team",
    preview: "Write a brief update about the Q1 roadmap changes...",
    createdAt: "2026-03-07T08:05:00Z",
    updatedAt: "2026-03-07T08:18:00Z",
    model: "llama3.2",
    provider: "ollama",
    messageCount: 4,
  },
  // Yesterday
  {
    id: "conv-3",
    title: "Summarize quarterly report",
    preview: "Here is the Q4 report PDF. Give me the key points...",
    createdAt: "2026-03-06T15:30:00Z",
    updatedAt: "2026-03-06T15:52:00Z",
    model: "mistral",
    provider: "ollama",
    messageCount: 6,
  },
  {
    id: "conv-4",
    title: "React performance optimization",
    preview: "My component re-renders too often. What can I do?",
    createdAt: "2026-03-06T09:10:00Z",
    updatedAt: "2026-03-06T09:34:00Z",
    model: "llama3.2",
    provider: "ollama",
    messageCount: 8,
  },
  // Last week
  {
    id: "conv-5",
    title: "Brainstorm startup ideas",
    preview: "I want to build something in the developer tools space...",
    createdAt: "2026-03-03T14:00:00Z",
    updatedAt: "2026-03-03T14:45:00Z",
    model: "llama3.1",
    provider: "ollama",
    messageCount: 16,
  },
  {
    id: "conv-6",
    title: "Translate article to Spanish",
    preview: "Translate this article about AI safety into Spanish...",
    createdAt: "2026-03-02T11:20:00Z",
    updatedAt: "2026-03-02T11:28:00Z",
    model: "gemma2",
    provider: "ollama",
    messageCount: 3,
  },
  {
    id: "conv-7",
    title: "SQL query optimization tips",
    preview: "I have a slow JOIN query on a large table...",
    createdAt: "2026-03-01T16:45:00Z",
    updatedAt: "2026-03-01T17:00:00Z",
    model: "codellama",
    provider: "ollama",
    messageCount: 10,
  },
];

export function groupConversationsByDate(
  conversations: Conversation[]
): Record<string, Conversation[]> {
  const today = new Date("2026-03-07");
  const yesterday = new Date("2026-03-06");

  const groups: Record<string, Conversation[]> = {};

  for (const conv of conversations) {
    const date = new Date(conv.updatedAt);
    const dateStr = date.toDateString();

    let label: string;
    if (dateStr === today.toDateString()) {
      label = "Today";
    } else if (dateStr === yesterday.toDateString()) {
      label = "Yesterday";
    } else {
      label = "Last week";
    }

    if (!groups[label]) groups[label] = [];
    groups[label].push(conv);
  }

  return groups;
}
