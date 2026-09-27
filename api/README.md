# Dev Station — API

NestJS + Prisma + PostgreSQL. Follows `.cursor/rules/api-code-structure-and-best-practices.mdc`.
Endpoints and payloads are documented in `docs/ARCHITECTURE.md`; Swagger UI is served at `/api`.

## Modules

`auth` (email/password, JWT, refresh) · `users` (me, cross-device preferences) · `organizations` (members, invitations,
roles, permission catalog) · `clients` · `projects` (repositories, service definitions, linked issues) ·
`integrations` (Composio: GitHub repositories, Linear teams/projects/issues, Notion pages) · `agents` · `agent-sessions`
(status transitions write activity) · `activities` · `health`.

Authorization is permission-based: `OrganizationGuard` resolves the caller's membership from the `x-organization-id`
header and `@RequirePermissions(...)` checks the role's permissions (`src/shared/config/permissions/`).

## Setup

```bash
npm install
cp .env.template .env.staging     # fill DATABASE_URL, JWT_SECRET, optional COMPOSIO_API_KEY
npx dotenv -e .env.staging -- npx prisma migrate deploy
npm run start:staging
```

| Script | |
|---|---|
| `npm run start:staging` / `start:local` / `start:dev` | Watch mode with the matching `.env.*` |
| `npm run build` / `start:prod` | Production build (`dist/src/main`) |
| `npm run migrate:prod` | `prisma migrate deploy` with `.env.production` |
