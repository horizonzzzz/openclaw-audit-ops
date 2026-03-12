# Repository Guidelines

## Project Structure & Module Organization
This repository contains an OpenClaw audit and sensitive-operation guard plugin. Source files live in `src/`: `service.ts` coordinates hook handling, `store.ts` manages SQLite persistence through Drizzle, `schema.ts` defines tables, and `config.ts`/`policy.ts`/`redact.ts` hold configuration, rule evaluation, and redaction logic. The package entry is `index.ts`. Build output goes to `dist/` and is the only runtime code published in the plugin package. Plugin metadata and host-facing config schema live in `openclaw.plugin.json`. Keep longer design notes or workflow docs in `docs/`.

## Build, Test, and Development Commands
- `npm run build`: bundle the plugin into `dist/` with `tsup`.
- `npm run db:generate`: generate Drizzle migration artifacts from `src/schema.ts`.
- `npm run db:push`: push the current schema to a local SQLite database during development.
- `npm pack`: create a `.tgz` package for OpenClaw installation; this runs `prepack`, so it builds first.

If you touch TypeScript types or config shape, also run `npx tsc --noEmit` before opening a PR.

## Coding Style & Naming Conventions
Use TypeScript with ES modules and 2-space indentation. Prefer small, focused modules over large multi-purpose files. Use `camelCase` for variables and functions, `PascalCase` for types/interfaces, and short lowercase filenames such as `service.ts` or `schema.ts`. Keep comments sparse and useful. Match existing JSON formatting in `openclaw.plugin.json` and package metadata files.

## Testing Guidelines
There is no dedicated automated test suite yet. Contributions should at minimum pass `npm run build` and `npx tsc --noEmit`. For behavior changes, verify manually in OpenClaw with a packed plugin and document what you tested, for example: plugin startup, SQLite creation, audit event writes, and rule blocking in `observe` and `enforce` modes.

## Commit & Pull Request Guidelines
Follow the commit style already used in history: `feat: ...`, `chore: ...`, `release: ...`. Keep each commit scoped to one logical change. Pull requests should include a short problem statement, a summary of the implementation, verification commands you ran, and any config or schema impact. If a change affects packaging or runtime behavior in OpenClaw, include the expected install or upgrade path.

## Security & Configuration Tips
Do not commit generated SQLite databases, local state directories, or real audit data. Treat rule definitions, redaction settings, and sample payloads as potentially sensitive. `openclaw.plugin.json` defines plugin metadata and editable config schema; it is not the same as the OpenClaw runtime config file that enables the plugin in a host installation.
