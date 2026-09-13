# Agent Environment Notes

Written setup notes for agents working on this repository — produced under
modernization task Pre.1 and staged to feed `CLAUDE.md` in task Pre.2.

## Toolchain

- **Node.js 24 LTS** — the pinned toolchain, declared in `.nvmrc` (so
  `nvm use` picks it up) and floored by `engines.node` in `package.json`.
- **npm** — bundled with Node. There is no pnpm/yarn setup in this repo.

## Install

```bash
npm ci
```

Always install with `npm ci` — never `npm install` ad-hoc.
`package-lock.json` is committed at lockfile v3 and `npm ci` reproduces it
exactly; an ad-hoc `npm install` rewrites the lockfile.

`npm ci` also runs the `prepare` script (`"prepare": "husky"` in
`package.json`), which installs the git hooks under `.husky/`. The
`.husky/pre-commit` hook runs `npx prettier --check .` and `npx eslint .` —
the same checks as `format:check` and `lint` below.

## Commands

| Command | What it runs |
| ------- | ------------ |
| `npm run build` | `node build.js` — esbuild bundle into `dist/` |
| `npm test` | `node test.js` — offline unit suite |
| `npm run coverage` | `node --test --experimental-test-coverage` — offline coverage report over `src/` + `proxy-*.js` |
| `npm run lint` | `eslint .` |
| `npm run format:check` | `prettier --check .` (`npm run format` rewrites) |
| `npm run proxy:start` | `node proxy-server.js` — local CORS proxy on `$PORT` |

Coverage is scoped to `src/**` and `proxy-*.js` — the suite's real surface:
`dist/` is generated and test files are excluded. It needs the pinned Node 24
toolchain (`--test-coverage-*` flags require Node ≥22). Baseline at
introduction (issue #22): **91.96%** lines / **81.58%** branches /
**92.16%** functions — the M3 reference number for future improvement.

## Environment variables

The code reads **`PORT`**, **`HOST`** (bind address — set `127.0.0.1` when a
fronting proxy terminates TLS), plus the proxy hardening keys
**`ALLOWED_ORIGINS`**, **`RATE_LIMIT_MAX`**, and **`RATE_LIMIT_WINDOW_MS`**
(all in `proxy-server.js`). Everything else `.env.example` lists
(`YOUTUBE_PROXY_URL`, `NODE_ENV`, the outdated
`RATE_LIMIT_REQUESTS`/`RATE_LIMIT_WINDOW` names, …) is dead configuration —
safe to leave unset.

## Integration tests — live network required

`npm test` does **not** run the integration tests. Both `test:integration*`
scripts require live network access to YouTube plus a working CORS proxy, and
both are **explicitly opt-in**: each file exits early with a skip message
unless `RUN_INTEGRATION=1` is set in the environment.

- `RUN_INTEGRATION=1 npm run test:integration` (`node integration.test.js`) —
  hits YouTube via the public `api.allorigins.win` proxy, which may be
  rate-limited.
- `RUN_INTEGRATION=1 npm run test:integration:proxy`
  (`node integration-with-proxy.test.js`) — requires `npm run proxy:start`
  already running in a second terminal.

CI runs them only in the `integration` job of `ci.yml`, gated to
`workflow_dispatch` and the weekly `schedule` trigger — never on push/PR.

Treat them as manual/optional checks in sandboxed or agent environments: an
offline failure is expected, not a regression.
