// @vitest-environment jsdom
import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { MessageBubble } from "./MessageBubble";
import type { Message } from "@/modules/chat/types";

const USER_MSG: Message = {
  id: "msg-1",
  conversationId: "conv-1",
  role: "user",
  content: "Hello there!",
  createdAt: "2026-03-07T10:00:00.000Z",
};

const ASSISTANT_MSG: Message = {
  id: "msg-2",
  conversationId: "conv-1",
  role: "assistant",
  content: "Hi! How can I help?",
  createdAt: "2026-03-07T10:00:30.000Z",
  model: "llama3.2",
};

describe("MessageBubble — user message", () => {
  it("renders the message content", () => {
    render(<MessageBubble message={USER_MSG} />);
    expect(screen.getByText("Hello there!")).toBeTruthy();
  });

  it("renders 'You' avatar for user messages", () => {
    render(<MessageBubble message={USER_MSG} />);
    expect(screen.getByLabelText("You")).toBeTruthy();
  });

  it("does not show model badge for user messages", () => {
    render(<MessageBubble message={USER_MSG} />);
    expect(screen.queryByText("llama3.2")).toBeNull();
  });

  it("shows createdAt time in deterministic UTC HH:MM format", () => {
    render(<MessageBubble message={USER_MSG} />);
    expect(screen.getByText("10:00")).toBeTruthy();
  });
});

describe("MessageBubble — assistant message", () => {
  it("renders the message content", () => {
    render(<MessageBubble message={ASSISTANT_MSG} />);
    expect(screen.getByText("Hi! How can I help?")).toBeTruthy();
  });

  it("renders 'AI' avatar for assistant messages", () => {
    render(<MessageBubble message={ASSISTANT_MSG} />);
    expect(screen.getByLabelText("AI")).toBeTruthy();
  });

  it("shows model badge when model is present", () => {
    render(<MessageBubble message={ASSISTANT_MSG} />);
    expect(screen.getByText("llama3.2")).toBeTruthy();
  });

  it("does not show model badge when model is absent", () => {
    const noModel = { ...ASSISTANT_MSG, model: undefined };
    render(<MessageBubble message={noModel} />);
    expect(screen.queryByText("llama3.2")).toBeNull();
  });
});
