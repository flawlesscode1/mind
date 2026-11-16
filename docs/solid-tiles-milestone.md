# Evolving-language milestone: first executable extension candidate

## Starting audit and shortest path

Baseline: local `e1cab63` on the unmerged inspectable-workflow branch; fetched main remains `3bd7970`. All 37 baseline tests passed. Existing code supplies the real v0.1 parser/interpreter/browser, version/capability discovery, program handoffs, bounded proposal storage, candidate commit/fixture binding, conformance tests and signed maintainer approval/publication. The opt-in Codex CLI generation adapter previously failed before a model turn because protected runtime storage was read-only. This milestone does not claim that live generation has become available.

The key language-evolution gap was that no new mechanic could be verified and then tried under the existing approval boundary. Gravity/jumping fixtures intentionally fail; there were no executable extension semantics. The highest-value incremental step is one small candidate, **solid tiles**, with actual behavior and a protected local trial path. It avoids a physics engine or rewriting working systems.

The end-to-end route is now:

| Step | Current evidence or required human action |
| --- | --- |
| Human requests a game obstacle | Reproducible request is recorded in the local demo packet |
| Agent produces source and proposal | This session's coding assistant authored the new `.mind` source, proposal and candidate implementation; the reproduction command is artifact replay, not a fresh model invocation |
| Unsupported feature discovered | Real MCP capability check returns false; released parser rejects `wall` |
| Extension proposed | Real MCP intake persists a version-aware proposal |
| Candidate validated/tested | Exact clean commit/build, released baseline, positive wall behavior and negative fixtures are checked; evidence persists |
| Human reviews/approves | **Still required.** No key or approval is installed automatically |
| New program executes | Local `trial` command works only after the exact candidate has a valid maintainer signature; tests exercise it with ephemeral test keys |
| Evidence recorded | Proposal, candidate, fixture hash, verification, approval and trial source/trace bindings remain in bounded local records |

This is a candidate milestone, not an official 0.2.0 release, browser activation, or fully live autonomous loop. The remaining steps are explicit rather than simulated.

## Semantics and affected components

**Parser (`src/mind.ts`):** one shared parser now has an explicit internal candidate entry point. Standard `parse()` still checks the authoritative released version and rejects `wall`. Only the fixed candidate implementation opts into `wall Name at x y;`. It reuses tokenization, unique names, safe-integer coordinates, required player and win-target rules. Player/collectibles cannot start on wall coordinates. Existing v0.1 AST/state shapes remain unchanged.

**Interpreter (`src/extension-candidates.ts`):** the fixed `solid-tiles-v1` engine reuses core `start`/`move` and all numeric validation. If a proposed destination is a wall, the unchanged state is returned; collection does not occur there. Other transitions are ordinary MIND transitions. Large deltas can cross a wall: this is destination blocking, not swept collision, jumping, gravity or a physics simulation. The example first tries the blocked tile, then takes a detour and wins.

**Runtime:** the released browser and its source-approval flow are unchanged. The new runtime path is a local, signed candidate trial returning actual interpreter states and wall metadata. It is intentionally not enabled in the public browser before a version/release review. Low-level candidate functions are trusted verification helpers; the applied-trial boundary is `ProposalStore.trial`/the local CLI. `.mind` text cannot request a parser mode or import JavaScript.

**Agent/MCP interactions:** `mind_get_extension_catalog` exposes fixed experimental metadata: target 0.2.0, active false, released false, syntax and limitations. Existing active-version/capability/validation tools remain truthful about v0.1. There is no public tool for approval, publishing or candidate trial. Proposals never choose executable module paths or install code. They can only refer to the fixed, reviewed candidate already present in the checkout.

**Verification:** existing conformance execution accepts a trusted engine argument. Released fixtures always run against the released engine and unchanged baseline hash. Candidate fixtures run against the fixed target-version engine. A candidate must explicitly request `solid-tiles`, and at least one positive fixture must exercise an actual nonzero blocked move. Relabeling unrelated movement or only jumping over a wall does not count. Exact Git revision/build checks, quotas, locks, signed approval and default-deny maintainer keys remain intact.

**Trial evidence:** approval is rechecked against current trusted keys; the checkout/build must still match verification. Only up to 32 fixed data-only move actions are accepted. At most eight trials fit within existing per-record/storage quotas. Successful trials record source, hash, candidate/verification IDs, source revision, timestamp, actual wall metadata and state trace. Invalid/unauthorized runs do not append trials. These are owner-managed local records, not a remote or cryptographically append-only audit service. Extension approval does not prove that a later program satisfies the human's natural-language intent; the local operator explicitly selects the reviewed program/actions.

## Reproduce without publishing anything

From this clean branch/commit, run one command at a time:

```sh
npm ci --ignore-scripts
```

```sh
npm test
```

```sh
node scripts/solid-tiles-demo.mjs
```

The demo uses real MCP discovery, rejection and proposal intake, then existing local verification. It requires a clean tracked checkout and fresh build (`npm test` builds it). It writes a private review packet under ignored `work/solid-tiles-demo/<id>/` and a proposal under ignored `extensions/proposals/`. It stops at `verified`, awaiting human approval. Source/proposal fixtures are committed inputs; neither a new model response nor an approval is fabricated by the script.

The human should inspect:

- `extensions/examples/solid-tiles/game.mind`, proposal, actions and acceptance fixtures;
- exact candidate commit and fixture/verification IDs in `review.json`;
- baseline/candidate result rows and the explicit destination-only limitation;
- `approval-payload.json`, which binds proposal, exact candidate and verification to base/target versions.

The existing maintainer policy starts empty and remains unchanged. Authorized public keys must be configured by the owner in a reviewed commit **before** registering/verifying an official candidate. Do not place a private key in the repository, MCP config or review packet. Follow the existing signing process in `extensions/README.md`; sign the canonical payload without its trailing CLI newline.

```sh
node dist/src/extensions-cli.js approve <proposal-id> <approval-receipt.json>
```

After the human reviews the program and chooses to run it:

```sh
node dist/src/extensions-cli.js trial <proposal-id> extensions/examples/solid-tiles/game.mind extensions/examples/solid-tiles/actions.json
```

The trace contains a blocked first move and ends with `won: true`. The approved record retains that exact source/trace. Without the proper approval, with revoked keys, a changed commit, dirty checkout or stale build, trial is rejected. The existing publication command still rejects this target because the authoritative active manifest remains 0.1.0. Nothing here signs, releases, merges, pushes or deploys automatically.

## Boundaries and next step

Gravity/jumping remain unavailable. The active manifest/version pins are not widened, and the normal browser cannot execute candidate syntax. Live CLI generation remains a separately recorded provider/runtime blocker; this session did not attempt to bypass it. Tests' temporary signatures are test evidence, not human approval.

The next concrete step is owner review of this candidate and its semantics, followed by a reviewed maintainer-key configuration and an approval of the exact verified revision. Then run the protected local trial and review its recorded output. A later scoped change can connect that approved candidate to a browser renderer/version-selection flow; it should not silently activate unreleased features.

MIND is being developed as a proprietary product, not a hackathon submission. This session does not publish source or change legal grants. The checkout still contains an MIT `LICENSE`; that pre-existing mismatch needs a separate owner decision. No claim is made that a documentation edit revokes existing rights.
