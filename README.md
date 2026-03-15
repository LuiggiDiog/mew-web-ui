# Mew WebUI

Private, self-hosted AI workspace for local and external LLM providers.

Current status: Phase 3 (hardening and expansion), with Phase 1 and Phase 2 completed.

---

## Why "Mew WebUI"?

The name has two intentional meanings:

- A playful nod to cats ("mew")
- "Me New WebUI": a personal take on the open web UI concept

Mew WebUI is inspired by tools like Open WebUI, but with a sharper focus on:

- Simplicity: minimal interface, low friction, and fast daily use
- Privacy: local-first by default, no telemetry, and no prompt logging
- Personalization: built to be your own workspace, not a shared dashboard
- Open source: transparent, inspectable, and easy to extend

---

## Features

- First-run bootstrap flow to create the initial admin account when DB is empty
- Google OAuth and email/password login after bootstrap
- PostgreSQL + Drizzle ORM (users, conversations, messages, providers, settings)
- Streaming chat with Ollama
- Conversation persistence, message edit, and assistant regenerate
- Mobile-first UI with Next.js App Router
- No telemetry and no prompt logging

## Tech stack

- Next.js 16
- React 19
- TypeScript 5 (strict)
- Tailwind CSS 4
- Zustand 5 (UI state only)
- Drizzle ORM + postgres
- Vitest + Testing Library

## Database access conventions

- Centralize runtime DB access in repositories under `src/modules/*/lib/*-repository.ts`.
- Keep API routes and server pages focused on request/response and business flow; they should call repository functions instead of importing `db` directly.
- Group queries by feature domain (`auth`, `settings`, `providers`, `conversations`, `chat/messages`) to reduce duplication and improve control.
- Keep user-scoped filters inside repositories to avoid repeating security-sensitive conditions across routes.

## Prerequisites

- Node.js 20+
- npm 10+
- Docker + Docker Compose
- Ollama (optional but needed for local model chat)

## Quick start

1. Clone and install dependencies.
```bash
git clone <your-repo-url>
cd <repo-folder>
npm install
```

2. Start PostgreSQL containers.
```bash
docker compose up -d
```

3. Create your local env file.
```bash
cp .env.example .env
```
Windows PowerShell:
```powershell
Copy-Item .env.example .env
```

4. Update `.env` values (at minimum set a strong `SESSION_SECRET`).

5. Run migrations.
```bash
npm run db:generate
npm run db:migrate
```

6. Start Ollama (if using local models).
```bash
ollama serve
```

7. Start the app.
```bash
npm run dev
```

Open `http://localhost:3000`.
If the database is empty, the login screen will show a one-time form to create the first admin user.

## Required environment variables

`.env.example` is intentionally versioned and contains only safe placeholders.

- `DATABASE_URL`
- `DATABASE_URL_TEST`
- `SESSION_SECRET`
- `SESSION_COOKIE_NAME`
- `OLLAMA_BASE_URL`
- `OLLAMA_TEST_ONLY_MODEL_ENABLED`
- `NEXT_PUBLIC_APP_URL`

For Google OAuth:
- `GOOGLE_CLIENT_ID`
- `GOOGLE_CLIENT_SECRET`
- `GOOGLE_REDIRECT_URI` (optional)

## Scripts

- `npm run dev` - start dev server
- `npm run build` - production build
- `npm run start` - run production build
- `npm run lint` - ESLint
- `npm test` - run tests
- `npm run test:coverage` - coverage report
- `npm run db:generate` - generate Drizzle artifacts
- `npm run db:migrate` - apply migrations
- `npm run db:seed` - backfill default provider/settings for an existing user
- `npm run db:studio` - open Drizzle Studio

## Privacy and security notes

- Do not commit `.env`, `.env.local`, or real credentials.
- Rotate any credential that was ever exposed in git history, issue comments, screenshots, or chats.
- Keep all model/provider calls behind internal API routes.

## License

This project is licensed under the MIT License. See [LICENSE](./LICENSE).
