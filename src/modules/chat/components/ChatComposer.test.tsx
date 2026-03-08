// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor, act } from "@testing-library/react";
import { ChatComposer } from "./ChatComposer";

// ModelSelector inside ChatComposer fetches from the API — stub to avoid noise
beforeEach(() => {
  vi.restoreAllMocks();
  vi.stubGlobal(
    "fetch",
    vi.fn().mockResolvedValue({
      ok: false,
      json: () => Promise.resolve(null),
    })
  );
});

describe("ChatComposer", () => {
  it("renders the message textarea", () => {
    render(<ChatComposer />);
    expect(screen.getByPlaceholderText("Message…")).toBeTruthy();
  });

  it("send button is disabled when textarea is empty", () => {
    render(<ChatComposer />);
    expect(screen.getByRole("button", { name: "Send message" })).toBeDisabled();
  });

  it("send button is enabled when text is entered", () => {
    render(<ChatComposer />);
    fireEvent.change(screen.getByPlaceholderText("Message…"), {
      target: { value: "Hello" },
    });
    expect(screen.getByRole("button", { name: "Send message" })).not.toBeDisabled();
  });

  it("calls onSend with trimmed text when send button is clicked", async () => {
    const onSend = vi.fn();
    render(<ChatComposer onSend={onSend} />);
    fireEvent.change(screen.getByPlaceholderText("Message…"), {
      target: { value: "  Hello world  " },
    });
    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: "Send message" }));
    });
    expect(onSend).toHaveBeenCalledWith("Hello world");
  });

  it("clears textarea after sending", async () => {
    render(<ChatComposer onSend={vi.fn()} />);
    const textarea = screen.getByPlaceholderText("Message…");
    fireEvent.change(textarea, { target: { value: "Hello" } });
    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: "Send message" }));
    });
    expect((textarea as HTMLTextAreaElement).value).toBe("");
  });

  it("calls onSend when Enter is pressed", async () => {
    const onSend = vi.fn();
    render(<ChatComposer onSend={onSend} />);
    const textarea = screen.getByPlaceholderText("Message…");
    fireEvent.change(textarea, { target: { value: "Hi" } });
    await act(async () => {
      fireEvent.keyDown(textarea, { key: "Enter", shiftKey: false });
    });
    expect(onSend).toHaveBeenCalledWith("Hi");
  });

  it("does not call onSend when Shift+Enter is pressed", async () => {
    const onSend = vi.fn();
    render(<ChatComposer onSend={onSend} />);
    const textarea = screen.getByPlaceholderText("Message…");
    fireEvent.change(textarea, { target: { value: "Hi" } });
    await act(async () => {
      fireEvent.keyDown(textarea, { key: "Enter", shiftKey: true });
    });
    expect(onSend).not.toHaveBeenCalled();
  });

  it("send button is disabled when disabled prop is true", () => {
    render(<ChatComposer disabled />);
    const textarea = screen.getByPlaceholderText("Message…");
    fireEvent.change(textarea, { target: { value: "Hello" } });
    expect(screen.getByRole("button", { name: "Send message" })).toBeDisabled();
  });

  it("does not call onSend when disabled even with text", async () => {
    const onSend = vi.fn();
    render(<ChatComposer onSend={onSend} disabled />);
    const textarea = screen.getByPlaceholderText("Message…");
    fireEvent.change(textarea, { target: { value: "Hello" } });
    await act(async () => {
      fireEvent.keyDown(textarea, { key: "Enter", shiftKey: false });
    });
    expect(onSend).not.toHaveBeenCalled();
  });
});
