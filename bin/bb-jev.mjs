#!/usr/bin/env node
/**
 * bb-jev: bb-browser observation/execution + Jev Choice (primary) + legacy fallback.
 * Does not vendor bb-browser; calls `bb-browser` on PATH or BB_BROWSER_BIN.
 */
import { spawnSync } from "node:child_process";
import { readFileSync, existsSync } from "node:fs";
import { pathToFileURL } from "node:url";

const BB = process.env.BB_BROWSER_BIN || "bb-browser";
const API = process.env.TYPESAFE_API_URL || "https://api.typesafe.ai/v1/systemone";
function loadTypesafeKey() {
  if (process.env.TYPESAFE_API_KEY) return process.env.TYPESAFE_API_KEY;
  // Global local default: macOS Keychain service "typesafe", account = $USER
  const account = process.env.USER || process.env.LOGNAME || "";
  const r = spawnSync(
    "security",
    ["find-generic-password", "-a", account, "-s", "typesafe", "-w"],
    { encoding: "utf8" },
  );
  if (r.status === 0 && r.stdout) return r.stdout.trim();
  return "";
}
const KEY = loadTypesafeKey();
const CONF_FALLBACK = Number(process.env.BB_JEV_MIN_CONF || "0.45");

function sh(cmd, args, opts = {}) {
  const r = spawnSync(cmd, args, { encoding: "utf8", ...opts });
  return r;
}

function bb(args) {
  const r = sh(BB, args);
  if (r.error) throw r.error;
  return { code: r.status ?? 1, out: (r.stdout || "") + (r.stderr || "") };
}

async function jevChoose({ goal, candidates }) {
  if (!KEY) return { ok: false, reason: "no_TYPESAFE_API_KEY" };
  if (!candidates.length) return { ok: false, reason: "no_candidates" };
  const state = `Goal: ${goal}\nCandidates:\n` + candidates.map((c, i) => `${i}. ${c.label}`).join("\n");
  const body = {
    model: "jev-latest",
    state,
    questions: [
      {
        id: "pick",
        type: "choice",
        options: candidates.map((c, i) => ({ id: String(i), label: c.label })),
      },
      { id: "confident", type: "noul", prompt: "Is the chosen candidate clearly the best next step toward the goal?" },
    ],
  };
  const res = await fetch(API, {
    method: "POST",
    headers: { Authorization: `Bearer ${KEY}`, "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!res.ok) return { ok: false, reason: `http_${res.status}`, detail: await res.text() };
  const data = await res.json();
  // Best-effort parse across SDK shapes
  const answers = data.answers || data.results || data.questions || [];
  let pickIdx = 0;
  let conf = 0;
  for (const a of answers) {
    if ((a.id === "pick" || a.type === "choice") && (a.choice != null || a.selected != null || a.argmax != null)) {
      pickIdx = Number(a.choice ?? a.selected ?? a.argmax ?? 0);
      conf = Number(a.probability ?? a.confidence ?? a.max_prob ?? 0);
    }
    if (a.id === "confident" || a.type === "noul") {
      conf = Math.max(conf, Number(a.probability ?? a.p_yes ?? 0));
    }
  }
  if (!Number.isFinite(pickIdx) || pickIdx < 0 || pickIdx >= candidates.length) {
    return { ok: false, reason: "bad_pick", data };
  }
  return { ok: true, index: pickIdx, conf, data };
}

function parseInteractiveRefs(snapText) {
  // Very loose parser: lines like [e12] button "Submit"
  const out = [];
  for (const line of snapText.split(/\r?\n/)) {
    const m = line.match(/\[(e?\d+)\]\s*(.+)$/i) || line.match(/\bref[=:]?\s*([A-Za-z0-9_-]+)\b.*?(.+)$/i);
    if (!m) continue;
    const ref = m[1];
    const label = m[2].trim().slice(0, 160);
    if (!label) continue;
    out.push({ ref, label: `${ref}: ${label}` });
  }
  return out.slice(0, 80);
}

function legacyPick(candidates, goal) {
  // Fallback: keyword overlap with goal; else first
  const g = goal.toLowerCase();
  let best = 0, score = -1;
  candidates.forEach((c, i) => {
    const words = c.label.toLowerCase().split(/\W+/).filter(Boolean);
    const s = words.reduce((n, w) => n + (g.includes(w) ? 1 : 0), 0);
    if (s > score) { score = s; best = i; }
  });
  return { index: best, conf: 0, reason: "legacy_keyword_overlap" };
}

async function main() {
  const [cmd, ...rest] = process.argv.slice(2);
  if (!cmd || cmd === "help" || cmd === "--help") {
    console.log(`bb-jev — bb-browser + Jev Choice

Usage:
  bb-jev doctor
  bb-jev snap [--tab <id>]          # snapshot via bb-browser
  bb-jev step "<goal>" [--tab <id>] # Jev picks ref then bb-browser click; fallback if needed

Env:
  TYPESAFE_API_KEY   required for Jev primary path
  BB_BROWSER_BIN     default: bb-browser
  BB_JEV_MIN_CONF    default: 0.45 (below → fallback)
`);
    process.exit(0);
  }

  if (cmd === "doctor") {
    const which = sh("bash", ["-lc", `command -v ${BB} || true`]);
    console.log("bb-browser:", (which.stdout || "").trim() || "NOT FOUND");
    console.log("TYPESAFE_API_KEY:", KEY ? "set (env or Keychain service=typesafe)" : "MISSING — run scripts/store-typesafe-key-keychain.sh");
    process.exit(0);
  }

  if (cmd === "snap") {
    const r = bb(["snap", "-i", ...rest]);
    process.stdout.write(r.out);
    process.exit(r.code);
  }

  if (cmd === "step") {
    const goal = rest.find((a) => !a.startsWith("--")) || "";
    if (!goal) {
      console.error("need goal string");
      process.exit(2);
    }
    const tabArgs = [];
    const ti = rest.indexOf("--tab");
    if (ti >= 0 && rest[ti + 1]) tabArgs.push("--tab", rest[ti + 1]);

    const snap = bb(["snap", "-i", ...tabArgs]);
    if (snap.code !== 0) {
      console.error("bb-browser snap failed:\n" + snap.out);
      process.exit(snap.code);
    }
    const candidates = parseInteractiveRefs(snap.out);
    if (!candidates.length) {
      console.error("no interactive refs parsed from snapshot; dump follows\n" + snap.out.slice(0, 4000));
      process.exit(3);
    }

    let decision = await jevChoose({ goal, candidates });
    let mode = "jev";
    if (!decision.ok || (decision.conf != null && decision.conf < CONF_FALLBACK)) {
      const fb = legacyPick(candidates, goal);
      decision = { ok: true, index: fb.index, conf: fb.conf, reason: decision.reason || fb.reason };
      mode = "fallback";
    }
    const chosen = candidates[decision.index];
    console.log(JSON.stringify({ mode, conf: decision.conf, reason: decision.reason || null, chosen }, null, 2));

    // Default action: click chosen ref (bb-browser click semantics may vary by version)
    const click = bb(["click", chosen.ref, ...tabArgs]);
    process.stdout.write(click.out);
    process.exit(click.code);
  }

  console.error("unknown command", cmd);
  process.exit(2);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
