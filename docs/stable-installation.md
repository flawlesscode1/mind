# Stable clone and integration scope

## Mac quick start

Install Git and Node.js 24 (Node 20 and 22 are also tested). From a new folder:

```sh
git clone https://github.com/flawlesscode1/mind.git
cd mind
npm ci
npm test
npm run play -- examples/yc_collect.mind
```

Open http://127.0.0.1:3000. Three Stars and the manual/external-agent inspection workshop need no model account or API key. Inspect and approve a candidate program before replacing the running game. The original `examples/first_game.mind` is preserved.

Optional static/browser checks:

```sh
npm run build:pages
npx playwright install chromium
npm run test:pages
```

CI runs the complete suite on Ubuntu 24.04 and macOS 15 with Node 20/22/24, and runs Chromium static/workshop tests on macOS with Node 24. Builds remove generated `dist/` first so removed modules/tests from another branch cannot contaminate a checkout. Every build regenerates the existing source/build provenance.

## What integration means

- PR #5 is the complete manual/external-handoff program inspection flow, with independent parsing, capability/version checks, explicit source-bound local approval, exact running-source access and actual interpreter execution.
- Its opt-in local Codex adapter remains experimental and provider-dependent. This managed host could not initialize its Codex runtime due to read-only storage. Adapter contract/failure tests pass, but no successful live-generation demonstration is claimed. The adapter is not needed for installation, tests or browser execution.
- The solid-tile branch is a complete **inactive candidate/verification milestone**, not an approved language release. The normal parser/version registry remains v0.1 and rejects `wall`. Candidate tests can exercise the new semantics; an applied local trial needs exact verified source/build and an authorized maintainer signature. No keys, approvals or release changes are installed by integrating the code.
- Trial records now include exact move actions alongside the source and resulting trace, and tests replay them against the same candidate. Previously created local evidence is not rewritten.

The integration order is PR #5, then the candidate PR based on it. Existing merged stabilization/versioning/demo commits and local proposal history are retained. No force push, default-branch direct push, branch-protection change or test removal is part of the process.

## Review boundaries retained

Untrusted `.mind`/handoff/proposal data cannot load JavaScript or select arbitrary implementation modules. Only fixed candidate code is available to verification. MCP exposes discovery/validation/inspection and proposal intake, never public approval, publication or candidate-trial commands. Existing locks, quotas, exact revision/build validation and signature gates remain. Program approval in the browser is a local intent boundary, not authenticated extension authorization.

This is still a narrow game DSL, not a general-purpose application language or physics engine. Gravity/jumping are unsupported. Solid tiles are destination-only blockers and cannot be used through the released browser language. See the milestone and review documents for their exact limits.
