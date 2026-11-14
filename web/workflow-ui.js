import { inspectProgram, previewProgram, readHandoff, agentPrompt } from "./program-workflow.js";
const el = id => document.getElementById(id);
const source = el("draft-source"), version = el("draft-version"), capabilities = el("draft-capabilities");
const approve = el("approve-program"), review = el("program-review"), status = el("review-status"), execution = el("execution-status");
let activeSource = "", inspected;
const invalidate = () => { inspected = undefined; approve.disabled = true; status.textContent = "Changed since inspection. Inspect and validate again before running."; };
for (const field of [source, version, capabilities, el("request")]) field.addEventListener("input", () => {
  invalidate(); el("provenance").textContent = "Manual edit / pasted input. No model invoked by this page.";
});
el("prepare-prompt").addEventListener("click", () => {
  try { el("agent-prompt").value = agentPrompt(el("request").value); }
  catch (error) { status.textContent = error.message; }
});
function importHandoff(value) {
  const handoff = readHandoff(value);
  source.value = handoff.source; version.value = handoff.languageVersion;
  capabilities.value = handoff.requestedCapabilities.join(","); el("request").value = handoff.request;
  invalidate();
  el("provenance").textContent = `Imported declaration: ${handoff.provenance.kind}${handoff.provenance.agent ? " (" + handoff.provenance.agent + ")" : ""}. Identity is not verified; importing does not run the code.`;
}
el("import-handoff").addEventListener("click", () => {
  invalidate();
  try {
    if (el("handoff").value.length > 150000) throw new Error("Handoff exceeds 150000 characters");
    importHandoff(JSON.parse(el("handoff").value));
  } catch (error) { status.textContent = "Handoff error: " + error.message; }
});
el("load-sample").addEventListener("click", async () => {
  invalidate();
  try {
    const response = await fetch("./two-stars.handoff.json");
    if (!response.ok) throw new Error("Unable to load prepared example");
    importHandoff(await response.json());
    el("provenance").textContent = "Prepared Codex-authored example from development; this is replay, not live AI generation.";
  } catch (error) { status.textContent = error.message; }
});
el("inspect-program").addEventListener("click", () => {
  invalidate();
  try {
    const input = { source: source.value, beforeSource: activeSource, languageVersion: version.value, requestedCapabilities: capabilities.value.split(",").map(s => s.trim()).filter(Boolean) };
    const report = inspectProgram(input);
    const p = report.summary;
    const summary = p ? `Game: ${p.title}\nPlayer: ${p.player.name} at (${p.player.x}, ${p.player.y})\nCollectibles: ${p.collectibles.map(e => `${e.name} at (${e.x}, ${e.y})`).join("; ")}\nExpected victory: collect ${p.target}. Collection happens at each movement destination.\n` : "No executable program could be parsed.\n";
    review.textContent = summary + `\nLanguage version: ${report.languageVersion}\nSyntax/semantics: ${report.valid ? "valid" : "invalid"}\nDeclared capabilities: ${report.capabilities.map(c => c.name + ": " + (c.supported ? "supported" : "unavailable")).join("; ") || "none supplied (request intent is not inferred)"}\nBrowser runnable: ${report.canRunInBrowser}\n${report.errors.join("\n")}\n\n${report.changes.note}\n` + report.changes.removed.map(s => "- " + s).join("\n") + "\n" + report.changes.added.map(s => "+ " + s).join("\n") + (report.changes.truncated ? "\nChanges truncated; inspect full source." : "");
    status.textContent = report.canRunInBrowser ? "Valid for this browser. Inspect the source and changes, then approve if they match your intent." : "Cannot run this candidate. " + report.errors.join(" ");
    if (report.canRunInBrowser) { inspected = input; approve.disabled = false; }
    const preview = previewProgram(input);
    execution.textContent = "Read-only interpreter preview (not applied): " + JSON.stringify(preview);
  } catch (error) { status.textContent = "Inspection error: " + error.message; }
});
approve.addEventListener("click", () => {
  if (!inspected) return;
  // Recheck the current fields as well as input events: an old inspection must
  // never authorize a newer source/version/capability set.
  const expected = { source: source.value, beforeSource: activeSource, languageVersion: version.value, requestedCapabilities: capabilities.value.split(",").map(s => s.trim()).filter(Boolean) };
  if (JSON.stringify(expected) !== JSON.stringify(inspected)) { invalidate(); return; }
  const snapshot = inspected;
  invalidate();
  window.dispatchEvent(new CustomEvent("mind:run-reviewed", { detail: snapshot }));
});
window.addEventListener("mind:execution-result", event => {
  if (event.detail.ok) {
    activeSource = event.detail.source;
    status.textContent = "Your reviewed source is now running. Edit and inspect again for further changes.";
    execution.textContent = "Running through the MIND interpreter: " + JSON.stringify(event.detail.state);
  } else execution.textContent = "Execution error: " + event.detail.error;
});
try {
  const response = await fetch("./game.mind");
  if (!response.ok) throw new Error("Unable to load current source");
  activeSource = await response.text(); source.value = activeSource;
  const config = await fetch("./mind.json");
  if (!config.ok && config.status !== 404) throw new Error("Unable to load mind.json");
  if (config.ok) version.value = (await config.json()).languageVersion;
  el("agent-prompt").value = agentPrompt(el("request").value);
} catch (error) { status.textContent = "Workshop loading error: " + error.message; }
