# Repository Guidelines

## Project Structure & Module Organization
This repository is a `pnpm` monorepo with two workspaces. `packages/plugin` contains the OpenClaw audit and sensitive-operation guard plugin. Runtime source files live in `packages/plugin/src/runtime/`: `service.ts` coordinates hook handling, `store.ts` manages SQLite persistence through Drizzle, `schema.ts` defines tables, and `config.ts`/`policy.ts`/`redact.ts` hold configuration, rule evaluation, and redaction logic. Reusable admin-facing helpers live in `packages/plugin/src/admin/`. `packages/plugin/index.ts` is the plugin entry, `packages/plugin/admin.ts` is the shared admin export entry, and build output goes to `packages/plugin/dist/`. Plugin metadata and host-facing config schema live in `packages/plugin/openclaw.plugin.json`. `apps/admin` is a Next.js full-stack admin console for browsing audit data and editing the OpenClaw runtime plugin config. Keep longer design notes or workflow docs in `docs/`.

## Build, Test, and Development Commands
- `pnpm build`: build all workspace packages.
- `pnpm typecheck`: run TypeScript checks across the workspace.
- `pnpm test`: run the current automated tests.
- `pnpm --filter @horizonzzzz/audit-ops build`: bundle the plugin into `packages/plugin/dist/` with `tsup`.
- `pnpm --filter @horizonzzzz/audit-ops db:generate`: generate Drizzle migration artifacts from `packages/plugin/src/runtime/schema.ts`.
- `pnpm --filter @horizonzzzz/audit-ops db:push`: push the current schema to a local SQLite database during development.
- `pnpm --filter @horizonzzzz/audit-ops pack`: create a `.tgz` package for OpenClaw installation; this runs `prepack`, so it builds first.
- `pnpm --filter @horizonzzzz/audit-ops-admin dev`: start the Next.js admin console in development mode.

If you touch TypeScript types, shared exports, or config shape, run `pnpm typecheck` before opening a PR. If you touch plugin runtime behavior or packaging, also run `pnpm --filter @horizonzzzz/audit-ops build`. If you touch admin routes or server code, also run `pnpm --filter @horizonzzzz/audit-ops-admin build`.

## Coding Style & Naming Conventions
Use TypeScript with ES modules and 2-space indentation. Prefer small, focused modules over large multi-purpose files. Use `camelCase` for variables and functions, `PascalCase` for types/interfaces, and short lowercase filenames such as `service.ts` or `schema.ts`. Keep comments sparse and useful. Match existing JSON formatting in `packages/plugin/openclaw.plugin.json` and workspace package metadata files.

## Testing Guidelines
There is a small automated test suite around shared plugin/admin helpers. Contributions should at minimum pass `pnpm test`, `pnpm typecheck`, and `pnpm build`. For behavior changes, verify manually in OpenClaw with a packed plugin and document what you tested, for example: plugin startup, SQLite creation, audit event writes, rule blocking in `observe` and `enforce` modes, and admin reads/writes against a real runtime config plus plugin state directory.

## Commit & Pull Request Guidelines
Follow the commit style already used in history: `feat: ...`, `chore: ...`, `release: ...`. Keep each commit scoped to one logical change. Pull requests should include a short problem statement, a summary of the implementation, verification commands you ran, and any config, schema, or workspace impact. If a change affects packaging, runtime behavior in OpenClaw, or the admin app's target-file expectations, include the expected install or upgrade path.

## Security & Configuration Tips
Do not commit generated SQLite databases, local state directories, `.next` output, or real audit data. Treat rule definitions, redaction settings, sample payloads, admin target paths, and host runtime config snapshots as potentially sensitive. `packages/plugin/openclaw.plugin.json` defines plugin metadata and editable config schema; it is not the same as the OpenClaw runtime config file that enables the plugin in a host installation. `apps/admin/data/target.json` points to a host environment and should stay local.
