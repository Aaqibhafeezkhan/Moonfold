// @effect-diagnostics nodeBuiltinImport:off globalConsole:off globalTimers:off globalDate:off - A maintainer measurement script.
/**
 * Starts the built server (apps/server/dist/bin.mjs) on a fresh home directory, reports the time
 * until it listens, then samples its CPU and resident memory while idle. Stops only the process it
 * started.
 *
 *   node scripts/measure-server-idle.ts [idle-seconds]
 */
import * as NodeChildProcess from "node:child_process";
import * as NodeFS from "node:fs";
import * as NodeOS from "node:os";
import * as NodePath from "node:path";
import * as NodeURL from "node:url";

const root = NodePath.resolve(NodePath.dirname(NodeURL.fileURLToPath(import.meta.url)), "..");
const idleSeconds = Number(process.argv[2] ?? 60);
const home =
  process.env.MEASURE_HOME ??
  NodeFS.mkdtempSync(NodePath.join(NodeOS.tmpdir(), "moonfold-measure-"));
const port = 13900 + Math.floor(Math.random() * 90);

const started = performance.now();
const child = NodeChildProcess.spawn(
  process.execPath,
  [
    NodePath.join(root, "apps/server/dist/bin.mjs"),
    "serve",
    "--base-dir",
    home,
    "--port",
    String(port),
    "--no-browser",
  ],
  {
    cwd: home,
    stdio: ["ignore", "pipe", "pipe"],
    env: { ...process.env, MOONFOLD_TELEMETRY: "0" },
  },
);

const stop = () => {
  if (child.exitCode === null) child.kill();
};
process.on("exit", stop);

const listening = new Promise<number>((resolve, reject) => {
  const onData = (chunk: Buffer) => {
    if (/Listening on/.test(chunk.toString())) resolve(performance.now() - started);
  };
  child.stdout.on("data", onData);
  child.stderr.on("data", onData);
  child.on("exit", (code) => reject(new Error(`server exited with ${code} before listening`)));
  setTimeout(() => reject(new Error("server did not listen within 60 s")), 60_000);
});

/** CPU seconds and RSS of one process, read through the OS (Windows: PowerShell; else ps). */
const sample = (): { cpuSeconds: number; rssMb: number } => {
  if (process.platform === "win32") {
    const out = NodeChildProcess.execFileSync(
      "powershell.exe",
      [
        "-NoProfile",
        "-Command",
        `$p = Get-Process -Id ${child.pid}; "$($p.CPU) $($p.WorkingSet64)"`,
      ],
      { encoding: "utf8" },
    ).trim();
    const [cpu, rss] = out.split(/\s+/).map(Number);
    return { cpuSeconds: cpu ?? 0, rssMb: (rss ?? 0) / 1024 / 1024 };
  }
  const out = NodeChildProcess.execFileSync("ps", ["-o", "time=,rss=", "-p", String(child.pid)], {
    encoding: "utf8",
  }).trim();
  const [time, rss] = out.split(/\s+/);
  const parts = (time ?? "0:0").split(":").map(Number);
  const cpuSeconds = parts.reduce((total, part) => total * 60 + part, 0);
  return { cpuSeconds, rssMb: Number(rss ?? 0) / 1024 };
};

try {
  const toListen = await listening;
  // Let startup work (migrations, provider probes) settle before measuring idle.
  await new Promise((resolve) => setTimeout(resolve, 15_000));
  const before = sample();
  await new Promise((resolve) => setTimeout(resolve, idleSeconds * 1000));
  const after = sample();
  const idleCpuPercent = ((after.cpuSeconds - before.cpuSeconds) / idleSeconds) * 100;
  console.log(
    JSON.stringify(
      {
        listenMs: Math.round(toListen),
        idleSeconds,
        idleCpuPercentOfOneCore: Number(idleCpuPercent.toFixed(2)),
        rssMb: Math.round(after.rssMb),
        platform: `${process.platform}-${process.arch}`,
        node: process.version,
      },
      null,
      2,
    ),
  );
} finally {
  stop();
}
