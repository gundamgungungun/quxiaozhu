import { existsSync } from "node:fs";
import { spawn } from "node:child_process";
import { fileURLToPath } from "node:url";

const cli = new URL("../node_modules/wrangler/bin/wrangler.js", import.meta.url);
const localVars = fileURLToPath(new URL("../.dev.vars", import.meta.url));
// Wrangler otherwise looks next to dist/server/wrangler.json, unlike Vite dev.
// Resolve from this script so both commands read the same checkout-local file.
const args = [fileURLToPath(cli), "dev",
  "--config", "dist/server/wrangler.json", "--local", "--persist-to", ".wrangler/state",
  "--ip", "127.0.0.1", "--inspector-port", "0",
  ...(existsSync(localVars) ? ["--env-file", localVars] : []),
  ...process.argv.slice(2),
];
const child = spawn(process.execPath, args, { stdio: "inherit" });
for (const signal of ["SIGINT", "SIGTERM"]) process.once(signal, () => child.kill(signal));
child.once("error", (error) => { console.error(error.message); process.exitCode = 1; });
child.once("exit", (code, signal) => { process.exitCode = code ?? (signal === "SIGINT" ? 130 : 1); });
