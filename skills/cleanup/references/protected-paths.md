# Protected Paths

These paths MUST NEVER be modified or deleted by the cleanup skill. If they appear in scan results, tag them `[PROTECTED]` and exclude from action plans.

Adapt this list to the project — check `CLAUDE.md` for project-specific protected paths.

## Environment & Config
- `.env`, `.env.local`, `.env*.local` — Environment variables
- `.mcp.json` — MCP server configuration
- `.eslintrc.*` / `eslint.config.*` — ESLint configuration
- `tsconfig.json` — TypeScript configuration
- `next.config.*` / `vite.config.*` / `webpack.config.*` — Build tool configuration
- `postcss.config.*` — PostCSS configuration
- `tailwind.config.*` — Tailwind configuration
- `docker-compose.*` / `Dockerfile` — Container configuration
- `Makefile` / `Justfile` — Task runners

## Project Documentation
- `CLAUDE.md` — Project instructions (critical for Claude)
- `README.md` — Project readme
- `CHANGELOG.md` — Change history
- `LICENSE` — License file

## Claude Skills & Config
- `.claude/` — All Claude skills and configuration
  - **Exception:** `.claude/skills/*/workspace/` directories CAN be cleaned (evaluation artifacts)
- `.omc/` — oh-my-claudecode state

## Database & Infrastructure
- `supabase/` — Supabase schema, migrations, config
- `prisma/` — Prisma schema and migrations
- `drizzle/` — Drizzle schema and migrations
- `migrations/` — Database migrations

## Dependency Management
- `package.json` — Modify only via package manager commands
- `package-lock.json` / `yarn.lock` / `pnpm-lock.yaml` — Lock files
- `node_modules/` — Never delete without explicit user request (slow reinstall)

## Git Config
- `.gitignore` — May be APPENDED to, never replaced or truncated
- `.git/` — Never touch
- `.github/` — CI/CD workflows and templates
