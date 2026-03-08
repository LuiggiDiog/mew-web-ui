"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { cn } from "@/modules/shared/utils/cn";
import { Button } from "@/modules/shared/components/Button";
import { APP_NAME } from "@/modules/shared/constants";

export function LoginCard() {
  const router = useRouter();
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

  return (
    <div
      className={cn(
        "w-full max-w-sm rounded-2xl border border-border bg-surface",
        "p-8 shadow-xl shadow-black/20"
      )}
    >
      {/* App name */}
      <div className="mb-8 text-center">
        <div className="inline-flex items-center justify-center w-10 h-10 rounded-xl bg-accent/15 mb-3">
          <div className="w-4 h-4 rounded-sm bg-accent" />
        </div>
        <p className="text-xs text-text-secondary uppercase tracking-widest">
          {APP_NAME}
        </p>
      </div>

      <h1 className="text-xl font-semibold text-text-primary text-center mb-6">
        Sign in
      </h1>

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
            placeholder="••••••••"
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

        {error && (
          <p className="text-sm text-error text-center">{error}</p>
        )}

        <Button
          type="submit"
          variant="primary"
          size="lg"
          className="w-full mt-2"
          disabled={loading || !email || !password}
        >
          {loading ? "Signing in…" : "Continue"}
        </Button>
      </form>

      <p className="mt-6 text-center text-xs text-text-secondary leading-relaxed">
        Private workspace &mdash; no accounts shared
      </p>
    </div>
  );
}
