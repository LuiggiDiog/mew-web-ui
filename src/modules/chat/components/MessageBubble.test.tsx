// @vitest-environment jsdom
import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
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

const ASSISTANT_THINKING_MSG: Message = {
  ...ASSISTANT_MSG,
  id: "msg-3",
  content: "",
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

  it("shows createdAt time in local HH:MM format", () => {
    render(<MessageBubble message={USER_MSG} />);
    const date = new Date(USER_MSG.createdAt);
    const expected = `${date.getHours().toString().padStart(2, "0")}:${date.getMinutes().toString().padStart(2, "0")}`;
    expect(screen.getByText(expected)).toBeTruthy();
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

  it("keeps model metadata on one line and truncates long model names", () => {
    const longModel = {
      ...ASSISTANT_MSG,
      model: "very-long-model-name-that-should-not-wrap-in-the-chat-metadata-row",
    };
    render(<MessageBubble message={longModel} />);

    const date = new Date(ASSISTANT_MSG.createdAt);
    const expected = `${date.getHours().toString().padStart(2, "0")}:${date.getMinutes().toString().padStart(2, "0")}`;
    const metadata = screen.getByText(expected).parentElement as HTMLElement;
    expect(metadata.className).toContain("whitespace-nowrap");

    const badge = screen.getByText(longModel.model);
    expect(badge.className).toContain("overflow-hidden");
    expect(badge.className).toContain("text-ellipsis");
    expect(badge.className).toContain("whitespace-nowrap");
    expect((badge.parentElement as HTMLElement).className).toContain("pr-2.5");
  });

  it("does not show model badge when model is absent", () => {
    const noModel = { ...ASSISTANT_MSG, model: undefined };
    render(<MessageBubble message={noModel} />);
    expect(screen.queryByText("llama3.2")).toBeNull();
  });

  it("shows animated thinking indicator for empty assistant response", () => {
    const { container } = render(<MessageBubble message={ASSISTANT_THINKING_MSG} />);
    expect(screen.getByLabelText("Assistant is thinking")).toBeTruthy();
    expect(container.querySelectorAll("[data-thinking-dot='true']").length).toBe(3);
  });
});

describe("MessageBubble — regenerate action", () => {
  it("does not show regenerate button by default", () => {
    render(<MessageBubble message={ASSISTANT_MSG} />);
    expect(screen.queryByRole("button", { name: "Regenerate response" })).toBeNull();
  });

  it("does not show regenerate button for user messages even with showRegenerateAction", () => {
    render(<MessageBubble message={USER_MSG} showRegenerateAction onRegenerate={() => {}} />);
    expect(screen.queryByRole("button", { name: "Regenerate response" })).toBeNull();
  });

  it("shows regenerate button when showRegenerateAction and onRegenerate are provided on assistant message", () => {
    render(<MessageBubble message={ASSISTANT_MSG} showRegenerateAction onRegenerate={() => {}} />);
    expect(screen.getByRole("button", { name: "Regenerate response" })).toBeTruthy();
  });

  it("calls onRegenerate when regenerate button is clicked", () => {
    const onRegenerate = vi.fn();
    render(<MessageBubble message={ASSISTANT_MSG} showRegenerateAction onRegenerate={onRegenerate} />);
    fireEvent.click(screen.getByRole("button", { name: "Regenerate response" }));
    expect(onRegenerate).toHaveBeenCalledOnce();
  });

  it("disables regenerate button when actionsDisabled is true", () => {
    render(
      <MessageBubble
        message={ASSISTANT_MSG}
        showRegenerateAction
        onRegenerate={() => {}}
        actionsDisabled
      />
    );
    const btn = screen.getByRole("button", { name: "Regenerate response" });
    expect(btn.hasAttribute("disabled")).toBe(true);
  });
});

describe("MessageBubble — edit action", () => {
  it("does not show edit button by default", () => {
    render(<MessageBubble message={USER_MSG} />);
    expect(screen.queryByRole("button", { name: "Edit message" })).toBeNull();
  });

  it("shows edit button on user message when showEditAction and onEdit are provided", () => {
    render(<MessageBubble message={USER_MSG} showEditAction onEdit={() => {}} />);
    expect(screen.getByRole("button", { name: "Edit message" })).toBeTruthy();
  });

  it("does not show edit button for assistant messages", () => {
    render(<MessageBubble message={ASSISTANT_MSG} showEditAction onEdit={() => {}} />);
    expect(screen.queryByRole("button", { name: "Edit message" })).toBeNull();
  });

  it("calls onEdit when saving edited message", () => {
    const onEdit = vi.fn();
    render(<MessageBubble message={USER_MSG} showEditAction onEdit={onEdit} />);

    fireEvent.click(screen.getByRole("button", { name: "Edit message" }));
    fireEvent.change(screen.getByLabelText("Edit message input"), {
      target: { value: "Updated message" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Save edited message" }));

    expect(onEdit).toHaveBeenCalledWith(USER_MSG.id, "Updated message");
  });

  it("cancels edit without calling onEdit", () => {
    const onEdit = vi.fn();
    render(<MessageBubble message={USER_MSG} showEditAction onEdit={onEdit} />);

    fireEvent.click(screen.getByRole("button", { name: "Edit message" }));
    fireEvent.change(screen.getByLabelText("Edit message input"), {
      target: { value: "Updated message" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Cancel edit message" }));

    expect(onEdit).not.toHaveBeenCalled();
    expect(screen.queryByLabelText("Edit message input")).toBeNull();
  });

  it("saves edit with Enter key", () => {
    const onEdit = vi.fn();
    render(<MessageBubble message={USER_MSG} showEditAction onEdit={onEdit} />);

    fireEvent.click(screen.getByRole("button", { name: "Edit message" }));
    const input = screen.getByLabelText("Edit message input");
    fireEvent.change(input, { target: { value: "Updated with enter" } });
    fireEvent.keyDown(input, { key: "Enter", shiftKey: false });

    expect(onEdit).toHaveBeenCalledWith(USER_MSG.id, "Updated with enter");
  });

  it("cancels edit with Escape key", () => {
    const onEdit = vi.fn();
    render(<MessageBubble message={USER_MSG} showEditAction onEdit={onEdit} />);

    fireEvent.click(screen.getByRole("button", { name: "Edit message" }));
    const input = screen.getByLabelText("Edit message input");
    fireEvent.change(input, { target: { value: "Will cancel" } });
    fireEvent.keyDown(input, { key: "Escape" });

    expect(onEdit).not.toHaveBeenCalled();
    expect(screen.queryByLabelText("Edit message input")).toBeNull();
  });
});
