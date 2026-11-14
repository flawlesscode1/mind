// Authoritative manifest for the released v0.1 language core. This revision is
// the immutable stabilized implementation, not the version of the MCP package.
export const release = {
  schemaVersion: 1,
  languageVersion: "0.1.0",
  implementationRevision: "adcf27aa52af1d39031c2591307150774f007446",
  compatibility: { supportedVersions: ["0.1.0"], unpinned: "active", conformance: { file: "conformance/v0.1.json", sha256: "f4139ad1101e9e156b2d0d819a646b7175102d96f9f5fc5101c838dc1ab54e2e" }, node: [20, 22, 24] },
  runtime: { browserGrid: { width: 16, height: 12 } },
  capabilities: {
    player: { supported: true, detail: "One player with safe integer grid coordinates", fixtures: ["collect-once"] },
    collectible: { supported: true, detail: "Named collectibles collected at the destination", fixtures: ["collect-once"] },
    win: { supported: true, detail: "Win when collected count reaches the target", fixtures: ["collect-once"] },
    movement: { supported: true, detail: "Discrete movement by safe integer deltas", fixtures: ["collect-once", "negative-coordinates"] },
    gravity: { supported: false, detail: "No gravity semantics", fixtures: [] },
    jumping: { supported: false, detail: "No jump semantics", fixtures: [] },
    platforms: { supported: false, detail: "No platform collisions", fixtures: [] },
    "3d": { supported: false, detail: "No 3D rendering", fixtures: [] }
  }
} as const;

export function requireVersion(version: unknown = release.languageVersion): string {
  if (typeof version !== "string" || !(release.compatibility.supportedVersions as readonly string[]).includes(version)) {
    throw new Error(`Unsupported MIND language version ${JSON.stringify(version)}; supported: ${release.compatibility.supportedVersions.join(", ")}. Install a matching release or update mind.json.`);
  }
  return version;
}
