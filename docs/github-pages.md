# Static MIND playground on GitHub Pages

This branch is based on PR #3 (`947cbc4`). It packages the existing browser runtime, the actual TypeScript-compiled `src/mind.ts` interpreter, and `examples/yc_collect.mind` into `_site/`. No backend, model, account, API key, or paid service is needed by visitors. The page expressly states that it performs no live AI generation. Source is displayed inline and available as `game.mind`.

## Build and verify

```sh
npm ci --ignore-scripts
npm test
npm run build:pages
npx playwright install chromium
npm run test:pages
```

`test:pages` serves the output through a static HTTP server and tests both `/` and `/mind/`: relative module/source requests, initial state, six moves to a 3/3 victory, Restart, visible source, and real parser rejection of unsupported gravity syntax. For an installed system Chromium, set `PLAYWRIGHT_CHROMIUM_EXECUTABLE` to its executable path. After deployment, run `node scripts/test-pages.mjs <actual-HTTPS-site-URL>` to test the actual public site. Do not present an expected URL as live before this succeeds.

The build copies only the browser interpreter and its relative module dependency graph; it excludes the MCP server, local proposals, Node runtime code, and credentials. A new lockfile makes this branch reproducible; Playwright is a development-only test dependency. Generated `_site/` is ignored by Git.

## Deployment and permissions

`.github/workflows/pages.yml` tests every PR. It builds and deploys on main pushes and, for the explicitly requested initial deployment, pushes to `feat/github-pages-playground`. PR events do not deploy. Actions uses an uploaded Pages artifact and the official Pages deployment actions. Only the deploy job gets `pages: write` and `id-token: write`; normal jobs have read-only repository access.

In repository Settings → Pages, the build source must be **GitHub Actions**. The workflow attempts initial Pages enablement; GitHub may require a repository administrator to enable it first. If an existing `github-pages` environment restricts deployment branches to main, its protection must allow this specifically authorized feature branch for the initial deployment, or this PR must be reviewed and merged before deploying from main. No protection should be silently bypassed. No autonomous language extension approval/publication is enabled: website deployment and language-release approval are separate operations.

After the initial deployment is merged, maintainers can remove the temporary feature-branch trigger. The public site has no service cost on the public repository's GitHub Pages hosting.

## Merge order and PR #2

1. PR #3 supplies the demo prompt, Three Stars source, source-view link, and selectable local source. This branch contains those commits, so merging this PR also brings in PR #3 if it remains unmerged; review PR #3 first or merge it first for a smaller diff.
2. Merge this static deployment PR after PR #3 (or together as the stacked branch). Deployment does not depend on PR #2.
3. PR #2 remains an independent language-infrastructure change. Its `src/release.ts`, proposal security, signatures, conformance verification and maintainer policy are not changed here.

Expected integration points with PR #2: both branches edit `package.json`/lockfile and the browser's initialization block. Preserve PR #2's `build` provenance script and add this branch's `build:pages`/`test:pages` scripts and Playwright development dependency; regenerate the lockfile with npm. Keep PR #2's `mind.json` version validation, changing its fetch path to `./mind.json`, and keep all browser resource URLs relative. The static builder already traverses `mind.js`'s relative imports (so it will include `release.js`) and copies `mind.json` when present. Preserve the inline source display by reading the fetched source once and passing the same text to the version-aware parser. Update the browser test adapter to recognize the relative config URL.

No PR #2 authorization or release logic needs to be changed to host this playground. Validate the combined branch with the complete automated and static browser suites before merging it.

## Scope deliberately kept small

The page reuses the existing game controls and rendering. A source editor/Validate/Run interface is deferred so deployment does not wait for extra UI. Runtime initialization still performs the real parser validation before enabling play, and the raw/inline source lets reviewers inspect what executes. The public description distinguishes current movement/collection/win behavior from proposed physics and AI-driven language evolution.
