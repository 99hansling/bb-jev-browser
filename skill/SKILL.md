---
name: bb-jev-browser
description: "Use when a browser task needs the user's real logged-in Chrome AND cheap closed-set next-step choice via TypeSafe Jev — bb-browser for identity/execution, Jev Choice primary, legacy ref heuristics as fallback. Triggers: bb-jev, logged-in Chrome + Jev, 真实登录态+Jev. Needs bb-browser on PATH and optional TYPESAFE_API_KEY. NOT a swap for bb-browser alone or Playwright-only jev-browser."
---

# bb-jev-browser

Repo: `https://github.com/99hansling/bb-jev-browser`  
Local: `~/Documents/bb-jev-browser`

## When

- Need **user's real login** (cookies / dashboards / X / Gmail-like) **and** many interactive steps.
- Want Jev to pick from a closed ref table; keep old snapshot→ref logic if Jev is down.

## Do not

- Do not point Playwright at the user's real Chrome profile.
- Do not delete `bb-browser` skill or harness fallbacks.
- Do not push this project into the private `my-skills` git remote workflow.

## Commands

```bash
~/Documents/bb-jev-browser/bin/bb-jev.mjs doctor
~/Documents/bb-jev-browser/bin/bb-jev.mjs step "goal text" --tab <id>
```

See `docs/INTEGRATION.md` for harness wiring.
