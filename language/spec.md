# MIND Language v0.1 (experimental)

MIND source files use `.mind`. This is a deliberately small executable prototype, not a complete game language.

## Grammar

```ebnf
program = 'game', string, '{', { statement }, '}' ;
statement = 'player', identifier, 'at', integer, integer, ';'
          | 'collectible', identifier, 'at', integer, integer, ';'
          | 'win', 'when', 'collected', '==', integer, ';' ;
```

Identifiers start with a letter or underscore and contain letters, digits, or underscores. Coordinates are integers. Strings use double quotes. Whitespace is insignificant. Duplicate entity identifiers are invalid. Unknown syntax is an error.

## Semantics

A program declares exactly one game, one player, zero or more collectibles, and a required win target. The interpreter creates a deterministic game state. A `move` action changes player coordinates by integer deltas; collectibles at the player's new coordinates are collected once. Victory occurs when the collected count reaches the win target. The separate browser runtime provides basic canvas rendering. A separate MCP server exposes the spec, capability checks, validation, and proposal submission. Physics and autonomous AI extension implementation are not supported yet.

## Numeric and runtime limits

All integer literals, entity coordinates, movement deltas, and movement results must be safe integers from -9007199254740991 to 9007199254740991 inclusive. Values outside this range, fractional values, and non-finite values are rejected; movement that would leave this range throws without changing the input state. A win target must be positive and no greater than the number of collectibles, so an executable v0.1 program needs at least one collectible.

The browser demo additionally requires every entity to start within its 16×12 grid (x from 0 to 15, y from 0 to 11), and prevents movement outside that grid. A failed initialization leaves Restart disabled and the game unplayable. MCP `mind_validate` validates language semantics, including numeric limits; it does not impose this browser-only grid constraint. The core interpreter permits negative coordinates and coordinates outside the demo grid.

## Language versions and project pins

`src/release.ts` is the authoritative release manifest: it defines the active version, supported version pins, capability metadata, runtime constraints, immutable stabilized core revision, and compatibility-fixture hash. The package version identifies tooling; it is not a second language-version authority. Build provenance separately records the exact checkout revision and source/compiled hashes used to evaluate a candidate.

Projects may add `mind.json` containing `{ "languageVersion": "0.1.0" }`. The CLI searches from the source file's directory toward the filesystem root for the nearest descriptor. Without a descriptor, existing programs use the active language version. The browser uses the descriptor served at `/mind.json`, or the active version if it returns 404. An unsupported or malformed descriptor fails initialization. No declaration is added to `.mind` grammar.

The JavaScript parser accepts `parse(source, { languageVersion })`. MCP `mind_validate` accepts the same optional version argument; callers working outside a local project should send their pin explicitly. Unsupported versions identify supported releases and suggest installing a matching release or updating the project pin. Language source is limited to 65,536 characters.

Extensions remain untrusted design requests. Candidate verification is automated; implementation, maintainer review, signing, and release-manifest updates remain manual. See `extensions/README.md` for lifecycle, authorization, limits, and the gravity/jumping demonstration.
