// @vitest-environment jsdom
import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { Avatar } from "./Avatar";

describe("Avatar", () => {
  it("renders initials from multi-word name", () => {
    render(<Avatar name="John Doe" />);
    expect(screen.getByText("JD")).toBeTruthy();
  });

  it("renders first letter for single-word name", () => {
    render(<Avatar name="Alice" />);
    expect(screen.getByText("A")).toBeTruthy();
  });

  it("limits initials to 2 characters", () => {
    render(<Avatar name="John Michael Doe" />);
    expect(screen.getByText("JM")).toBeTruthy();
  });

  it("sets aria-label to the name", () => {
    render(<Avatar name="Test User" />);
    expect(screen.getByLabelText("Test User")).toBeTruthy();
  });

  it("renders with user role color class", () => {
    const { container } = render(<Avatar name="User" role="user" />);
    expect(container.firstChild).toHaveClass("bg-indigo-600");
  });

  it("renders with assistant role color class by default", () => {
    const { container } = render(<Avatar name="AI" />);
    expect(container.firstChild).toHaveClass("bg-zinc-700");
  });

  it("applies sm size class", () => {
    const { container } = render(<Avatar name="AI" size="sm" />);
    expect(container.firstChild).toHaveClass("w-6");
  });

  it("applies md size class by default", () => {
    const { container } = render(<Avatar name="AI" />);
    expect(container.firstChild).toHaveClass("w-8");
  });
});
