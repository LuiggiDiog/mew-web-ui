// @vitest-environment jsdom
import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { ProviderBadge } from ".";
import type { Provider } from "@/modules/providers/types";

const BASE: Provider = {
  id: "p-1",
  name: "Ollama",
  type: "local",
  isActive: true,
};

describe("ProviderBadge", () => {
  it("shows 'Active' when provider is active", () => {
    render(<ProviderBadge provider={{ ...BASE, isActive: true }} />);
    expect(screen.getByText("Active")).toBeTruthy();
  });

  it("shows 'Inactive' when provider is inactive", () => {
    render(<ProviderBadge provider={{ ...BASE, isActive: false }} />);
    expect(screen.getByText("Inactive")).toBeTruthy();
  });

  it("shows 'local' type badge for local provider", () => {
    render(<ProviderBadge provider={{ ...BASE, type: "local" }} />);
    expect(screen.getByText("local")).toBeTruthy();
  });

  it("shows 'external' type badge for external provider", () => {
    render(<ProviderBadge provider={{ ...BASE, type: "external" }} />);
    expect(screen.getByText("external")).toBeTruthy();
  });

  it("renders two badges total", () => {
    render(<ProviderBadge provider={BASE} />);
    expect(screen.getAllByRole("generic").length).toBeGreaterThanOrEqual(2);
  });
});
