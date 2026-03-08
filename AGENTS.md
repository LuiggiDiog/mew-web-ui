# AGENTS.md — Project Guide for AI Agents

This file is the canonical reference for any AI agent working on this project.
Read it before making any changes.

---

## Project Purpose

**my-web-ui** is a private, self-hosted AI workspace for interacting with local and external LLM providers.

Design philosophy:
- Privacy-first: no telemetry, no shared accounts, no prompt logging
- Single-user by default, locally hosted
- Clean and focused UX — feels like a personal workspace, not an admin dashboard
- Mobile-first layout
- Modular codebase, easy to extend per phase

---

## Current Tech Stack

| Tool | Version | Role |
|------|---------|------|
| Next.js | 16 | Framework (App Router) |
| React | 19 | UI |
| TypeScript | 5 | Language (strict mode) |
| Tailwind CSS | 4 | Styling (CSS-first, no config file) |
| Zustand | 5 | UI state only |
| Sileo | 0.1.5 | Toast notifications |

TypeScript path alias: `@/*` maps to `./src/*`

---

## Architecture

```
src/
  app/
    (auth)/login/           — Login screen
    (private)/              — AppShell layout (drawer + header)
      chat/                 — Empty state / new chat
      chat/[id]/            — Conversation with messages
      settings/             — Settings page
    api/                    — API routes (Phase 2)
    layout.tsx              — Root layout (Sileo Toaster, fonts)
    page.tsx                — Redirects to /chat
    globals.css             — Design tokens, Tailwind @theme
  modules/
    auth/                   — Auth components, mocks, types
    chat/                   — Chat components, store, mocks, types
    conversations/          — Conversation components, mocks, types
    providers/              — Provider components, mocks, types
    settings/               — Settings components, mocks, types
    shared/                 — Button, Badge, Avatar, icons, hooks, utils, constants
  db/
    schema/                 — Drizzle schema (Phase 2)
    migrations/             — Drizzle migrations (Phase 2)
    tests/                  — DB tests (Phase 2)
    index.ts                — DB client (placeholder in Phase 1)
```

Each feature module follows this internal structure:
```
modules/<name>/
  components/   — React components
  mocks/        — Static mock data
  store/        — Zustand stores (chat only, UI state)
  types/        — TypeScript types/interfaces
```

---

## Roadmap

### Phase 1 — UI Prototype (COMPLETE)

**Status: Complete**

Goal: navigable visual prototype with screens, layouts, and mock data. All goals met.

### Phase 2 — Core Development (CURRENT)

**Status: Complete**

Goal: convert the prototype into a working application.

Delivered:
- PostgreSQL via Docker (docker-compose.yml, two containers: main + test)
- Drizzle ORM with full schema (users, conversations, messages, providers, settings)
- Real auth: bcryptjs + iron-session (httpOnly cookies), middleware.ts route protection
- API routes: /api/auth/login|logout|me, /api/chat (streaming), /api/conversations (CRUD), /api/providers, /api/providers/ollama/health|models, /api/settings
- Ollama streaming integration (OllamaClient with isConnected, listModels, chat generator)
- Full conversation + message persistence
- Settings persistence per user
- TDD: Vitest + @testing-library/react, schema tests + auth tests + ollama client tests
- ChatArea + NewChatArea client components for real-time streaming display
- ConversationDrawer fetches real conversations from API
- ModelSelector fetches real Ollama models from API
- ProvidersList fetches real provider status from API
- SettingsToggle persists via PATCH /api/settings

### Phase 3 — Hardening and Expansion

Goal: robustness and advanced features.

Potential inclusions:
- Admin panel
- Health checks
- Technical logs (minimal, no content)
- Multi-user improvements
- Conversation export/import
- RAG / file attachments
- Model comparison
- Performance improvements
- Security hardening

---

## CURRENT PHASE: Phase 3 — Hardening and Expansion

---

## Rules for All Agents

### Modular architecture
- Each feature lives under `src/modules/<name>/`
- Never import a module's internal implementation from another module — use only its exported types and components
- Do not import cross-module stores — use props or context instead
- Keep `shared/` for truly generic utilities only

### Mobile-first
- Design for 375px first
- Use `md:` breakpoints for desktop enhancements
- Test at 375px (mobile) and 1280px (desktop)
- Sticky headers, fixed bottom composer, overlay drawers on mobile

### Privacy rules
- Never log `message.content`, `prompt`, or `apiKey` values
- Never send conversation data to third-party analytics or error-reporting services
- No telemetry
- All AI calls go through internal API routes (Phase 2+), never directly from the client

### Zustand = UI state only
The Zustand store (`chatStore.ts`) holds only ephemeral UI state:
- Drawer open/closed
- Selected conversation ID
- Active model/provider selector

It does NOT hold:
- Message content
- Conversation history
- User data
- Any persisted state

### No prompt logging
Never add `console.log`, `logger.info`, or any logging that captures user prompts, assistant responses, or API keys — not even in development mode.

### Small, safe changes
- Prefer small, reviewable changesets
- Do not refactor multiple modules in a single commit
- Do not add dependencies without justification
- Do not modify working tests without understanding why they fail

### Design system
- Tailwind v4: use `@theme` in `globals.css` for custom tokens — no `tailwind.config.js`
- All colors use CSS custom properties: `--color-accent`, `--color-surface`, etc.
- Dark mode is the default (`color-scheme: dark` on `:root`)
- Fonts: Geist Sans and Geist Mono via `next/font/google`

---

## Phase 2 Transition Guide

When Phase 2 begins, follow this checklist:

1. **Database setup**
   - Install: `npm install drizzle-orm better-sqlite3 @types/better-sqlite3`
   - Install: `npm install -D drizzle-kit`
   - Create `drizzle.config.ts` at project root
   - Define schema in `src/db/schema/` (see placeholder comments)
   - Replace `db = null` in `src/db/index.ts` with real Drizzle client

2. **Auth**
   - Add middleware at `src/middleware.ts` to protect `(private)` routes
   - Implement login logic in `LoginCard.tsx` (replace the `window.location.href` hack)
   - Create session management (use cookies, no JWT stored in localStorage)

3. **API routes**
   - Create `src/app/api/chat/route.ts` for streaming responses
   - Create `src/app/api/conversations/route.ts` for CRUD
   - Create `src/app/api/providers/route.ts` for provider management

4. **Replace mocks**
   - Replace mock imports in pages with real data fetching (Server Components + fetch, or `use server` actions)
   - Keep mock files — they become useful for testing

5. **Testing**
   - Install Vitest + Testing Library
   - Follow TDD: write tests before implementing features
   - Test each module independently

6. **Provider integration**
   - Implement Ollama client in `src/modules/providers/lib/ollama.ts`
   - Implement OpenAI/Anthropic clients similarly
   - Never expose API keys to the client — all calls from API routes only

---

## What NOT to Do

- Do not implement Phase 2 features during Phase 1 tasks
- Do not add `console.log` for prompts or responses
- Do not use `any` types without a comment explaining why
- Do not create global state outside of Zustand stores
- Do not import server-only code in client components
- Do not bypass TypeScript with `// @ts-ignore` unless absolutely necessary
- Do not add npm packages without checking if existing tools cover the need
- Do not modify `AGENTS.md` without understanding the full project context
