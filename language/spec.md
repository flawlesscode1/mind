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

Extension proposals remain untrusted design requests. Automated implementation, approval, and versioned releases are not implemented.
