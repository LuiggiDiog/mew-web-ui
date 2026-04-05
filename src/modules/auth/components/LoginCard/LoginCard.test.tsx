// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor, act } from "@testing-library/react";
import { LoginCard } from ".";

const mockPush = vi.fn();
const mockRefresh = vi.fn();
const mockSearchParamGet = vi.fn(() => null);

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: mockPush, refresh: mockRefresh }),
  useSearchParams: () => ({ get: mockSearchParamGet }),
}));

beforeEach(() => {
  vi.clearAllMocks();
  vi.restoreAllMocks();
  mockSearchParamGet.mockImplementation(() => null);
});

function fillForm(email = "user@example.com", password = "secret123") {
  fireEvent.change(screen.getByLabelText("Email"), { target: { value: email } });
  fireEvent.change(screen.getByLabelText("Password"), { target: { value: password } });
}

describe("LoginCard", () => {
  it("renders continue with Google button", () => {
    render(<LoginCard />);
    expect(screen.getByRole("button", { name: "Continue with Google" })).toBeTruthy();
  });

  it("renders email and password inputs", () => {
    render(<LoginCard />);
    expect(screen.getByLabelText("Email")).toBeTruthy();
    expect(screen.getByLabelText("Password")).toBeTruthy();
  });

  it("renders the Sign in heading", () => {
    render(<LoginCard />);
    expect(screen.getByRole("heading", { name: "Sign in" })).toBeTruthy();
  });

  it("renders manual access hint", () => {
    render(<LoginCard />);
    expect(
      screen.getByText("Manual account access (database-created users only)")
    ).toBeTruthy();
  });

  it("renders google auth form target", () => {
    render(<LoginCard />);
    const form = screen.getByRole("button", { name: "Continue with Google" }).closest("form");
    expect(form?.getAttribute("action")).toBe("/api/auth/google/start");
  });

  it("submit button is disabled when fields are empty", () => {
    render(<LoginCard />);
    expect(screen.getByRole("button", { name: "Continue" })).toBeDisabled();
  });

  it("submit button is enabled when both fields have values", () => {
    render(<LoginCard />);
    fillForm();
    expect(screen.getByRole("button", { name: "Continue" })).not.toBeDisabled();
  });

  it("shows loading state while submitting", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(() => new Promise(() => {}))
    );
    render(<LoginCard />);
    fillForm();
    fireEvent.submit(screen.getByRole("form"));
    await waitFor(() => {
      expect(screen.getByRole("button", { name: "Signing in..." })).toBeTruthy();
    });
  });

  it("disables Google button while submitting manual login", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(() => new Promise(() => {}))
    );
    render(<LoginCard />);
    fillForm();
    fireEvent.submit(screen.getByRole("form"));
    await waitFor(() => {
      expect(screen.getByRole("button", { name: "Continue with Google" })).toBeDisabled();
    });
  });

  it("redirects to /chat on successful login", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({ ok: true })
    );
    render(<LoginCard />);
    fillForm();
    await act(async () => fireEvent.submit(screen.getByRole("form")));
    await waitFor(() => {
      expect(mockPush).toHaveBeenCalledWith("/chat");
    });
  });

  it("shows error message on failed login", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: false,
        json: () => Promise.resolve({ error: "Invalid email or password" }),
      })
    );
    render(<LoginCard />);
    fillForm();
    await act(async () => fireEvent.submit(screen.getByRole("form")));
    await waitFor(() => {
      expect(screen.getByText("Invalid email or password")).toBeTruthy();
    });
  });

  it("shows fallback error when response has no error field", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: false,
        json: () => Promise.resolve({}),
      })
    );
    render(<LoginCard />);
    fillForm();
    await act(async () => fireEvent.submit(screen.getByRole("form")));
    await waitFor(() => {
      expect(screen.getByText("Invalid email or password")).toBeTruthy();
    });
  });

  it("shows error message when fetch throws", async () => {
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new Error("Network error")));
    render(<LoginCard />);
    fillForm();
    await act(async () => fireEvent.submit(screen.getByRole("form")));
    await waitFor(() => {
      expect(screen.getByText("Something went wrong. Try again.")).toBeTruthy();
    });
  });

  it("shows reauth message when reauth query param is present", () => {
    mockSearchParamGet.mockImplementation((key: string) => (key === "reauth" ? "1" : null));
    render(<LoginCard />);
    expect(
      screen.getByText("Your previous session is no longer valid. Please sign in again.")
    ).toBeTruthy();
  });

  it("renders bootstrap mode when needsBootstrap is true", () => {
    render(<LoginCard needsBootstrap />);
    expect(screen.getByRole("heading", { name: "Create admin account" })).toBeTruthy();
    expect(screen.queryByRole("heading", { name: "Sign in" })).toBeNull();
  });
});
