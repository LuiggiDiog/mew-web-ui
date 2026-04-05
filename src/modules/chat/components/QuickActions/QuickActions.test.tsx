// @vitest-environment jsdom
import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { QuickActions } from ".";
import { QUICK_ACTIONS } from "@/modules/shared/constants";

describe("QuickActions", () => {
  it("renders all quick action buttons", () => {
    render(<QuickActions />);
    QUICK_ACTIONS.forEach((action) => {
      expect(screen.getByText(action.label)).toBeTruthy();
    });
  });

  it("calls onSelect with the action prompt when clicked", () => {
    const onSelect = vi.fn();
    render(<QuickActions onSelect={onSelect} />);
    const first = QUICK_ACTIONS[0];
    fireEvent.click(screen.getByText(first.label));
    expect(onSelect).toHaveBeenCalledWith(first.prompt);
  });

  it("does not throw when onSelect is not provided", () => {
    render(<QuickActions />);
    expect(() => fireEvent.click(screen.getByText(QUICK_ACTIONS[0].label))).not.toThrow();
  });
});
