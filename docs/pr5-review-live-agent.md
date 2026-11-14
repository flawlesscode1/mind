# PR #5 review and opt-in live Codex adapter

## Review scope and findings

The complete PR #5 changes were inspected: shared program validation/preview, MCP schemas and handlers, browser approval state, source rendering/Blob links, local server routes, browser module packaging, example handoffs, tests and documentation. The original 32-test suite and the working prepared demonstration were reproduced before changes.

Confirmed defects fixed on the existing PR branch:

1. **Initial-source race:** runtime and workshop fetched `game.mind` separately. Holding the first HTTP response while allowing the second to finish let a person inspect and approve Two Stars; releasing the first response then replaced it with Three Stars. The workshop now remains disabled until runtime initialization settles and reads the exact loaded source/version from that runtime. It no longer performs a competing source fetch. A delayed-response browser regression covers the boundary.
2. **Missing capability declaration:** `readHandoff` treated an absent `requestedCapabilities` property as `[]`, contrary to its required handoff format. Imports now require the array; `[]` remains a deliberate empty declaration. A regression covers the omission.
3. **Approval snapshot completeness:** ordinary request edits already disabled approval through `input` events, but the request text was absent from the exact snapshot comparison. It is now included as defense in depth, alongside source, version, declared capabilities and the running source. Request-edit regression coverage was added.

Normal browser actions cannot apply a candidate without inspection and the approval button. Unsupported versions, invalid syntax, browser bounds and unavailable declared capabilities block approval. Source and summaries use text/value properties rather than untrusted HTML. The source link after approval opens a Blob containing the same source passed to the real interpreter. Tests compare those bytes. Root and `/mind/` static packaging reuse the actual compiled interpreter and workflow modules; Node-only provider code is excluded from the browser artifact.

The local UI remains an intent boundary, not authentication or an authorization defense against developer-console JavaScript or another compromised same-origin script. Declared capabilities do not prove natural-language intent, and the line summary does not show reordering. Language-extension signatures and approval remain separate and unchanged.

## Architecture: local generation, independent validation, human application

```text
request.txt
  → local opt-in Codex CLI adapter (existing user login)
  → provider JSON: source + declared capability IDs
  → host-side handoff validation + actual MIND parser/capability checks
  → private handoff.json + inspection.json + trace.json
  → human imports into browser, inspects source and changes
  → explicit human approval of exact snapshot
  → actual MIND interpreter executes; human observes state/result
```

`scripts/generate-program.mjs` and `src/agents/codex.ts` isolate the provider. They are not served by the website, imported into the browser, or exposed as an anonymous HTTP/MCP generation endpoint. Provider-specific dependencies consist of an already installed official Codex CLI; no npm dependency or API key was added. Manual source entry and prepared handoff replay still work.

Each attempt uses a new temporary working directory, no repository context, ephemeral CLI execution, read-only sandbox, ignored user configuration, disabled shell/unified-exec/apps/browser/computer/plugin tools, and disabled web search. Request text goes through stdin rather than command-line interpolation; `shell:false` is enforced. Reported unexpected tool items fail the generation contract. This policy reduces tools/context; it is not a substitute for trusting the installed CLI and its own sandbox implementation. The adapter never enables dangerous bypass flags, approves source execution, or installs capabilities.

The model returns only `{source, requestedCapabilities}`. It cannot set trusted validity, approval, provenance, request or language version. The host binds those fields to the input/current release and independently runs MIND inspection. Invalid or unsupported output remains invalid; provider errors, missing output, timeouts, excessive output and unexpected tools do not become success. At most 512 KiB of transient provider stream data is accepted, with a 90-second invocation timeout and termination escalation. Temporary provider data is removed afterwards.

## Actual live attempt: blocked before model invocation

The real installed agent was **Codex CLI 0.167.0-alpha.4**, reporting **Logged in using ChatGPT**. It was invoked for this fresh request:

> Create a new MIND game called Lantern Trail. Put the player Scout at (2,3), and place collectibles Amber at (4,3), Jade at (4,5), and Pearl at (7,5). Win after collecting all three. Use only currently implemented movement, collectibles, and win conditions. This is a new source-generation request, not the prepared Two Stars example. Do not execute the game or install any capabilities; return source for my inspection.

The CLI exited 1 before a model turn, with:

```text
Error: failed to initialize in-process app-server client: Read-only file system (os error 30)
```

Authentication is present, but this managed environment's protected Codex runtime storage prevents initialization. No sandbox restriction was weakened; no credentials were copied and no protected home directory was made writable. The adapter reports `blocked` (`provider-runtime-read-only`) and produces no successful handoff. No specific model was selected or reported because the model call did not begin.

