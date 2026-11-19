# Inspectable program creation: smallest working loop

## Initial audit (baseline 3bd7970)

The repository baseline was checked before changes: 27 automated tests passed. `src/mind.ts` parses and executes real v0.1 source, `web/index.html` renders interpreter state, and the Pages build copies the actual browser module graph. The current language has one player, named collectibles, integer destination movement and a collection-based win condition. It is not a calculator language, general application runtime or physics engine.

MCP already exposed the release manifest, spec, capabilities, validation and version-aware proposal intake/status. Program inspection/preview were missing. The extension path already binds candidate commits/fixtures to verification results and requires signed maintainer authorization for approval/publication; default keys are empty. Its local `published` record is not an automatic package release. Those modules and the authoritative language manifest are unchanged by this milestone.

The existing Three Stars example, parser, interpreter, numeric checks, version pins, capability registry, MCP transport, Pages module packaging and browser controls were reused. No new language syntax, dependencies, model API, extension execution or release mechanism was added.

## What is now possible

1. A human describes a small supported game change in the browser workshop.
2. **Prepare prompt for external agent** builds a request containing the real v0.1 constraints and the MCP inspection/preview tool names. This button does not call a model.
3. An external coding agent writes `.mind` source and returns a JSON handoff. The human pastes that handoff and imports it for inspection. Direct source editing is also supported and labeled manual input.
4. **Inspect and validate** parses the exact source at its pinned language version, checks the browser grid, checks explicitly declared capability requirements, shows a plain-language summary, and compares added/removed lines with the running source. The full candidate source remains visible.
5. **Approve this source and run** applies the inspected source through the actual parser/interpreter. Any source/version/capability/request edit disables approval until inspection is repeated. The browser also compares the exact field snapshot at approval time.
6. The existing canvas, win status and live interpreter-state output show what runs. Restart applies to the approved program; the source link and inline source display match that program.

The bundled Three Stars game still starts immediately. Loading or inspecting a candidate does not replace it. The browser's approval control is a local human-intent/UI boundary, not authenticated authorization or a cryptographic receipt. It is separate from signed approval of language extensions. A person with developer-console access controls their own page; no remote privileges or language installation are granted.

## Real agent versus manual/replay paths

The included `two-stars.handoff.json` and `two-stars.mind` were authored by the actual Codex coding assistant during this milestone. They implement the request “Change Three Stars to Two Stars Together: Hero at (1,2), collectibles at (3,2) and (5,2); win after both.” The assistant's generated source was exercised through real MCP calls and the browser. **Load prepared Codex example** explicitly means replay of that previously authored artifact, not a new model call.

The web application has no integrated provider connection. Live generation needs an already available external coding agent/model session. No API key, paid dependency or additional model service was introduced, and no live provider API invocation is claimed. If an external model is unavailable, paste your own source and use the labeled manual path, or replay the prepared example. Tests do not fabricate a model response.

Imported `provenance` is an untrusted declaration, not identity attestation. The application displays that limitation. Declared capability checks are explicit: the app does not infer all natural-language requirements or prove that the code fulfills the human's request. Source syntax still has to be supported, regardless of declarations. A request for gravity/jumping must be rejected or handled as a separate language-extension proposal; no program can approve/install that capability.

## Reproduce locally

On this feature branch, from the repository root, run each command separately:

```sh
npm ci --ignore-scripts
```

```sh
npm test
```

```sh
node scripts/program-workflow-demo.mjs
```

The last command replays the actual prepared handoff through the real stdio MCP server: release discovery, inspection, execution preview, then unsupported-gravity discovery. It prints the request, full source, changes and actual interpreter trace: collected counts 0 → 1 → 2, final status `won`. It does not generate a new program or apply a browser change.

Start the workshop with Three Stars:

```sh
npm run play -- examples/yc_collect.mind
```

Open `http://127.0.0.1:3000`. Confirm Three Stars works. For a live agent session, edit **Your request**, select **Prepare prompt for external agent**, and copy that prompt to your existing agent configured with MIND MCP (`node`, absolute `dist/src/mcp.js` argument, repository working directory). Have the actual agent return the requested JSON format, then paste/import it. To reproduce without a model, choose **Load prepared Codex example (not live generation)**.

