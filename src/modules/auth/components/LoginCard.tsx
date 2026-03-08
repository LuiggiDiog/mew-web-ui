"use client";

import { useState } from "react";
import Image from "next/image";
import { useRouter, useSearchParams } from "next/navigation";
import { cn } from "@/modules/shared/utils/cn";
import { Button } from "@/modules/shared/components/Button";
import { APP_NAME } from "@/modules/shared/constants";

const OAUTH_ERROR_MESSAGES: Record<string, string> = {
  oauth_code: "Google sign-in failed: missing authorization code.",
  oauth_state: "Google sign-in failed: invalid session state. Please try again.",
  oauth_exchange: "Google sign-in failed while validating your account.",
  oauth_email_unverified: "Your Google email must be verified to continue.",
  account_exists_manual:
    "This email already exists as a manual account. Use email/password login.",
};

export function LoginCard() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const oauthError = searchParams.get("error");

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });

      if (res.ok) {
        router.push("/chat");
        router.refresh();
      } else {
        const data = await res.json();
        setError(data.error ?? "Invalid email or password");
      }
    } catch {
      setError("Something went wrong. Try again.");
    } finally {
      setLoading(false);
    }
  };

  const oauthErrorMessage = oauthError
    ? (OAUTH_ERROR_MESSAGES[oauthError] ?? "Could not sign in with Google.")
    : null;

  return (
    <div
      className={cn(
        "w-full max-w-sm rounded-2xl border border-border bg-surface",
        "p-8 shadow-xl shadow-black/20"
      )}
    >
      <div className="mb-8 text-center">
        <Image
          src="/isotype.svg"
          alt={`${APP_NAME} isotype`}
          width={40}
          height={40}
          className="mx-auto mb-3 h-10 w-10"
          priority
        />
        <p className="text-xs text-text-secondary uppercase tracking-widest">{APP_NAME}</p>
      </div>

      <h1 className="text-xl font-semibold text-text-primary text-center mb-4">Sign in</h1>

      <form action="/api/auth/google/start" method="get">
        <Button type="submit" variant="outline" size="lg" className="w-full" disabled={loading}>
          Continue with Google
        </Button>
      </form>

      <p className="mt-3 text-center text-xs text-text-secondary">
        New users must use Google sign-in
      </p>

      <div className="my-5 border-t border-border" />

      <p className="mb-3 text-center text-xs text-text-secondary">
        Manual account access (database-created users only)
      </p>

      <form className="space-y-4" onSubmit={handleSubmit} aria-label="Login form">
        <div className="space-y-1.5">
          <label className="block text-xs font-medium text-text-secondary" htmlFor="email">
            Email
          </label>
          <input
            id="email"
            type="email"
            placeholder="you@example.com"
            autoComplete="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            className={cn(
              "w-full px-3 py-2.5 rounded-xl text-sm",
              "bg-surface-elevated border border-border",
              "text-text-primary placeholder:text-text-secondary",
              "focus:outline-none focus:border-accent/60 transition-colors"
            )}
          />
        </div>

        <div className="space-y-1.5">
          <label className="block text-xs font-medium text-text-secondary" htmlFor="password">
            Password
          </label>
          <input
            id="password"
            type="password"
            placeholder="********"
            autoComplete="current-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            className={cn(
              "w-full px-3 py-2.5 rounded-xl text-sm",
              "bg-surface-elevated border border-border",
              "text-text-primary placeholder:text-text-secondary",
              "focus:outline-none focus:border-accent/60 transition-colors"
            )}
          />
        </div>

        {oauthErrorMessage && <p className="text-sm text-error text-center">{oauthErrorMessage}</p>}
        {error && <p className="text-sm text-error text-center">{error}</p>}

        <Button
          type="submit"
          variant="primary"
          size="lg"
          className="w-full mt-2"
          disabled={loading || !email || !password}
        >
          {loading ? "Signing in..." : "Continue"}
        </Button>
      </form>

      <p className="mt-6 text-center text-xs text-text-secondary leading-relaxed">
        Private workspace - no accounts shared
      </p>
    </div>
  );
}
