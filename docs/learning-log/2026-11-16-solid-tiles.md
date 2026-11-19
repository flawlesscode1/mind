# Learning log: verified language extension candidate

## Engineering disciplines

| Discipline | Work and lesson |
| --- | --- |
| Programming-language/compiler engineering | Extend one shared parser behind an explicit candidate entry point. Recognizing syntax is different from making it part of the released language. Keep v0.1 rejection behavior intact. |
| Runtime/operational semantics | Define walls as destination blocking and reuse pure state transitions. “Collision” needs precise rules: long moves can cross tiles unless swept collision is deliberately specified. |
| Software verification / test engineering | Combine an immutable compatibility baseline with positive feature fixtures and negative parsing fixtures. A capability label on a passing unrelated test is not evidence of the new behavior. |
| Application security / authorization | Verify exact candidate and evidence signatures before an applied trial. Recheck keys, clean source revision and build provenance at use time; a prior approval alone is not permission to execute changed code. |
| Release/configuration engineering | Separate installed candidate code from active released capabilities. A version string is not authority to activate arbitrary modules or publish a release. |
| Developer tooling / agent protocol design | Expose an explicitly inactive experimental catalog through MCP while preserving truthful active capability checks. Untrusted proposals are design data, never code loaders. |

## Inspect → hypothesize → test

- **Observed baseline:** parser/interpreter/browser, MCP and signed extension lifecycle exist; all 37 baseline tests pass. New-mechanic fixtures for gravity/jumping fail as designed. There is no passing new-capability implementation/trial path.
- **Hypothesis:** a narrow solid-tile candidate can exercise the existing evolution architecture without introducing physics, changing v0.1 or weakening default-deny approval.
- **Implementation:** shared candidate parsing; fixed alternate move semantics; candidate-aware conformance verification; signed local trial with bounded persisted traces; MCP experimental discovery and an artifact-replay review packet.
- **Acceptance experiments:** direct wall movement must preserve state; detouring must win; large deltas must follow the documented destination rule; overlaps/duplicate names/unsafe coordinates must fail; released parser/discovery must still reject/unadvertise the feature.
- **Security experiments:** unsigned or revoked approvals, dirty/stale builds, undeclared profile capabilities and unrelated “coverage” must not permit an applied trial or verified status. Temporary test keys are not the owner's approval.
- **Reproducibility:** candidate source, fixtures, exact revision and evidence IDs are bound in records. A model's explanation or an authored example alone is not executable verification evidence.

## What this does not establish

It does not prove general-purpose language readiness, live model availability, full collision physics, founder approval, or an official 0.2.0 release. The human review/signing step is deliberately pending. No public source push, merge, deployment, paid service or license change is part of this session.

## Next learning exercise

Review the exact proposal/semantics as the maintainer, configure an authorized public key in a reviewed change, sign the resulting verified candidate, and compare the recorded blocked/detour state trace with the expected behavior. Only after that should browser visualization/activation be designed.


## Verification observed

The expanded suite passed 42/42 tests on Node 20.20.2, 22.23.5 and 24.22.1. Chromium passed the existing game/workshop flow at `/` and `/mind/`. Candidate lifecycle tests exercised genuine wall execution and persisted signed-trial traces with ephemeral test-only keys, plus rejection of unsigned/revoked/dirty/stale/undeclared/ineffective-coverage cases. The final clean-commit demo must stop at verified/pending human approval; that deliberate stop is an authorization success, not an unfinished automatic approval feature.
