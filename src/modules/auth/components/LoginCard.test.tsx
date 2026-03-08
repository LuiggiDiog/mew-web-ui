// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor, act } from "@testing-library/react";
import { LoginCard } from "./LoginCard";

const mockPush = vi.fn();
const mockRefresh = vi.fn();

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: mockPush, refresh: mockRefresh }),
}));

beforeEach(() => {
  vi.clearAllMocks();
  vi.restoreAllMocks();
});

function fillForm(email = "user@example.com", password = "secret123") {
  fireEvent.change(screen.getByLabelText("Email"), { target: { value: email } });
  fireEvent.change(screen.getByLabelText("Password"), { target: { value: password } });
}

describe("LoginCard", () => {
  it("renders email and password inputs", () => {
    render(<LoginCard />);
    expect(screen.getByLabelText("Email")).toBeTruthy();
    expect(screen.getByLabelText("Password")).toBeTruthy();
  });

  it("renders the Sign in heading", () => {
    render(<LoginCard />);
    expect(screen.getByRole("heading", { name: "Sign in" })).toBeTruthy();
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
      vi.fn(() => new Promise(() => {})) // never resolves
    );
    render(<LoginCard />);
    fillForm();
    fireEvent.submit(screen.getByRole("form"));
    await waitFor(() => {
      expect(screen.getByRole("button", { name: "Signing in…" })).toBeTruthy();
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
});
