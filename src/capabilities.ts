import { release } from "./release.js";
export const capabilities = release.capabilities;
export function checkCapability(name: string) {
  const key = name.trim().toLowerCase() as keyof typeof capabilities;
  const entry = Object.hasOwn(capabilities, key) ? capabilities[key] : undefined;
  return entry ? { name: key, ...entry, languageVersion: release.languageVersion } : { name: key, supported: false, detail: "Unknown capability; requires review", languageVersion: release.languageVersion };
}
