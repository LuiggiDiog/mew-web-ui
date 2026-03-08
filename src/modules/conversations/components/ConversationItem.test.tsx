// @vitest-environment jsdom
import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { ConversationItem } from "./ConversationItem";
import type { Conversation } from "@/modules/conversations/types";

const CONV: Conversation = {
  id: "conv-1",
  title: "Explain async/await",
  preview: "Can you explain how async/await works?",
  createdAt: "2026-03-07T10:00:00.000Z",
  updatedAt: "2026-03-07T14:30:00.000Z",
  model: "llama3.2",
  provider: "ollama",
  messageCount: 5,
};

describe("ConversationItem", () => {
  it("renders the conversation title", () => {
    render(
      <ConversationItem conversation={CONV} isActive={false} onClick={vi.fn()} onDelete={vi.fn()} />
    );
    expect(screen.getByText("Explain async/await")).toBeTruthy();
  });

  it("renders the preview text", () => {
    render(
      <ConversationItem conversation={CONV} isActive={false} onClick={vi.fn()} onDelete={vi.fn()} />
    );
    expect(screen.getByText("Can you explain how async/await works?")).toBeTruthy();
  });

  it("formats and shows the time from updatedAt (UTC HH:MM)", () => {
    render(
      <ConversationItem conversation={CONV} isActive={false} onClick={vi.fn()} onDelete={vi.fn()} />
    );
    // updatedAt is 14:30 UTC
    expect(screen.getByText("14:30")).toBeTruthy();
  });

  it("calls onClick when clicked", () => {
    const onClick = vi.fn();
    render(
      <ConversationItem conversation={CONV} isActive={false} onClick={onClick} onDelete={vi.fn()} />
    );
    fireEvent.click(screen.getByLabelText("Open conversation Explain async/await"));
    expect(onClick).toHaveBeenCalledOnce();
  });

  it("applies active styling when isActive is true", () => {
    const { container } = render(
      <ConversationItem conversation={CONV} isActive={true} onClick={vi.fn()} onDelete={vi.fn()} />
    );
    expect(container.querySelector("button")).toHaveClass("bg-surface-elevated");
  });

  it("does not apply active styling when isActive is false", () => {
    const { container } = render(
      <ConversationItem conversation={CONV} isActive={false} onClick={vi.fn()} onDelete={vi.fn()} />
    );
    expect(container.querySelector("button")).not.toHaveClass("bg-surface-elevated");
  });

  it("calls onDelete when confirm delete is clicked", async () => {
    const onDelete = vi.fn();
    render(
      <ConversationItem conversation={CONV} isActive={false} onClick={vi.fn()} onDelete={onDelete} />
    );

    fireEvent.contextMenu(screen.getByLabelText("Open conversation Explain async/await"));
    fireEvent.click(await screen.findByRole("menuitem", { name: "Delete chat" }));
    fireEvent.click(await screen.findByRole("button", { name: "Delete" }));

    await waitFor(() => {
      expect(onDelete).toHaveBeenCalledWith("conv-1");
    });
  });
});
