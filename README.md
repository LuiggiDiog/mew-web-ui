# my-web-ui — Private AI Workspace

A private, self-hosted web interface for interacting with local and external AI models.

> **Current phase: Phase 1 — UI Prototype**
> The app is navigable with mock data. No real AI, no database, no auth yet.

---

## What is this?

A personal AI workspace that runs entirely on your machine. Connect local models via Ollama
or external providers like OpenAI and Anthropic. No data leaves your machine unless you configure
an external provider.

Designed to feel like a focused work tool — clean, fast, and private.

---

## Running the project

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) — it redirects to `/chat`.

Other commands:

```bash
npm run build   # production build + TypeScript check
npm run lint    # ESLint
npm run start   # start production server (after build)
```

---

## Phase 1 — What's implemented

- Login screen (visual only, no real auth)
- Chat empty state with quick action prompts
- Chat conversation view with mock messages
- Conversation drawer / sidebar (mobile overlay, desktop sidebar)
- Model/provider selector in the composer
- Settings page with toggles and provider list
- Full dark-mode design system
- Modular project structure ready for Phase 2

## What's NOT implemented yet

- Real authentication
- Database (Drizzle ORM — Phase 2)
- Actual AI calls (Ollama, OpenAI, Anthropic)
- Message streaming
- Conversation persistence
- Provider credential management
- Tests (structure prepared, not implemented)
- Server actions

---

## Project structure

```
src/
  app/                    — Next.js App Router pages and layouts
    (auth)/login/         — Login page
    (private)/            — App shell (chat + settings)
    layout.tsx            — Root layout with Sileo toasts
    globals.css           — Design tokens (Tailwind v4 @theme)
  modules/
    auth/                 — Auth types, mocks, components
    chat/                 — Chat components, Zustand store, mocks
    conversations/        — Conversation list, mocks, types
    providers/            — Provider types, mocks, components
    settings/             — Settings components, mocks, types
    shared/               — Button, Badge, Avatar, icons, hooks, utils
  db/                     — Database layer (placeholder, Phase 2)
```

See [AGENTS.md](./AGENTS.md) for the full project guide, roadmap, and rules.

---

## Tech stack

| Tool | Version |
|------|---------|
| Next.js | 16 (App Router) |
| React | 19 |
| TypeScript | 5 |
| Tailwind CSS | 4 |
| Zustand | 5 |
| Sileo | 0.1.5 |

---

## Roadmap

- **Phase 1** (current): UI prototype — screens, navigation, mocks
- **Phase 2**: Core development — real auth, DB (Drizzle + SQLite), real AI integration
- **Phase 3**: Hardening — advanced features, performance, security
