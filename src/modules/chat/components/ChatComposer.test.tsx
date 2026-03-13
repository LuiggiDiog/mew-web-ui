// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, act } from "@testing-library/react";
import { ChatComposer } from "./ChatComposer";
import { useChatStore } from "@/modules/chat/store/chatStore";

vi.mock("@/modules/chat/components/ModelSelector", () => ({
  ModelSelector: () => <div aria-label="Select model" />,
}));

beforeEach(() => {
  vi.restoreAllMocks();
  vi.stubGlobal(
    "fetch",
    vi.fn().mockResolvedValue({
      ok: false,
      json: () => Promise.resolve(null),
    })
  );
  useChatStore.setState({ imageMode: false, imageWidth: 1024, imageHeight: 1024, previewMode: false });
});

describe("ChatComposer", () => {
  it("renders the message textarea", () => {
    render(<ChatComposer />);
    expect(screen.getByPlaceholderText(/Message/i)).toBeTruthy();
  });

  it("send button is disabled when textarea is empty", () => {
    render(<ChatComposer />);
    expect(screen.getByRole("button", { name: "Send message" })).toBeDisabled();
  });

  it("send button is enabled when text is entered", () => {
    render(<ChatComposer />);
    fireEvent.change(screen.getByPlaceholderText(/Message/i), {
      target: { value: "Hello" },
    });
    expect(screen.getByRole("button", { name: "Send message" })).not.toBeDisabled();
  });

  it("calls onSend with trimmed text when send button is clicked", async () => {
    const onSend = vi.fn();
    render(<ChatComposer onSend={onSend} />);
    fireEvent.change(screen.getByPlaceholderText(/Message/i), {
      target: { value: "  Hello world  " },
    });
    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: "Send message" }));
    });
    expect(onSend).toHaveBeenCalledWith("Hello world");
  });

  it("clears textarea after sending", async () => {
    render(<ChatComposer onSend={vi.fn()} />);
    const textarea = screen.getByPlaceholderText(/Message/i);
    fireEvent.change(textarea, { target: { value: "Hello" } });
    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: "Send message" }));
    });
    expect((textarea as HTMLTextAreaElement).value).toBe("");
  });

  it("calls onSend when Enter is pressed", async () => {
    const onSend = vi.fn();
    render(<ChatComposer onSend={onSend} />);
    const textarea = screen.getByPlaceholderText(/Message/i);
    fireEvent.change(textarea, { target: { value: "Hi" } });
    await act(async () => {
      fireEvent.keyDown(textarea, { key: "Enter", shiftKey: false });
    });
    expect(onSend).toHaveBeenCalledWith("Hi");
  });

  it("does not call onSend when Shift+Enter is pressed", async () => {
    const onSend = vi.fn();
    render(<ChatComposer onSend={onSend} />);
    const textarea = screen.getByPlaceholderText(/Message/i);
    fireEvent.change(textarea, { target: { value: "Hi" } });
    await act(async () => {
      fireEvent.keyDown(textarea, { key: "Enter", shiftKey: true });
    });
    expect(onSend).not.toHaveBeenCalled();
  });

  it("send button is disabled when disabled prop is true", () => {
    render(<ChatComposer disabled />);
    const textarea = screen.getByPlaceholderText(/Message/i);
    fireEvent.change(textarea, { target: { value: "Hello" } });
    expect(screen.getByRole("button", { name: "Send message" })).toBeDisabled();
  });

  it("does not call onSend when disabled even with text", async () => {
    const onSend = vi.fn();
    render(<ChatComposer onSend={onSend} disabled />);
    const textarea = screen.getByPlaceholderText(/Message/i);
    fireEvent.change(textarea, { target: { value: "Hello" } });
    await act(async () => {
      fireEvent.keyDown(textarea, { key: "Enter", shiftKey: false });
    });
    expect(onSend).not.toHaveBeenCalled();
  });
});

