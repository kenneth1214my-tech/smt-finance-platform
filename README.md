# 财务分析平台 (SMT Finance Platform)

Group finance analysis platform — production build. Next.js 16 (App Router) + TypeScript + Prisma + PostgreSQL, custom JWT-cookie auth, 5-language i18n (zh / en / zh-Hant / ms / id).

## Setup

1. Install dependencies:
   ```bash
   npm install
   ```
2. Copy `.env.example` to `.env` and fill in:
   - `DATABASE_URL` — a Neon Postgres **pooled** connection string (used at runtime)
   - `DIRECT_URL` — the same database's **direct** (non-pooled) connection string, i.e. the same host without the `-pooler` suffix. Only used by `prisma migrate`; keeps schema migrations off the pgbouncer pool so they can't get stuck on a leaked advisory lock.
   - `JWT_SECRET`
3. Run migrations:
   ```bash
   npx prisma migrate dev --name init
   ```
4. Start the dev server:
   ```bash
   npm run dev
   ```
   Open http://localhost:3000 — it redirects to `/login`.

## Accounts

There is no seeded demo data and no public sign-up-by-default flow: the platform ships with a single bootstrap `ADMIN` account (created once via the seed script or directly in the database). Everyone else applies for access at `/register`; an `ADMIN`/`DIRECTOR` approves the request from **Settings → 用户与权限**, which emails/shows a temporary password. Every user (including the bootstrap admin) can update their own name/email and change their password from **Settings → 个人资料**.

## What's real vs. not yet built

- **Real**: all 11 dashboard modules (集团总览/经营分析/利润分析/预算管理/资金管理/应收管理/子公司分析/区域分析/项目管理/风险预警/报表中心) read live data from Postgres via Prisma — no hardcoded mock data anywhere in the app. Login/logout, account-request + admin approval workflow, role-based access (`ADMIN`/`DIRECTOR` can approve & disable users; others cannot), 5-language i18n with a cookie-persisted locale, full admin CRUD for every entity (org structure, financials, budgets, banks, AR, projects, risks, reports, currency/exchange rates), self-service profile + password change, and CSV bulk import that validates and writes directly to the database (with per-row error reporting and an import audit log).
- **Currency**: the group's base/reporting currency and per-currency exchange rates are admin-configurable (Settings → 货币设置); multi-currency bank balances are converted to the base currency for aggregation, falling back to face value with a visible warning when a currency has no rate on file yet.
- **Not yet built**: real ERP system integration (用友/金蝶/SAP) — the group currently manages financials in Excel per subsidiary with no unified ERP, so the CSV import path is the primary data-entry mechanism until/unless a specific ERP vendor and integration method (API vs. scheduled export) is chosen.

## Stack

Next.js 16.3.4 · React 19 · Prisma 6.19 · PostgreSQL (Neon) · Tailwind CSS 4 · jose (JWT sessions) · bcryptjs · zod

## Deploying

`npm run build` runs `prisma migrate deploy` before `next build`, so deploys apply pending migrations automatically. Point `DATABASE_URL` and `JWT_SECRET` at your production values (e.g. in Vercel's project environment variables) before deploying.
