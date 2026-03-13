export type MessageRole = "user" | "assistant";
export type MessageType = "text" | "image";

export interface Message {
  id: string;
  conversationId: string;
  role: MessageRole;
  content: string;
  createdAt: string;
  model?: string;
  type?: MessageType;
}
