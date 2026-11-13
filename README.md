# MIND

MIND is an AI-native programming language for game development that evolves through AI-driven language extensions and integrates with external LLMs via MCP.

> **Status: experimental v0.1 foundation.** The vision above is not yet fully implemented. Currently this repository contains a minimal `.mind` parser and deterministic game-state interpreter in TypeScript. A minimal browser canvas renderer is included. An experimental MCP server supports spec lookup, capability checks, validation, and proposal intake. Version-aware extension intake, candidate conformance verification, and signed maintainer lifecycle records are included. Autonomous implementation and publishing are not implemented.

## Run

Requires Node.js 20+.

```sh
npm ci
npm test
npm run demo
npm run play
npm run mcp
```

After running `npm run play`, open http://127.0.0.1:3000 in a browser. Move using arrow keys or WASD, collect the star, and press Restart to replay. The browser fetches and interprets `examples/first_game.mind` at runtime.

See `language/spec.md` for currently supported syntax, `examples/first_game.mind` for a sample, and `AGENTS.md` for coding-agent instructions.

## Roadmap

1. Expand the browser runtime with more game mechanics and robust validation.
2. Expand MCP integration with automated compatibility tests and agent configuration examples.
3. Versioned extension proposals, validation, and protected releases.
4. Firebase AI Logic hybrid-inference integration for the hackathon.

## MCP (experimental)

Run `npm run mcp` to start the local stdio MCP server. Configure your MCP-compatible coding agent to launch `node` with `dist/src/mcp.js` as its argument and set the working directory to the repository root (run `npm run build` first). Available tools: `mind_get_version`, `mind_list_capabilities`, `mind_get_spec`, `mind_check_capability`, `mind_validate`, `mind_propose_extension`, `mind_get_proposal_status`. The version and capability tools describe the active language release, not pending proposals. Intake requires a base language version and capability IDs; status includes candidate identity and persisted verification evidence. No approval/publication tools are exposed, and no AI model is invoked.

## Versioned extension workflow

Optionally pin a project with `mind.json` (`{"languageVersion":"0.1.0"}`). Legacy source remains valid. See [the extension workflow](extensions/README.md) for local candidate registration, automated compatibility checks, maintainer authorization, limits, and the intentionally failing gravity/jumping example.

`npm test` runs regression and data-driven conformance tests. CI repeats the suite on Node 20, 22, and 24 using the dependency lockfile. The browser demo still uses a 16×12 grid; MCP language validation does not enforce browser-only bounds.
