export const capabilities = {
  "player": { supported: true, detail: "One player with integer grid coordinates" },
  "collectible": { supported: true, detail: "Named collectibles with collision-based collection" },
  "win": { supported: true, detail: "Win when collected count reaches a target" },
  "movement": { supported: true, detail: "Discrete movement by integer deltas" },
  "gravity": { supported: false, detail: "No acceleration or gravity physics yet" },
  "jumping": { supported: false, detail: "No jump mechanic yet" },
  "platforms": { supported: false, detail: "No solid platform collision yet" },
  "3d": { supported: false, detail: "No 3D rendering yet" }
} as const;
export function checkCapability(name: string) {
  const key = name.trim().toLowerCase() as keyof typeof capabilities;
  const entry = capabilities[key];
  return entry ? { name: key, ...entry, languageVersion: "0.1.0" } : { name: key, supported: false, detail: "Unknown capability; requires review", languageVersion: "0.1.0" };
}
