# MIND

MIND is an AI-native programming language for game development that evolves through AI-driven language extensions and integrates with external LLMs via MCP.

> **Status: experimental v0.1 foundation.** The vision above is not yet fully implemented. Currently this repository contains a minimal `.mind` parser and deterministic game-state interpreter in TypeScript. A minimal browser canvas renderer is included. An experimental MCP server supports spec lookup, capability checks, validation, and proposal intake. Autonomous AI extension implementation and publishing workflows are not implemented.

## Run

Requires Node.js 20+.

```sh
npm install
npm test
npm run demo
npm run play
npm run mcp
```

After running `npm run play`, open http://127.0.0.1:3000 in a browser. Move using arrow keys or WASD, collect the star, and press Restart to replay. The browser fetches and interprets `examples/first_game.mind` at runtime.\n\nSee `language/spec.md` for currently supported syntax, `examples/first_game.mind` for a sample, and `AGENTS.md` for coding-agent instructions.

## Roadmap

1. Expand the browser runtime with more game mechanics and robust validation.
2. Expand MCP integration with automated compatibility tests and agent configuration examples.
3. Versioned extension proposals, validation, and protected releases.
4. Firebase AI Logic hybrid-inference integration for the hackathon.

## MCP (experimental)

Run `npm run mcp` to start the local stdio MCP server. Configure your MCP-compatible coding agent to launch `node` with `dist/src/mcp.js` as its argument and set the working directory to the repository root (run `npm run build` first). Available tools: `mind_get_spec`, `mind_check_capability`, `mind_validate`, `mind_propose_extension`, `mind_get_proposal_status`. Extension proposals are local files, not approved releases. No AI model is invoked by this server yet.
