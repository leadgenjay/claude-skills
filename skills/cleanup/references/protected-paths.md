# Protected Paths

These paths MUST NEVER be modified or deleted by the cleanup skill. If they appear in scan results, tag them `[PROTECTED]` and exclude from action plans.

## Environment & Config
- `.env`, `.env.local`, `.env*.local` — Environment variables
- `.mcp.json` — MCP server configuration
- `.eslintrc.json` — ESLint configuration
- `tsconfig.json` — TypeScript configuration
- `next.config.*` — Next.js configuration
- `postcss.config.*` — PostCSS configuration

## Project Documentation
- `CLAUDE.md` — Project instructions (critical for Claude)
- `README.md` — Project readme
- `docs/plans/` — Active project plans

## Claude Skills & Config
- `.claude/` — All Claude skills and configuration
  - **Exception:** `.claude/skills/*/workspace/` directories CAN be cleaned (evaluation artifacts)
- `.omc/` — oh-my-claudecode state

## Database & Infrastructure
- `supabase/` — Database schema, migrations, config
- `lib/supabase/` — Supabase client utilities

## Brand Assets
- `public/brand/` — Logo, icons, brand assets
- `public/photos/` — Jay photos used in templates

## Core Application Files
- `app/layout.tsx` — Root layout
- `app/(dashboard)/layout.tsx` — Dashboard layout

## Dependency Management
- `package.json` — Modify only via npm commands, never edit directly during cleanup
- `package-lock.json` — Modify only via npm commands
- `node_modules/` — Never delete without explicit user request (slow reinstall)

## Git Config
- `.gitignore` — May be APPENDED to, never replaced or truncated
- `.git/` — Never touch
