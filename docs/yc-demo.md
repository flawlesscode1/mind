# MIND: factual YC evidence and a 60–90 second demo

## Status checked for this application

Checked during the November 13, 2026 (US Eastern) preparation session. Repository: `flawlesscode1/mind`. This document is a snapshot; inspect GitHub before claiming a later merge or CI result.

| Scope | Operational evidence | Boundaries |
| --- | --- | --- |
| `main`, `adcf27aa52af1d39031c2591307150774f007446` | `.mind` parser, TypeScript state interpreter, local browser canvas runtime, integer movement, named collectibles, win conditions; five stdio MCP tools | Experimental v0.1 game DSL, not a general-purpose software language or full game engine |
| PR #2, `a41846c22705ad59c2f10b7d912503181ab3da3e` | Release manifest, optional project pins, conformance fixtures, version-aware MCP intake, candidate/evidence storage, signature-gated lifecycle | **Open and unmerged when checked.** These features are branch-only; do not describe them as shipped on main |
| This demo branch, based on main | Genuine coding-agent-authored `examples/yc_collect.mind`, real MCP client commands, selection of the file to play, browser source link | No LLM is embedded in MIND; no language or extension-security rewrite |

**PR #2 CI is passing:** [MIND conformance run 43497061198](https://github.com/flawlesscode1/mind/actions/runs/43497061198) completed successfully. Jobs `test (20)`, `test (22)`, and `test (24)` each passed dependency installation, tests, demo, and diff checks. [PR #2](https://github.com/flawlesscode1/mind/pull/2) was open, unmerged, and mergeable when checked. Main has no checked-in CI workflow at the audited commit; the green result belongs to PR #2, not a main-branch release.

Local evidence executed during this preparation:

- Clean main build: **14/14 tests passed** on Node 24.22.1. Switching from PR #2 initially left compiled branch-only tests in ignored `dist/`; those failed against main exports. Removing generated `dist/` and rebuilding resolved that branch-switch artifact issue. It is why a clean build is recommended below.
- Demo branch: **16/16 tests passed** on Node 20.20.2, 22.23.5, and 24.22.1, preserving all main tests. The two additions verify exact collection/win behavior, real MCP validation/capability responses and failure exit status, default/custom source serving, and the source link.
- MCP `mind_validate` returned `valid: true`, title `Three Stars`, and `collectibleCount: 3`. MCP capability queries returned `supported: false` for gravity and jumping.
- Real Linux Chromium: loaded the selected source, won after six Right-arrow presses, displayed all three collectibles in the source tab, and reset to `Collected 0/3` on Restart.
- Windows Command Prompt commands below have been written for Windows syntax; this session executed equivalent Node/npm actions on Linux. **No Windows execution or recording was performed here.**

## What to claim

Suggested factual description: “MIND is an experimental programming language designed for AI agents and humans to build software together. Today, its working prototype interprets small games from real `.mind` source files. External coding agents can discover its current capabilities and validate programs through MCP. We are building a tested, maintainer-controlled path for language extensions.”

The broader software/vibe-coding use case is the product direction; this repository currently demonstrates a narrow game language. There is no evidence here for users, revenue, traction, productivity improvements, benchmarks, or autonomous language evolution. The founder reports being solo with 100% ownership; that is founder-provided information, not independently established by repository inspection. Do not infer YC deadline or late-application acceptance from this document.

### Implemented versus planned

Implemented on main: one player; safe integer grid coordinates and movement deltas; collectible declarations; collection at the movement destination; reachable positive win target; browser rendering/keyboard control/Restart; source validation; capability checks; spec lookup; local proposal intake/status. Unsupported syntax produces an error. Numeric bounds are documented in `language/spec.md`.

PR #2 only: centralized language manifest/version pins, data-only candidate fixtures, deterministic compatibility verification, persisted candidate/evidence bindings, and signed maintainer lifecycle records. Approval/publication are denied by default with an empty key policy. Its `published` state is a local authorized record, not an uploaded package or automatic release.

