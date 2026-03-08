# my-web-ui — Private AI Workspace

A private, self-hosted web interface for interacting with local and external AI models.

> **Current phase: Phase 2 — Core Development (complete)**
> Real auth, PostgreSQL, Ollama streaming, full conversation persistence.

---

## What is this?

A personal AI workspace that runs entirely on your machine. Connect local models via Ollama
or external providers like OpenAI and Anthropic. No data leaves your machine unless you configure
an external provider.

Designed to feel like a focused work tool — clean, fast, and private.

---

## Running the project

```bash
# 1. Start the database
docker compose up -d

# 2. Install dependencies
npm install

# 3. Copy env file and set SESSION_SECRET
cp .env.example .env.local

# 4. Run migrations
npm run db:generate
npm run db:migrate

# 5. Seed the first manual user (set SEED_EMAIL / SEED_PASSWORD / SEED_DISPLAY_NAME in .env.local)
npm run db:seed

# 6. Start Ollama (separate terminal)
ollama serve

# 7. Start dev server
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) — redirects to `/login`, then `/chat`.

For Google sign-in, also set:

```bash
GOOGLE_CLIENT_ID=...
GOOGLE_CLIENT_SECRET=...
GOOGLE_REDIRECT_URI=http://localhost:3000/api/auth/google/callback
```

Other commands:

```bash
npm run build          # production build + TypeScript check
npm run lint           # ESLint
npm run start          # start production server (after build)
npm test               # run all tests
npm run test:coverage  # test coverage report
npm run db:studio      # open Drizzle Studio (DB browser)
```

---

## What's implemented (Phase 1 + 2)

- Login / logout with real auth (Google OAuth for new users + email/password for manual DB users)
- Route protection via middleware
- PostgreSQL database (Drizzle ORM — users, conversations, messages, providers, settings)
- Ollama streaming integration (real-time token streaming)
- Full conversation + message persistence
- Conversation list fetched from DB with real date grouping
- Conversation deletion from context menu (right-click desktop / long-press touch) with confirmation dialog
- Model selector populated from live Ollama API
- Settings persistence (PATCH /api/settings)
- Provider status (live health check)
- TDD test suite (Vitest + Testing Library)
- Chat empty state, mobile-first dark-mode UI

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
| Radix UI Primitives | 1.1.x |

---

## Tech stack (Phase 2 additions)

| Tool | Version | Role |
|------|---------|------|
| Drizzle ORM | latest | DB schema + migrations |
| postgres | latest | PostgreSQL driver (ESM-native) |
| iron-session | latest | Cookie session management |
| bcryptjs | latest | Password hashing |
| Vitest | 4 | Test runner |

## Roadmap

- **Phase 1** (complete): UI prototype — screens, navigation, mocks
- **Phase 2** (complete): Core development — real auth, PostgreSQL, Ollama streaming, TDD
- **Phase 3** (next): Hardening — advanced features, performance, security
