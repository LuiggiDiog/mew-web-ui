// @vitest-environment jsdom
import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { EmptyState } from "./EmptyState";
import { QUICK_ACTIONS } from "@/modules/shared/constants";

describe("EmptyState", () => {
  it("renders the greeting heading", () => {
    render(<EmptyState />);
    expect(screen.getByRole("heading", { level: 2 })).toBeTruthy();
  });

  it("renders the greeting subtitle", () => {
    render(<EmptyState />);
    const text = screen.getByRole("heading", { level: 2 }).textContent;
    expect(text && text.length > 0).toBe(true);
    expect(
      screen.getByText(/Mew WebUI|IA|open source|Privacidad|Simplicidad|Prompt|prompt/i, {
        selector: "p",
      })
    ).toBeTruthy();
  });

  it("renders all quick action buttons", () => {
    render(<EmptyState />);
    QUICK_ACTIONS.forEach((action) => {
      expect(screen.getByText(action.label)).toBeTruthy();
    });
  });
});
