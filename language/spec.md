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
