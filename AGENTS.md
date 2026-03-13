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

## Architecture

- Use modular architecture by default.
- Organize code by feature or module whenever possible.
- Keep module-specific logic inside its own module.
- Put shared code only in shared locations when it is truly reusable.

## React

- Prefer one component per file.
- Each component must live in its own folder to keep related files together, especially tests.
- Prefer colocating the component, its test, and closely related files in the same folder.
- Start with a clear component, then split it into smaller parts only when needed.
- Prefer typed props.
- Use this base structure unless the project already follows a different established pattern:

```tsx
type PropsT = {};

export default function WelcomeHello(props: PropsT) {
  const {} = props;

  return <div>ChatArea</div>;
}

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
```
