# Agent Environment Notes

Written setup notes for agents working on this repository — produced under
modernization task Pre.1 and staged to feed `CLAUDE.md` in task Pre.2.

## Toolchain

- **Node.js 24 LTS** — the pinned toolchain. An `.nvmrc` file lands with
  Task 0.2; until then install Node 24 LTS manually (`nvm install 24 &&
  nvm use 24`, or your platform's Node installer).
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
| `npm run lint` | `eslint .` |
| `npm run format:check` | `prettier --check .` (`npm run format` rewrites) |
| `npm run proxy:start` | `node proxy-server.js` — local CORS proxy on `$PORT` |

## Environment variables

`.env.example` lists many variables, but **the code reads only `PORT`**
(`proxy-server.js`, default `3000`) — see finding F-DEAD-003. Everything else
in `.env.example` (`YOUTUBE_PROXY_URL`, `NODE_ENV`, rate-limit and CORS keys,
…) is currently dead configuration: safe to leave unset.

## Integration tests — live network required

`npm test` does **not** run the integration tests. Both `test:integration*`
scripts require live network access to YouTube plus a working CORS proxy:

- `npm run test:integration` (`node integration.test.js`) — hits YouTube via
  the public `api.allorigins.win` proxy, which may be rate-limited.
- `npm run test:integration:proxy` (`node integration-with-proxy.test.js`) —
  requires `npm run proxy:start` already running in a second terminal.

Treat them as manual/optional checks in sandboxed or agent environments: an
offline failure is expected, not a regression.
