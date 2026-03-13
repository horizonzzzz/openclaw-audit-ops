#!/usr/bin/env node

import { createServer } from "node:net";
import { randomBytes } from "node:crypto";
import { access, readdir } from "node:fs/promises";
import path from "node:path";
import process from "node:process";
import { spawn } from "node:child_process";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const packageRoot = path.resolve(__dirname, "..");

function printHelp() {
  process.stdout.write(`Audit Ops Admin

Usage:
  npx @horizonzzzz/audit-ops-admin [options]

Options:
  --host <host>           Bind host, default 127.0.0.1
  --port <port>           Preferred port, default 3210
  --password <password>   Login password; auto-generated when omitted
  --auth-secret <secret>  Session signing secret; auto-generated when omitted
  --open                  Open the dashboard in the default browser
  -h, --help              Show this help
`);
}

function parseArgs(argv) {
  const options = {
    host: "127.0.0.1",
    port: 3210,
    open: false,
    password: undefined,
    authSecret: undefined
  };

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];

    if (arg === "-h" || arg === "--help") {
      options.help = true;
      continue;
    }
    if (arg === "--open") {
      options.open = true;
      continue;
    }
    if (arg === "--host") {
      options.host = argv[index + 1] ?? options.host;
      index += 1;
      continue;
    }
    if (arg === "--port") {
      const parsed = Number(argv[index + 1]);
      if (!Number.isInteger(parsed) || parsed <= 0) {
        throw new Error("Invalid --port value");
      }
      options.port = parsed;
      index += 1;
      continue;
    }
    if (arg === "--password") {
      options.password = argv[index + 1];
      index += 1;
      continue;
    }
    if (arg === "--auth-secret") {
      options.authSecret = argv[index + 1];
      index += 1;
      continue;
    }

    throw new Error(`Unknown argument: ${arg}`);
  }

  return options;
}

function randomToken(size = 16) {
  return randomBytes(size).toString("hex");
}

async function isPortAvailable(host, port) {
  return new Promise((resolve) => {
    const server = createServer();
    server.once("error", () => resolve(false));
    server.once("listening", () => {
      server.close(() => resolve(true));
    });
    server.listen(port, host);
  });
}

async function findAvailablePort(host, preferredPort) {
  for (let offset = 0; offset < 20; offset += 1) {
    const port = preferredPort + offset;
    if (await isPortAvailable(host, port)) {
      return port;
    }
  }
  throw new Error(`No available port found near ${preferredPort}`);
}

async function findStandaloneServer(startDir) {
  const entries = await readdir(startDir, { withFileTypes: true });
  for (const entry of entries) {
    const fullPath = path.join(startDir, entry.name);
    if (entry.isDirectory() && entry.name === "node_modules") {
      continue;
    }
    if (entry.isFile() && entry.name === "server.js") {
      return fullPath;
    }
    if (entry.isDirectory()) {
      const nested = await findStandaloneServer(fullPath);
      if (nested) {
        return nested;
      }
    }
  }
  return null;
}

function openBrowser(url) {
  const platform = process.platform;
  if (platform === "win32") {
    spawn("cmd", ["/c", "start", "", url], { stdio: "ignore", detached: true });
    return;
  }
  if (platform === "darwin") {
    spawn("open", [url], { stdio: "ignore", detached: true });
    return;
  }
  spawn("xdg-open", [url], { stdio: "ignore", detached: true });
}

async function main() {
  const options = parseArgs(process.argv.slice(2));
  if (options.help) {
    printHelp();
    return;
  }

  const standaloneRoot = path.join(packageRoot, ".next", "standalone");
  const preferredServerPath = path.join(standaloneRoot, "apps", "admin", "server.js");
  let serverPath = preferredServerPath;

  try {
    await access(serverPath);
  } catch {
    serverPath = await findStandaloneServer(standaloneRoot);
  }

  if (!serverPath) {
    throw new Error("Standalone server not found. The package may be missing build artifacts.");
  }

  const port = await findAvailablePort(options.host, options.port);
  const password = options.password ?? process.env.ADMIN_PASSWORD ?? randomToken(6);
  const authSecret = options.authSecret ?? process.env.ADMIN_AUTH_SECRET ?? randomToken(16);
  const url = `http://${options.host}:${port}`;

  const child = spawn(process.execPath, [serverPath], {
    cwd: path.dirname(serverPath),
    stdio: "inherit",
    env: {
      ...process.env,
      HOSTNAME: options.host,
      PORT: String(port),
      ADMIN_PASSWORD: password,
      ADMIN_AUTH_SECRET: authSecret
    }
  });

  child.once("spawn", () => {
    process.stdout.write(`Audit Ops Admin running at ${url}\n`);
    process.stdout.write(`Using OpenClaw home: ~/.openclaw\n`);
    if (!process.env.ADMIN_PASSWORD && !options.password) {
      process.stdout.write(`Generated admin password: ${password}\n`);
    }
    if (options.open) {
      openBrowser(url);
    }
  });

  child.on("exit", (code, signal) => {
    if (signal) {
      process.kill(process.pid, signal);
      return;
    }
    process.exit(code ?? 0);
  });

  process.on("SIGINT", () => child.kill("SIGINT"));
  process.on("SIGTERM", () => child.kill("SIGTERM"));
}

main().catch((error) => {
  process.stderr.write(`${error instanceof Error ? error.message : String(error)}\n`);
  process.exit(1);
});
