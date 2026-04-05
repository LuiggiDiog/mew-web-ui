// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { ChatHeader } from ".";
import { useChatStore } from "@/modules/chat/store/chatStore";
import { APP_NAME, DEFAULT_MODEL, DEFAULT_PROVIDER } from "@/modules/shared/constants";

const backMock = vi.fn();
const pushMock = vi.fn();

vi.mock("next/link", () => ({
  default: ({
    href,
    children,
    className,
    "aria-label": ariaLabel,
  }: {
    href: string;
    children: React.ReactNode;
    className?: string;
    "aria-label"?: string;
  }) => (
    <a href={href} className={className} aria-label={ariaLabel}>
      {children}
    </a>
  ),
}));

vi.mock("next/navigation", () => ({
  useRouter: () => ({
    back: backMock,
    push: pushMock,
  }),
}));

beforeEach(() => {
  backMock.mockReset();
  pushMock.mockReset();

  useChatStore.setState({
    drawerOpen: false,
    selectedConversationId: null,
    activeModel: DEFAULT_MODEL,
    activeProvider: DEFAULT_PROVIDER,
    streamingMessageId: null,
  });
});

describe("ChatHeader", () => {
  it("shows APP_NAME when no title is provided", () => {
    render(<ChatHeader />);
    expect(screen.getByText(APP_NAME)).toBeTruthy();
  });

  it("shows the provided title", () => {
    render(<ChatHeader title="Settings" />);
    expect(screen.getByText("Settings")).toBeTruthy();
  });

  it("shows menu toggle button by default (showBack = false)", () => {
    render(<ChatHeader />);
    expect(screen.getByRole("button", { name: "Toggle sidebar" })).toBeTruthy();
  });

  it("toggles drawer when menu button is clicked", () => {
    render(<ChatHeader />);
    expect(useChatStore.getState().drawerOpen).toBe(false);
    fireEvent.click(screen.getByRole("button", { name: "Toggle sidebar" }));
    expect(useChatStore.getState().drawerOpen).toBe(true);
  });

  it("shows back link instead of menu button when showBack=true", () => {
    render(<ChatHeader showBack />);
    expect(screen.queryByRole("button", { name: "Toggle sidebar" })).toBeNull();
    expect(screen.getByRole("link", { name: "Back to chat" })).toBeTruthy();
  });

  it("back link points to /chat", () => {
    render(<ChatHeader showBack />);
    const link = screen.getByRole("link", { name: "Back to chat" });
    expect(link.getAttribute("href")).toBe("/chat");
  });

  it("shows history back button when showBack=true and backMode=history", () => {
    render(<ChatHeader showBack backMode="history" />);
    expect(screen.getByRole("button", { name: "Back" })).toBeTruthy();
  });

  it("renders a settings link", () => {
    render(<ChatHeader />);
    expect(screen.getByRole("link", { name: "Settings" })).toBeTruthy();
  });

  it("settings link points to /settings", () => {
    render(<ChatHeader />);
    expect(screen.getByRole("link", { name: "Settings" }).getAttribute("href")).toBe("/settings");
  });

  it("does not render settings link when showSettingsButton=false", () => {
    render(<ChatHeader showSettingsButton={false} />);
    expect(screen.queryByRole("link", { name: "Settings" })).toBeNull();
  });
});
