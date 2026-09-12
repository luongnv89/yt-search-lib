@AGENTS.md

# CLAUDE.md

Environment and command reference for agents working on this repository —
embeds the Pre.1 notes. Full detail lives in
`docs/development/agent-environment.md`; agent-facing checklist guidance lives
in `AGENTS.md`.

## Toolchain

- **Node.js 24 LTS** — the pinned toolchain, declared in `.nvmrc` (so
  `nvm use` picks it up) and floored by `engines.node` in `package.json`.
- **npm only** — bundled with Node. No pnpm/yarn setup exists here.

## Install

```bash
npm ci
```

Always install with `npm ci` — never `npm install` ad-hoc.
`package-lock.json` is committed at lockfile v3 and `npm ci` reproduces it
exactly; an ad-hoc `npm install` rewrites the lockfile. `npm ci` also runs the
`prepare` script (`"prepare": "husky"`), which installs the `.husky/` git
hooks — `pre-commit` runs `npx prettier --check .` and `npx eslint .`.

## Commands

| Command                  | What it runs                                        |
| ------------------------ | --------------------------------------------------- |
| `npm run build`          | `node build.js` — esbuild bundle into `dist/`       |
| `npm test`               | `node test.js` — offline unit suite                 |
| `npm run lint`           | `eslint .`                                          |
| `npm run format:check`   | `prettier --check .` (`npm run format` rewrites)    |
| `npm run proxy:start`    | `node proxy-server.js` — local CORS proxy on `$PORT` |

## Environment variables

`.env.example` lists many variables, but **the code reads only `PORT`**
(`proxy-server.js`, default `3000`). Everything else (`YOUTUBE_PROXY_URL`,
`NODE_ENV`, rate-limit and CORS keys, …) is currently dead configuration —
safe to leave unset.

## Integration tests — live network required

`npm test` does **not** run the integration tests. Both `test:integration*`
scripts need live YouTube access plus a CORS proxy:

- `npm run test:integration` — hits YouTube via the public
  `api.allorigins.win` proxy; may be rate-limited.
- `npm run test:integration:proxy` — requires `npm run proxy:start` already
  running in a second terminal.

Treat them as manual/optional checks in sandboxed or agent environments: an
offline failure is expected, not a regression.
