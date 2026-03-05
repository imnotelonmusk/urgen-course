# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Code Style

Use comments sparingly. Only comment complex code.

## Commands

```bash
# First-time setup (install deps, generate Prisma client, run migrations)
npm run setup

# Development server (uses Turbopack + node-compat polyfill)
npm run dev

# Build for production
npm run build

# Lint
npm run lint

# Run all tests
npm test

# Run a single test file
npx vitest run src/lib/__tests__/file-system.test.ts

# Run dev server in background (logs to logs.txt)
npm run dev:daemon

# Reset database
npm run db:reset

# After changing prisma/schema.prisma
npx prisma migrate dev
npx prisma generate
```

## Environment

Copy `.env` and set:
- `ANTHROPIC_API_KEY` — if omitted, a `MockLanguageModel` in `src/lib/provider.ts` returns static responses instead of calling Claude.
- `JWT_SECRET` — defaults to `"development-secret-key"` when unset.

The Prisma client is generated to `src/generated/prisma` (not the default location).

## Architecture

UIGen is a Next.js 15 App Router app where users chat with Claude to generate React components that render live in an iframe.

### Data flow

1. **User sends a message** → `ChatContext` (`src/lib/contexts/chat-context.tsx`) calls `POST /api/chat` via Vercel AI SDK's `useChat`.
2. **API route** (`src/app/api/chat/route.ts`) reconstructs a `VirtualFileSystem` from the serialized `files` payload, then calls `streamText` with two tools: `str_replace_editor` (create/str_replace/insert) and `file_manager` (rename/delete).
3. **Tool calls stream back** to the client. `FileSystemContext` (`src/lib/contexts/file-system-context.tsx`) intercepts them via `handleToolCall` and mutates the in-memory `VirtualFileSystem`.
4. **Preview** (`src/components/preview/PreviewFrame.tsx`) reacts to `refreshTrigger` from `FileSystemContext`. It calls `createImportMap` + `createPreviewHTML` from `src/lib/transform/jsx-transformer.ts`, which uses Babel standalone to transpile JSX/TSX to JS, wraps each file in a blob URL, and builds an ES module import map injected into an `<iframe srcdoc>`. Third-party packages resolve via `esm.sh`; `@/` aliases map to the virtual FS root.
5. **Persistence**: after streaming finishes (`onFinish`), the API route saves `messages` and `fileSystem.serialize()` to the `Project` row in SQLite (only for authenticated users with a `projectId`).

### Key abstractions

- **`VirtualFileSystem`** (`src/lib/file-system.ts`) — in-memory tree of `FileNode`s. All file operations (create, read, update, delete, rename, str_replace, insert) live here. Serialized as a flat `Record<string, FileNode>` for JSON transport.
- **`FileSystemContext`** — React context wrapping a single `VirtualFileSystem` instance with a `refreshTrigger` counter that drives preview re-renders.
- **`ChatContext`** — thin wrapper around `useChat` (Vercel AI SDK) that injects the serialized FS and optional `projectId` into each request body.
- **`MockLanguageModel`** (`src/lib/provider.ts`) — returned by `getLanguageModel()` when no API key is set; produces deterministic tool calls to create Counter/Form/Card components.

### AI generation rules (system prompt)

The system prompt (`src/lib/prompts/generation.tsx`) tells the model:
- Always create `/App.jsx` as the entrypoint.
- Style with Tailwind CSS only (no hardcoded styles).
- Import local files using the `@/` alias (e.g., `@/components/Button`).
- No HTML files — the virtual FS handles rendering.

### Auth

Custom JWT-based auth (`src/lib/auth.ts`) using `jose`. Sessions are stored in an HTTP-only cookie (`auth-token`). No NextAuth. Middleware (`src/middleware.ts`) protects routes.

### Server Actions

`src/actions/` contains Next.js Server Actions for project CRUD (`create-project.ts`, `get-project.ts`, `get-projects.ts`). All actions validate session ownership before DB access.

### Database

SQLite via Prisma. Two models: `User` (email/password) and `Project` (stores `messages` and `data` as JSON strings). Anonymous users can generate components without an account; work is tracked in `localStorage` via `src/lib/anon-work-tracker.ts`.

### Testing

Vitest + jsdom + React Testing Library. Tests live in `__tests__` folders co-located with source. The vitest config (`vitest.config.mts`) uses `vite-tsconfig-paths` for `@/` path resolution.
