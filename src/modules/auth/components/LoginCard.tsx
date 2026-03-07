"use client";

import Link from "next/link";
import { cn } from "@/modules/shared/utils/cn";
import { Button } from "@/modules/shared/components/Button";
import { APP_NAME } from "@/modules/shared/constants";

export function LoginCard() {
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

      {/* Form — visual only in Phase 1 */}
      <form
        className="space-y-4"
        onSubmit={(e) => e.preventDefault()}
        aria-label="Login form"
      >
        <div className="space-y-1.5">
          <label className="block text-xs font-medium text-text-secondary" htmlFor="email">
            Email
          </label>
          <input
            id="email"
            type="email"
            placeholder="you@example.com"
            autoComplete="email"
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
            className={cn(
              "w-full px-3 py-2.5 rounded-xl text-sm",
              "bg-surface-elevated border border-border",
              "text-text-primary placeholder:text-text-secondary",
              "focus:outline-none focus:border-accent/60 transition-colors"
            )}
          />
        </div>

        <Button
          type="submit"
          variant="primary"
          size="lg"
          className="w-full mt-2"
          onClick={() => {
            // TODO: Phase 2 — real auth logic
            window.location.href = "/chat";
          }}
        >
          Continue
        </Button>
      </form>

      {/* Footer note */}
      <p className="mt-6 text-center text-xs text-text-secondary leading-relaxed">
        Private workspace &mdash; no accounts shared
      </p>
    </div>
  );
}
