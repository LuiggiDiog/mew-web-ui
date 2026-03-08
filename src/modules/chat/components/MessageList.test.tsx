// @vitest-environment jsdom
import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { MessageList } from "./MessageList";
import type { Message } from "@/modules/chat/types";

const MESSAGES: Message[] = [
  {
    id: "m1",
    conversationId: "conv-1",
    role: "user",
    content: "First message",
    createdAt: "2026-03-07T10:00:00.000Z",
  },
  {
    id: "m2",
    conversationId: "conv-1",
    role: "assistant",
    content: "Second message",
    createdAt: "2026-03-07T10:00:10.000Z",
    model: "llama3.2",
  },
];

describe("MessageList", () => {
  it("renders all messages", () => {
    render(<MessageList messages={MESSAGES} />);
    expect(screen.getByText("First message")).toBeTruthy();
    expect(screen.getByText("Second message")).toBeTruthy();
  });

  it("renders empty list without errors", () => {
    const { container } = render(<MessageList messages={[]} />);
    expect(container.firstChild).toBeTruthy();
  });

  it("renders the correct number of message bubbles", () => {
    render(<MessageList messages={MESSAGES} />);
    // Each message has an avatar label
    expect(screen.getByLabelText("You")).toBeTruthy();
    expect(screen.getByLabelText("AI")).toBeTruthy();
  });
});
