# MAKEEN FM Portal — Web

Next.js 16 (App Router) web app for the Facility Management Portal. This folder is **fully self-contained**, with nothing outside it needed: it has its own dependencies, env, domain contract (`src/shared/`), design tokens and Docker image. Move it anywhere and it runs the same. It's deployed to its own server.

## How it reaches the API

The browser only talks to this app. `src/proxy.ts` forwards every `/api/*` request to the API server at `API_INTERNAL_URL`. That value is read **at runtime**, so one built image works in every environment. Auth cookies stay first-party to the web origin, and the API needs no public exposure.

## Local setup

```bash
npm ci
cp .env.example .env.local  # API_INTERNAL_URL=http://localhost:4000
npm run dev                 # http://localhost:3000 (start the API too)
```

`src/shared/` is the domain contract (field definitions, rules, IST time, India formatting). In this repository, `api/src/shared/` is an identical copy: change both together, and CI checks they match.

## Scripts

| Script                                | Does                                                                                                                          |
| ------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------- |
| `dev` / `build` / `start`             | Next dev server, production build (standalone), run the build                                                                 |
| `lint` / `typecheck` / `format:check` | ESLint (Next + strict type-checked + security) / `next typegen && tsc` / Prettier                                             |
| `test`                                | Vitest unit + component tests (API client, refresh, menu, UI parts, contract)                                                 |
| `test:e2e`                            | Playwright on the built app: every screen at 1440 / 1024 / 768 / 390, WCAG 2.2 AA (axe), sign-in, OTP, drawer, People screens |

Browser tests need a build first (`npm run build`), and answer `/api/*` with fixtures, so no API is needed. They use Playwright's Chromium (`npx playwright install chromium`), or set `PW_CHANNEL=chrome` to use an installed Chrome. Screenshots and traces land in `test-results/`.

## Screens (Phase 5)

| Path                                                                               | Screen                                                |
| ---------------------------------------------------------------------------------- | ----------------------------------------------------- |
| `/login`, `/change-password`                                                       | Sign in; set, change or recover the password with OTP |
| `/dashboard`, `/notifications`, `/profile`                                         | Dashboard & Profile tabs (Profile is read only)       |
| `/people`, `/people/designation-map`, `/people/role-access`, `/people/user-logins` | Admin panel › People                                  |

Sign-in needs the API running with Redis (sign-in limits fail closed without it).

## Docker

```bash
# from this folder
docker build -t makeen-web .
docker run -e API_INTERNAL_URL=http://<api-server-private-ip>:4000 -p 3000:3000 makeen-web
```

## Notes

- Design tokens: `src/app/globals.css` mirrors `src/app/design-tokens.json` (this app's copy of the brand tokens), and a test fails if they drift.
- Partial Prerendering (`cacheComponents`) is off on purpose: it's incompatible with the nonce-based CSP.
- `AGENTS.md` is written by Next.js and points to the version-matched docs in `node_modules/next/dist/docs/`.
