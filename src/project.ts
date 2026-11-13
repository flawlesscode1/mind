import { readFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { requireVersion } from "./release.js";

export async function projectVersion(sourcePath: string): Promise<string> {
  let folder = dirname(resolve(sourcePath));
  while (true) {
    try {
      const text = await readFile(resolve(folder, "mind.json"), "utf8");
      if (Buffer.byteLength(text) > 4096) throw new Error("mind.json exceeds 4096 bytes");
      const config = JSON.parse(text);
      if (!config || typeof config !== "object" || typeof config.languageVersion !== "string") throw new Error("mind.json requires languageVersion");
      return requireVersion(config.languageVersion);
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code !== "ENOENT") throw error;
    }
    const parent = dirname(folder);
    if (parent === folder) return requireVersion();
    folder = parent;
  }
}
