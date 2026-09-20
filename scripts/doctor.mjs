import { spawnSync } from "node:child_process";
const r = spawnSync(process.execPath, [new URL("../bin/bb-jev.mjs", import.meta.url).pathname, "doctor"], { stdio: "inherit" });
process.exit(r.status ?? 1);
