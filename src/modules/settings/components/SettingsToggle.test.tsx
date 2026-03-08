// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { SettingsToggle } from "./SettingsToggle";

beforeEach(() => {
  vi.restoreAllMocks();
  vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ ok: true }));
});

describe("SettingsToggle", () => {
  it("renders the label", () => {
    render(<SettingsToggle label="Dark mode" />);
    expect(screen.getByText("Dark mode")).toBeTruthy();
  });

  it("renders description when provided", () => {
    render(<SettingsToggle label="Dark mode" description="Enable dark theme" />);
    expect(screen.getByText("Enable dark theme")).toBeTruthy();
  });

  it("does not render description when omitted", () => {
    render(<SettingsToggle label="Dark mode" />);
    expect(screen.queryByText("Enable dark theme")).toBeNull();
  });

  it("starts unchecked by default (aria-checked=false)", () => {
    render(<SettingsToggle label="Toggle" />);
    expect(screen.getByRole("switch").getAttribute("aria-checked")).toBe("false");
  });

  it("starts checked when defaultChecked=true", () => {
    render(<SettingsToggle label="Toggle" defaultChecked />);
    expect(screen.getByRole("switch").getAttribute("aria-checked")).toBe("true");
  });

  it("toggles aria-checked when clicked", () => {
    render(<SettingsToggle label="Toggle" />);
    const btn = screen.getByRole("switch");
    expect(btn.getAttribute("aria-checked")).toBe("false");
    fireEvent.click(btn);
    expect(btn.getAttribute("aria-checked")).toBe("true");
    fireEvent.click(btn);
    expect(btn.getAttribute("aria-checked")).toBe("false");
  });

  it("calls PATCH /api/settings when settingKey is provided", async () => {
    const fetchMock = vi.fn().mockResolvedValue({ ok: true });
    vi.stubGlobal("fetch", fetchMock);
    render(<SettingsToggle label="Toggle" settingKey="darkMode" />);
    fireEvent.click(screen.getByRole("switch"));
    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalledWith(
        "/api/settings",
        expect.objectContaining({ method: "PATCH" })
      );
    });
    const body = JSON.parse(fetchMock.mock.calls[0][1].body);
    expect(body).toEqual({ darkMode: "true" });
  });

  it("does not call fetch when settingKey is not provided", async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);
    render(<SettingsToggle label="Toggle" />);
    fireEvent.click(screen.getByRole("switch"));
    await new Promise((r) => setTimeout(r, 10));
    expect(fetchMock).not.toHaveBeenCalled();
  });
});