Planned/not implemented: gravity, jumping, platform physics, 3D, arbitrary application development, autonomous extension implementation, automatic approval, and autonomous remote publishing. A gravity/jumping proposal or a failed verification result is **not** working physics. No Firebase integration is needed for this demo.

## Generation provenance: choose an honest recording path

`examples/yc_collect.mind` was authored by the actual Codex coding assistant during this preparation task from the reproducible request in `docs/yc-game-prompt.txt`. It was not generated by the demo CLI, and MIND itself did not invoke an LLM. The original `examples/first_game.mind` is unchanged.

Choose one:

1. **Live external-agent path (preferred if already available):** show the request in an already authenticated coding-agent session, let the real agent create the file, then validate/play it. Use existing included access; do not create a paid API key or buy credits for this demo. The founder can use this existing Codex workspace session or another already available coding agent. Agent latency is variable; 60–90 seconds is a recording target, not a measured generation benchmark.
2. **Prepared AI-artifact replay:** show the actual preparation conversation and resulting file, and say “Codex generated this source during preparation; now I’m validating and running it.” This demonstrates a real previously AI-authored artifact, **not live prompt-to-game generation**.
3. **Clearly labeled fallback:** run the unchanged original example. Say “This is the existing working example, not an AI generation demo.” Do not display a fake agent response or call a copied example newly generated.

The live path needs an external model session. No new end-to-end model API integration has been built. If that session is unavailable tonight, use the labeled fallback immediately rather than delaying the application.

## Windows Command Prompt: preparation before recording

Each code block is **one command**. Use Command Prompt (`cmd.exe`), not PowerShell. This fresh clone avoids disturbing other work. Prerequisites: Git, Node.js 20/22/24 and npm; Node 24 is a sensible choice for tonight. This demo requires no API key or paid service.

```bat
git clone https://github.com/flawlesscode1/mind.git mind-yc-demo
```

```bat
cd mind-yc-demo
```

```bat
git fetch origin docs/yc-recordable-demo
```

```bat
git switch --create yc-recording FETCH_HEAD
```

```bat
node --version
```

```bat
npm install --no-package-lock
```

This main-based branch intentionally does not duplicate PR #2's unmerged lockfile or versioning implementation. Use PR #2's `npm ci` instructions only when intentionally testing that branch. Main's dependency ranges remain unlocked; local test results above identify the actual tested environment, not a guarantee about future dependency resolutions.

If reusing a checkout after switching branches, clear **generated build output only**:

```bat
if exist dist rmdir /s /q dist
```

```bat
npm test
```

For live generation, display the exact human request:

```bat
type docs\yc-game-prompt.txt
```

To ensure the agent actually writes rather than merely observes the prepared file, remove only the recoverable demo artifact before asking the model:

```bat
del examples\yc_collect.mind
```

Paste the displayed request into your already available coding agent opened at this clone. If Codex CLI is already installed, authenticated, and covered by existing included access, this is an alternative real invocation (not required):

```bat
codex exec --sandbox workspace-write - < docs\yc-game-prompt.txt
```

The CLI invocation was **not executed in this preparation session**. Do not install a new paid model integration if it is unavailable. If you use the agent UI instead, there is no generation command: the real human-to-agent interaction is what you record. A completed agent write is required before proceeding with the live-generation claim. If you choose prepared replay instead, restore the file and explicitly label it:

```bat
git restore examples\yc_collect.mind
```

An already configured MCP-capable agent can invoke `mind_get_spec`, `mind_validate`, and `mind_check_capability` directly. Launch its MIND server as `node` with the absolute path to `dist\src\mcp.js`, with this repository as working directory; do not use npm banners on an MCP stdio connection. The CLI below connects to that same genuine MCP server and works without configuring a separate agent plugin.

## Windows Command Prompt: the recording take

Have the browser, agent and terminal ready; finish installation/build before recording. On Windows 11, use Snipping Tool's video recording (Win+Shift+R where supported), select the region containing these windows, and check microphone settings if narrating. Screen-recording behavior varies by Windows version and was not tested here.