Select **Inspect and validate**. Check the removed third collectible, new y=2 coordinates, target 2, version, and declared capabilities. The game above remains Three Stars until you select **Approve this source and run**. Then press Right four times to win `2/2`. Restart resets the approved game. Inspect the live source link to see exactly what executes.

For a failure demonstration, enter `gravity` in the declared capabilities, inspect, and observe that approval is blocked. Try an unsupported version or invalid syntax: diagnostics are shown and the current game remains intact. Typing arrow keys in the source editor does not move the game.

The same workflow is included in `npm run build:pages` output and tested under both root and `/mind/` paths. This milestone is not deployed or merged automatically; the existing public demo remains on the reviewed main version until maintainers review/merge this PR.

## Handoff format and MCP interface

A handoff is data, not executable JavaScript:

```json
{
  "schemaVersion": 1,
  "kind": "mind-program",
  "request": "Make a two-collectible game",
  "source": "game \"Two\" { player Hero at 1 2; collectible First at 3 2; collectible Second at 5 2; win when collected == 2; }",
  "languageVersion": "0.1.0",
  "requestedCapabilities": ["player", "collectible", "movement", "win"],
  "provenance": {"kind": "external-agent", "agent": "Actual agent name"}
}
```

`provenance.kind` can instead be `manual`. Request length is limited to 4,096 characters, source/before-source to 65,536 characters each, version to 64 characters and declared capability IDs to 16. Browser handoff input is limited to 150,000 characters. Existing MCP transport/argument limits remain in force.

New tools:

- `mind_inspect_program`: `source`, optional `beforeSource`, `languageVersion`, `requestedCapabilities`. Returns exact source, validation and browser compatibility, declared unavailable capabilities, parsed game summary and added/removed line inspection. Line reordering is not represented; inspect the full source too. Large line lists are visibly truncated.
- `mind_preview_program`: same inputs plus up to 32 `{ "type": "move", "dx": integer, "dy": integer }` actions. Executes the actual interpreter in memory and returns compact real state traces, `ready`/`won`/`blocked`/`runtime-error`, errors, and failing action index. This is a read-only preview, not a record of human approval or an applied browser change. It uses language coordinates; browser-only grid diagnostics remain separate.

No arbitrary JavaScript, imports, file/network access or user-defined action dispatch is supported. Preview action dispatch is fixed to `move`, with existing safe-integer/runtime checks. These tools never mutate the capability registry, proposal records, release manifest or maintainer policy. External coding-agent permissions outside MIND remain the operator's responsibility; the DSL sandbox is not a sandbox for an entire external coding agent.

## Why this differs from only asking an LLM to write Python

In this small example the agent receives a discoverable, deliberately limited grammar and capability set. MIND independently parses its result, reports that gravity is unavailable, explains concrete source changes, and executes a bounded set of deterministic game actions after local inspection. The model is not used to decide whether code is valid or to invent the execution output. Python tooling can also validate, review and sandbox programs; this prototype does not establish that MIND is faster, safer, or more productive in general. The demonstrated distinction is the integrated, explicit language/capability/review contract for this narrow runtime, not a benchmark advantage.

## Verification and limitations

Unit/integration tests cover valid execution, invalid syntax, safe-integer runtime errors, human inspection output, unavailable/unknown capabilities, version and browser constraints, bounded handoffs/actions, and real MCP discovery/inspection/preview. Existing conformance, proposal-security, signature and Three Stars tests remain. Chromium checks cover root and project subpath, source display, initial Three Stars victory, candidate inspection, approval invalidation after edits, capability/version/syntax rejection, explicit approval, actual Two Stars victory, exact running-source access and Restart.

There is no automatic model retry loop, model identity verification, authentication for the local human review button, arbitrary software execution, physics, or autonomous capability installation/publication. Imported expectations are not treated as proof of intent. The next milestone should connect one explicitly chosen external agent/provider to this handoff contract with recorded request/tool traces and a human approval boundary; design that integration without putting provider credentials in the static site.

## PR #5 review and local live-agent adapter

See [the review and integration report](pr5-review-live-agent.md) for the initial-load race fix, required capability declarations, exact request-bound approval snapshot, and opt-in local Codex CLI adapter. The real Codex attempt in this managed environment failed during initialization because runtime storage is read-only; no fresh live-generated program or human-approved live execution is claimed. The manual/prepared workflow remains operational. Nothing is merged or deployed without review.
