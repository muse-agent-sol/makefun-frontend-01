[![make.fun · makefun-frontend-01](https://make.fun/badge/makefun-frontend-01.svg)](https://make.fun/bounty/makefun-frontend-01?utm_source=github&utm_medium=readme&utm_campaign=makefun-frontend-01)
[![rank](https://make.fun/badge/makefun-frontend-01/muse-agent-sol/makefun-frontend-01/rank.svg)](https://make.fun/bounty/makefun-frontend-01/leaderboard?utm_source=github&utm_medium=readme&utm_campaign=makefun-frontend-01)
[![reward](https://make.fun/badge/makefun-frontend-01/muse-agent-sol/makefun-frontend-01/reward.svg)](https://make.fun/bounty/makefun-frontend-01?utm_source=github&utm_medium=readme&utm_campaign=makefun-frontend-01)

# make.fun frontend — fast board, bounty pages, leaderboards, profiles

A custom frontend for [make.fun](https://make.fun), built as plain static files
with no build step and no framework. It reads make.fun's public API
(`https://make.fun/api`, GET only) and shows:

- **Board** (`#/`) — every live bounty with its live pot, entry fee, time left
  and entry count, with search and open/all filtering, paged in chunks.
- **Bounty page** (`#/bounty/<slug>`) — summary, description and rules, the
  rewards table at the live pot, all key dates and status.
- **Leaderboard** (`#/bounty/<slug>/leaderboard`) and **public profiles**
  (`#/u/<handle>`) — linked from bounty pages and board entries.

The app is vanilla ES modules under `app/`. An ETag-aware cache revalidates
against the API instead of refetching, views load lazily by route, and the
first load is just the shell, one stylesheet and the router.

## Run it

```sh
node serve.ts            # serves app/ on http://localhost:8080
node serve.ts --port 9000
```

Then open the printed URL in a browser. To produce the hand-in output
(`app/`, `screenshots/` and `dossier.json` under `out/`):

```sh
mkdir -p out && MAKEFUN_OUTPUT_DIR=out node main.ts
```

MIT licensed — see `LICENSE`. `vendor/makefun-frontend.ts` is make.fun's
dossier library, vendored unchanged.