describe("ChatComposer image mode", () => {
  it("activates image mode and updates placeholder", () => {
    render(<ChatComposer />);

    const toggle = screen.getByRole("button", { name: "Toggle image mode" });
    fireEvent.click(toggle);

    expect(toggle).toHaveAttribute("aria-pressed", "true");
    expect(screen.getByPlaceholderText(/Describe an image/i)).toBeTruthy();
  });

  it("hides ModelSelector in image mode", () => {
    render(<ChatComposer />);

    expect(screen.getByLabelText("Select model")).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: "Toggle image mode" }));
    expect(screen.queryByLabelText("Select model")).toBeNull();
  });

  it("shows image mode help text", () => {
    render(<ChatComposer />);

    fireEvent.click(screen.getByRole("button", { name: "Toggle image mode" }));
    expect(screen.getByText(/ComfyUI/)).toBeTruthy();
  });

  it("sends image requests via onSendImage with default 1:1 dimensions", async () => {
    const onSend = vi.fn();
    const onSendImage = vi.fn();
    render(<ChatComposer onSend={onSend} onSendImage={onSendImage} />);

    fireEvent.click(screen.getByRole("button", { name: "Toggle image mode" }));
    fireEvent.change(screen.getByPlaceholderText(/Describe an image/i), {
      target: { value: "a cat" },
    });

    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: "Send message" }));
    });

    expect(onSendImage).toHaveBeenCalledWith("a cat", 1024, 1024);
    expect(onSend).not.toHaveBeenCalled();
  });

  it("sends 16:9 image when 16:9 preset is selected", async () => {
    const onSendImage = vi.fn();
    render(<ChatComposer onSendImage={onSendImage} />);

    fireEvent.click(screen.getByRole("button", { name: "Toggle image mode" }));
    fireEvent.click(screen.getByRole("button", { name: "16:9" }));
    fireEvent.change(screen.getByPlaceholderText(/Describe an image/i), {
      target: { value: "a castle" },
    });

    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: "Send message" }));
    });

    expect(onSendImage).toHaveBeenCalledWith("a castle", 1024, 576);
  });

  it("sends 9:16 image when 9:16 preset is selected", async () => {
    const onSendImage = vi.fn();
    render(<ChatComposer onSendImage={onSendImage} />);

    fireEvent.click(screen.getByRole("button", { name: "Toggle image mode" }));
    fireEvent.click(screen.getByRole("button", { name: "9:16" }));
    fireEvent.change(screen.getByPlaceholderText(/Describe an image/i), {
      target: { value: "a tree" },
    });

    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: "Send message" }));
    });

    expect(onSendImage).toHaveBeenCalledWith("a tree", 576, 1024);
  });

  it("shows aspect ratio preset buttons only in image mode", () => {
    render(<ChatComposer />);

    expect(screen.queryByRole("button", { name: "1:1" })).toBeNull();
    expect(screen.queryByRole("button", { name: "16:9" })).toBeNull();

    fireEvent.click(screen.getByRole("button", { name: "Toggle image mode" }));

    expect(screen.getByRole("button", { name: "1:1" })).toBeTruthy();
    expect(screen.getByRole("button", { name: "16:9" })).toBeTruthy();
  });

  it("returns to text behavior when image mode is disabled", async () => {
    const onSend = vi.fn();
    const onSendImage = vi.fn();
    render(<ChatComposer onSend={onSend} onSendImage={onSendImage} />);

    const toggle = screen.getByRole("button", { name: "Toggle image mode" });
    fireEvent.click(toggle);
    fireEvent.click(toggle);

    expect(toggle).toHaveAttribute("aria-pressed", "false");
    expect(screen.getByPlaceholderText(/Message/i)).toBeTruthy();

    fireEvent.change(screen.getByPlaceholderText(/Message/i), {
      target: { value: "plain text" },
    });

    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: "Send message" }));
    });

    expect(onSend).toHaveBeenCalledWith("plain text");
    expect(onSendImage).not.toHaveBeenCalled();
  });

  it("shows stop button while streaming", () => {
    render(<ChatComposer streaming onStop={vi.fn()} disabled />);
    expect(screen.getByRole("button", { name: "Stop generation" })).toBeTruthy();
    expect(screen.queryByRole("button", { name: "Send message" })).toBeNull();
  });

  it("calls onStop when stop button is clicked", () => {
    const onStop = vi.fn();
    render(<ChatComposer streaming onStop={onStop} disabled />);
    fireEvent.click(screen.getByRole("button", { name: "Stop generation" }));
    expect(onStop).toHaveBeenCalledOnce();
  });
});
