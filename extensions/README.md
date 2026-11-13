# MIND extension proposals

Agents may propose new capabilities using the MCP tool `mind_propose_extension`. Proposals are written to `extensions/proposals/<uuid>.json` on the machine running the server. These files are **local and untrusted input**, not automatically committed or published. Status remains `proposed` until a future review and release workflow is implemented.

MIND v0.1 does **not** autonomously implement, approve, test, or release extensions. Only the authorized maintainer may approve official releases. Treat proposals as design requests, not executable code.
