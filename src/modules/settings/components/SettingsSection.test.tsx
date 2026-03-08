// @vitest-environment jsdom
import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { SettingsSection } from "./SettingsSection";

describe("SettingsSection", () => {
  it("renders the title", () => {
    render(<SettingsSection title="General">child</SettingsSection>);
    expect(screen.getByText("General")).toBeTruthy();
  });

  it("renders description when provided", () => {
    render(
      <SettingsSection title="General" description="Some description">
        child
      </SettingsSection>
    );
    expect(screen.getByText("Some description")).toBeTruthy();
  });

  it("does not render description when omitted", () => {
    render(<SettingsSection title="General">child</SettingsSection>);
    expect(screen.queryByText("Some description")).toBeNull();
  });

  it("renders children", () => {
    render(
      <SettingsSection title="General">
        <span>child content</span>
      </SettingsSection>
    );
    expect(screen.getByText("child content")).toBeTruthy();
  });
});