**The requested fresh live-generation → human-approval → execution demonstration was not completed.** No prerecorded response or manually authored Lantern source is substituted. Browser approval clicks in automated regression tests are test automation, not evidence that the human approved a newly generated live program.

## Reproduction on a supported local host

Use a normal user account with an official Codex CLI whose own runtime storage is writable and whose existing login/provider access is available. Do not put credentials in the static page or add them to this repository. The adapter requires the CLI flags used here; older versions may need an upgrade from the official source. On Windows use a native Codex executable; `MIND_CODEX_BINARY` can point to its absolute path if the PATH entry is only an npm `.cmd` shim. There is no shell fallback. This Windows setup was not tested in the Cloud session.

From the repository root, one command at a time:

```sh
npm ci --ignore-scripts
```

```sh
npm run build
```

```sh
codex login status
```

Create `work/request.txt` with a new human request (1–4096 characters), then choose a previously unused output directory:

```sh
node scripts/generate-program.mjs work/request.txt work/live-request-01
```

On actual provider success, inspect the generated `program.mind`, `inspection.json`, `handoff.json` and `trace.json`. `generated` means host parsing/browser-capability validation passed; it does not mean the human approved or the program ran. `invalid` preserves diagnostics; `blocked` means no usable live handoff. There is no automatic retry or fallback response.

```sh
npm run play -- examples/yc_collect.mind
```

Open localhost:3000. Paste `handoff.json` into the workshop and import it; inspect/validate against the running source. The human must read the code, changes, pinned version, capability report and expected behavior, then explicitly choose **Approve this source and run**. Observe the actual canvas/state output and source link. Do not call an automated Playwright click human approval.

To execute a read-only MCP preview separately, send the exact generated source/version/capabilities to `mind_inspect_program` and `mind_preview_program` with explicit bounded move actions. Preview is not application or approval. The browser uses the same parser/interpreter without trusting model claims.

## Trace/security boundaries

Private attempt files are created under ignored `work/` only, with restrictive permissions and exclusive new output directories. The trace records request/prompt and hashes, adapter policy/version, CLI version when available, language version, timestamps, exit/outcome, model only when actually reported, and allowlisted event-type counts. Successful output records the exact generated source and its SHA-256 in the CLI summary. Raw CLI stdout/stderr, model reasoning, tool text, provider session identifiers, authentication files and environment values are not persisted.

The request and generated source themselves may be confidential. They are deliberately local and must be reviewed before sharing; this is not a general-purpose secret detector. Existing Codex login is handled by the CLI, not MIND. A successful generation may consume whatever access/quota the user's existing provider account has; no new paid service or credentials were provisioned here.

Unit tests use explicitly synthetic provider fixtures to test success/invalid/failure contracts. Those fixtures are not live model evidence. Tests also cover independent source validation, rejected model-supplied validity fields, missing declarations, unavailable capabilities, oversized requests, tools, timeouts/outcomes and sanitized trace contents. All existing parser, browser, conformance, extension-security and signed-lifecycle tests remain.

## Merge assessment and honest roadmap

After these fixes, PR #5 is suitable for maintainer review/merge **as the inspectable manual/external-handoff workflow plus a guarded local adapter contract**. It is not verified as a working live-provider end-to-end product in this environment. No merge or deployment was performed in this review task. A successful provider run and actual human approval remain the next acceptance gate.

Priorities beyond this milestone:

1. Complete the same fresh-request acceptance test on a host with working Codex runtime storage, record actual model/source/inspection evidence, and obtain real human approval before execution.
2. Improve review feedback around request intent and test expectations without allowing the model to certify its own output.
3. Design one scoped language extension through the existing proposal/conformance process; decide its semantics and compatibility before implementation.
4. Only then evaluate broader values/control flow/output semantics through explicit versioned proposals. MIND remains a narrow game DSL; no general-purpose claim or language redesign is part of this work.

## Executed verification for this revision

The expanded suite passed **37/37 tests** on **Node 20.20.2, 22.23.5 and 24.22.1**. Real Chromium passed the static workflow at `/` and `/mind/`, including the delayed initial-source regression, original Three Stars behavior, inspection/approval invalidation, invalid and unsupported candidates, exact running-source access, victory and Restart. The local Codex attempt returned `blocked: provider-runtime-read-only`, exit 1 with no model-turn events. No live generation/approval/execution success is asserted. Hosted CI results are recorded in the PR discussion/description once observed.
