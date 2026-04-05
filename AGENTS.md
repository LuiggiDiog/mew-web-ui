# AGENTS.md

## Purpose

This file defines the default instructions for AI coding agents in this repository.
Apply these rules before making changes.
If a direct user request conflicts with this file, follow the user request.
If a subdirectory contains a more specific `AGENTS.md`, that file takes precedence for its scope.

## Communication

- Always respond to the user in Spanish.
- Keep all code, filenames, identifiers, comments, and technical content in English.
- Be concise, clear, and practical.

## Execution Rules

- Run tests only when the user explicitly asks for them.
- Do not run build commands. The user will run builds for verification.

## Architecture

- Use modular architecture by default.
- Organize code by feature or module whenever possible.
- Keep module-specific logic inside its own module.
- Put shared code only in shared locations when it is truly reusable.
- Inside each module, prefer a small folder structure by responsibility.
- Use `components/` for UI.
- Use `services/` for business logic.
- Use `repositories/` for data access.
- Use `types/` for shared module types.
- Use `mocks/` for mock data.
- Only add new folders when they are clearly needed.
- Create dedicated folders when a unit has related files, especially tests.
- This rule also applies to `services/`, `repositories/`, and other module-level units when needed.
- Prefer keeping each logical unit self-contained inside its own folder.

## Index Files

- Use `index.ts` as the public entry point for folders.
- Prefer folder-level imports through `index.ts` instead of importing internal files directly.
- Keep internal implementation files inside the folder and expose only what should be public through `index.ts`.

## React

- Prefer one component per file.
- Each component should live in its own folder together with its related files, especially tests.
- Start with a clear component, then split it into smaller parts only when needed.
- Prefer typed props when the component receives props.
- When applicable, prefer a simple and explicit component structure.
- Adapt the structure to the real needs of the component.
- Do not add unused props, destructuring, or types only to match an example.

Example with props:

```tsx
type PropsT = {
  title: string;
};

export default function WelcomeHello(props: PropsT) {
  const { title } = props;

  return <div>{title}</div>;
}
```

## Project Context

**Mew WebUI** is a private, self-hosted AI workspace for interacting with local and external LLM providers.

Core principles:

- Privacy-first
- Mobile-first
- Modular codebase
- Clean and focused UX

Main stack:

- Next.js
- React
- TypeScript
- Tailwind CSS
- Zustand
- Radix UI Primitives