Show the real request and real agent response, or disclose prepared replay/fallback as above. Then display the generated source:

```bat
type examples\yc_collect.mind
```

Validate through the real MCP server:

```bat
node scripts\yc-demo.mjs validate examples\yc_collect.mind
```

Expect `MCP tool: mind_validate`, `"valid": true`, `"title": "Three Stars"`, and `"collectibleCount": 3`. This validates language semantics; the browser separately enforces its 16×12 grid. A failed validation exits 1; stop and ask the agent to fix the source rather than narrating success.

Start the existing local runtime on the selected source in this terminal:

```bat
node dist\src\server.js examples\yc_collect.mind
```

Leave it running. In a **second Command Prompt** opened in the same clone, open the browser:

```bat
start "" "http://127.0.0.1:3000"
```

Click the game, press Right **six times**, and observe `YOU WON! Collected 3/3`. Click **View the running .mind source** to inspect the exact served program, then return to the game and click Restart if desired.

In the second terminal, ask about an unsupported capability:

```bat
node scripts\yc-demo.mjs capability gravity
```

Expect `MCP tool: mind_check_capability`, `"supported": false`, and a detail explaining that gravity is absent. Optional additional check:

```bat
node scripts\yc-demo.mjs capability jumping
```

Stop the server after recording with Ctrl+C in its terminal. If port 3000 is already occupied, use a fresh terminal with `set PORT=3001`, start the server there, and open port 3001 instead. Do not kill an unrelated application.

### Suggested 75-second take

| Time | Visible action | Accurate narration |
| --- | --- | --- |
| 0–20s | Human request and actual agent file write, or honestly labeled prior generation | “I ask an external AI coding agent for a three-collectible game in MIND.” |
| 20–35s | `type` source; run MCP validation | “The result is a real `.mind` program. MIND checks its syntax and semantics.” |
| 35–60s | Browser, six Right presses, victory and source tab | “The TypeScript interpreter executes that source. I can inspect both the code and the result.” |
| 60–75s | MCP gravity check returns false | “Gravity is not implemented. MIND reports that honestly; tested language extensions are the direction we’re building toward.” |

Do not promise fixed AI response latency. If you edit out a long generation wait, disclose the edit; never fabricate a generation event. You can start the server before recording and refresh after the agent writes the file, since the runtime reads the source on request.

## Fallback: existing example, no AI-generation claim

This uses the demo branch's MCP helper with the unchanged original example. Say “Existing working example” on screen or aloud.

```bat
node scripts\yc-demo.mjs validate examples\first_game.mind
```

```bat
node dist\src\server.js
```

In a second Command Prompt in the clone:

```bat
start "" "http://127.0.0.1:3000"
```

Press Right once to win, open the source link, then run the same `capability gravity` command. If using only untouched main without this PR, `npm run play` runs this original browser example; the MCP helper and source link are additions in this demo PR.

## Why MIND is a programming language

`.mind` files have a specified grammar and executable semantics independent of any prompt or model. The TypeScript parser produces a program representation; the interpreter turns it into deterministic state transitions; the browser renders those states. The same source runs without a model, and invalid source is rejected without asking one. MCP lets external agents discover and use this language; it is not the language's execution engine. Today it is intentionally a small DSL. Automated, tested language evolution is a defining goal under development, not a completed autonomous capability.

## Remaining limitations and tonight's decision

There is no in-product model invocation, polished IDE, general-purpose application runtime, physics engine or measured generation benchmark. The browser grid and controls are fixed; players and collectibles must fit the grid. The main MCP/proposal implementation remains experimental and lacks PR #2's limits/versioning/security additions until that PR is reviewed and merged. This demonstration does not modify or bypass PR #2's signature policy, pins or verification code. Future branch integrations must preserve those controls.

No feature work or PR #2 merge is required to record the existing browser behavior tonight. Use the live external-agent path only with an actual available model, and otherwise use the clearly labeled fallback. Review the final video and application for claims that go beyond the evidence above.
