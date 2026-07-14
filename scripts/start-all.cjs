#!/usr/bin/env node

const fs = require("node:fs");
const path = require("node:path");
const { spawn, spawnSync } = require("node:child_process");

const root = path.resolve(__dirname, "..");
const isWindows = process.platform === "win32";
const npmCmd = "npm";
const dockerCmd = process.platform === "win32" ? "docker.exe" : "docker";
const args = new Set(process.argv.slice(2));

const options = {
  seed: args.has("--seed") || args.has("--fresh-seed"),
  skipDocker: args.has("--skip-docker"),
  skipInstall: args.has("--skip-install")
};

if (args.has("--help") || args.has("-h")) {
  console.log(`
Usage:
  npm run start:all
  npm run start:all -- --seed

Options:
  --seed          Reset and seed demo data before starting.
  --fresh-seed    Alias for --seed.
  --skip-docker   Do not start the local PostgreSQL Docker container.
  --skip-install  Do not run npm install when node_modules is missing.
`);
  process.exit(0);
}

function run(label, command, commandArgs, commandOptions = {}) {
  console.log(`\n> ${label}`);
  const result = spawnSync(command, commandArgs, spawnOptions(commandOptions));

  if (result.error) {
    console.error(`\nFailed to run ${command}: ${result.error.message}`);
    process.exit(1);
  }

  if (result.status !== 0) {
    process.exit(result.status ?? 1);
  }
}

function runNpm(label, commandArgs) {
  console.log(`\n> ${label}`);
  const result = isWindows
    ? spawnSync(commandLine(npmCmd, commandArgs), spawnOptions({ shellOnWindows: true }))
    : spawnSync(npmCmd, commandArgs, spawnOptions());

  if (result.error) {
    console.error(`\nFailed to run npm: ${result.error.message}`);
    process.exit(1);
  }

  if (result.status !== 0) {
    process.exit(result.status ?? 1);
  }
}

function spawnNpm(commandArgs) {
  return isWindows
    ? spawn(commandLine(npmCmd, commandArgs), spawnOptions({ shellOnWindows: true }))
    : spawn(npmCmd, commandArgs, spawnOptions());
}

function spawnOptions(commandOptions = {}) {
  const { shellOnWindows, ...rest } = commandOptions;
  const base = {
    cwd: root,
    stdio: "inherit",
    env: process.env,
    ...rest
  };

  if (shellOnWindows && isWindows) {
    base.shell = true;
  }

  return base;
}

function commandLine(command, commandArgs) {
  return [command, ...commandArgs.map(quoteShellArg)].join(" ");
}

function quoteShellArg(value) {
  return `"${String(value).replace(/"/g, '\\"')}"`;
}

function tryRun(command, commandArgs) {
  return spawnSync(command, commandArgs, {
    cwd: root,
    stdio: "ignore",
    env: process.env
  }).status === 0;
}

function sleep(milliseconds) {
  Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, milliseconds);
}

function ensureEnvFile() {
  const envPath = path.join(root, ".env");
  const envExamplePath = path.join(root, ".env.example");

  if (!fs.existsSync(envPath) && fs.existsSync(envExamplePath)) {
    fs.copyFileSync(envExamplePath, envPath);
    console.log("Created .env from .env.example");
  }
}

function waitForPostgres() {
  console.log("\n> Waiting for PostgreSQL");

  for (let attempt = 1; attempt <= 45; attempt += 1) {
    const result = spawnSync(dockerCmd, ["inspect", "-f", "{{.State.Health.Status}}", "expenseflow-postgres"], {
      cwd: root,
      encoding: "utf8",
      env: process.env
    });

    if (result.status === 0 && result.stdout.trim() === "healthy") {
      console.log("PostgreSQL is healthy.");
      return;
    }

    process.stdout.write(".");
    sleep(1000);
  }

  console.warn("\nPostgreSQL did not report healthy yet. Continuing anyway; migrations will fail if it is unavailable.");
}

ensureEnvFile();

if (!options.skipInstall && !fs.existsSync(path.join(root, "node_modules"))) {
  runNpm("Installing dependencies", ["install"]);
}

if (!options.skipDocker) {
  if (!tryRun(dockerCmd, ["--version"])) {
    console.error("\nDocker was not found. Install Docker Desktop, start it, or rerun with --skip-docker if PostgreSQL is already running.");
    process.exit(1);
  }

  run("Starting PostgreSQL container", dockerCmd, ["compose", "up", "-d"]);
  waitForPostgres();
}

runNpm("Running database migrations", ["--workspace", "apps/api", "run", "db:migrate", "--", "--name", "init"]);

if (options.seed) {
  runNpm("Seeding demo data", ["run", "db:seed"]);
} else {
  console.log("\n> Skipping demo seed");
  console.log("  Use npm run start:all -- --seed to reset and seed demo users.");
}

console.log("\n> Starting API and web app");
console.log("  Frontend: http://localhost:3000");
console.log("  API:      http://localhost:4000");

const dev = spawnNpm([
  "exec",
  "concurrently",
  "--",
  "-n",
  "api,web",
  "-c",
  "cyan,green",
  "npm --workspace apps/api run dev",
  "npm --workspace apps/web run dev"
]);

function stopDev(signal) {
  dev.kill(signal);
}

process.on("SIGINT", stopDev);
process.on("SIGTERM", stopDev);

dev.on("error", (error) => {
  console.error(`Failed to start dev servers: ${error.message}`);
  process.exit(1);
});

dev.on("exit", (code) => {
  process.exit(code ?? 0);
});
