export type Entity = { name: string; x: number; y: number };
export type Program = { title: string; player: Entity; collectibles: Entity[]; target: number };
export type GameState = { player: Entity; remaining: Entity[]; collected: number; won: boolean };

function safeInteger(value: number): number {
  if (!Number.isSafeInteger(value)) throw new Error("Expected safe integer between -9007199254740991 and 9007199254740991");
  return value;
}
function checkCoordinates(entities: Entity[]): void {
  for (const entity of entities) { safeInteger(entity.x); safeInteger(entity.y); }
}

export function parse(source: string): Program {
  const tokens = source.match(/"[^"\n]*"|==|-?\d+|[A-Za-z_][A-Za-z_0-9]*|[{};]/g) ?? [];
  const normalized = source.replace(/"[^"\n]*"|==|-?\d+|[A-Za-z_][A-Za-z_0-9]*|[{};]/g, "").trim();
  if (normalized) throw new Error("Unsupported character or syntax: " + normalized.slice(0, 30));
  let i = 0;
  const take = () => { if (i >= tokens.length) throw new Error("Unexpected end of program"); return tokens[i++]; };
  const expect = (s: string) => { const got = take(); if (got !== s) throw new Error(`Expected ${s}, got ${got}`); };
  const ident = () => { const v = take(); if (!/^[A-Za-z_][A-Za-z_0-9]*$/.test(v)) throw new Error("Expected identifier"); return v; };
  const num = () => { const v = take(); if (!/^-?\d+$/.test(v)) throw new Error("Expected integer"); return safeInteger(Number(v)); };
  expect("game");
  const quoted = take();
  if (!/^"[^"\n]*"$/.test(quoted)) throw new Error("Expected quoted game title");
  expect("{");
  let player: Entity | undefined;
  let target: number | undefined;
  const collectibles: Entity[] = [];
  const names = new Set<string>();
  while (tokens[i] !== "}") {
    const kind = take();
    if (kind === "player" || kind === "collectible") {
      const name = ident();
      if (names.has(name)) throw new Error("Duplicate entity name: " + name);
      names.add(name);
      expect("at");
      const entity = { name, x: num(), y: num() };
      expect(";");
      if (kind === "player") {
        if (player) throw new Error("Only one player is supported");
        player = entity;
      } else collectibles.push(entity);
    } else if (kind === "win") {
      if (target !== undefined) throw new Error("Duplicate win condition");
      expect("when"); expect("collected"); expect("==");
      target = num();
      if (target < 1) throw new Error("Win target must be positive");
      expect(";");
    } else throw new Error("Unsupported statement: " + kind);
  }
  expect("}");
  if (i !== tokens.length) throw new Error("Trailing tokens");
  if (!player || target === undefined) throw new Error("Player and win condition required");
  if (target > collectibles.length) throw new Error("Unreachable win target");
  return { title: quoted.slice(1, -1), player, collectibles, target };
}

export function start(program: Program): GameState {
  checkCoordinates([program.player, ...program.collectibles]);
  safeInteger(program.target);
  return { player: { ...program.player }, remaining: program.collectibles.map(x => ({ ...x })), collected: 0, won: false };
}
export function move(program: Program, state: GameState, dx: number, dy: number): GameState {
  safeInteger(dx); safeInteger(dy);
  checkCoordinates([state.player, ...state.remaining]);
  safeInteger(program.target); safeInteger(state.collected);
  if (state.won) return state;
  const player = { ...state.player, x: safeInteger(state.player.x + dx), y: safeInteger(state.player.y + dy) };
  const remaining = state.remaining.filter(e => e.x !== player.x || e.y !== player.y);
  const collected = safeInteger(state.collected + (state.remaining.length - remaining.length));
  return { player, remaining, collected, won: collected >= program.target };
}
