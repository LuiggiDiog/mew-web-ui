// @vitest-environment jsdom
import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { EmptyState } from "./EmptyState";
import { QUICK_ACTIONS } from "@/modules/shared/constants";

describe("EmptyState", () => {
  it("renders the greeting heading", () => {
    render(<EmptyState />);
    expect(screen.getByText("Good morning.")).toBeTruthy();
  });

  it("renders the subtitle", () => {
    render(<EmptyState />);
    expect(screen.getByText("What are we working on?")).toBeTruthy();
  });

  it("renders all quick action buttons", () => {
    render(<EmptyState />);
    QUICK_ACTIONS.forEach((action) => {
      expect(screen.getByText(action.label)).toBeTruthy();
    });
  });
});
