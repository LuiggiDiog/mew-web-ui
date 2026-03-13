// @vitest-environment jsdom
import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { Badge } from ".";

describe("Badge", () => {
  it("renders children text", () => {
    render(<Badge>Active</Badge>);
    expect(screen.getByText("Active")).toBeTruthy();
  });

  it("uses default variant when none specified", () => {
    const { container } = render(<Badge>Default</Badge>);
    expect(container.firstChild).toHaveClass("bg-surface-elevated");
  });

  it("applies success variant classes", () => {
    const { container } = render(<Badge variant="success">Active</Badge>);
    expect(container.firstChild).toHaveClass("text-emerald-400");
  });

  it("applies error variant classes", () => {
    const { container } = render(<Badge variant="error">Error</Badge>);
    expect(container.firstChild).toHaveClass("text-red-400");
  });

  it("applies warning variant classes", () => {
    const { container } = render(<Badge variant="warning">Warning</Badge>);
    expect(container.firstChild).toHaveClass("text-amber-400");
  });

  it("applies local variant classes", () => {
    const { container } = render(<Badge variant="local">Local</Badge>);
    expect(container.firstChild).toHaveClass("text-indigo-400");
  });

  it("applies external variant classes", () => {
    const { container } = render(<Badge variant="external">External</Badge>);
    expect(container.firstChild).toHaveClass("text-zinc-400");
  });

  it("accepts extra className", () => {
    const { container } = render(<Badge className="custom-class">X</Badge>);
    expect(container.firstChild).toHaveClass("custom-class");
  });
});
