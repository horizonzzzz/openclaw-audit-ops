import { cp, mkdir, readdir } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const packageRoot = path.resolve(__dirname, "..");
const standaloneRoot = path.join(packageRoot, ".next", "standalone");
const staticRoot = path.join(packageRoot, ".next", "static");

async function findServerDirectories(startDir) {
  const entries = await readdir(startDir, { withFileTypes: true });
  const matches = [];

  for (const entry of entries) {
    const fullPath = path.join(startDir, entry.name);
    if (entry.isDirectory() && entry.name === "node_modules") {
      continue;
    }
    if (entry.isFile() && entry.name === "server.js") {
      matches.push(path.dirname(fullPath));
      continue;
    }
    if (entry.isDirectory()) {
      matches.push(...(await findServerDirectories(fullPath)));
    }
  }

  return matches;
}

const preferredServerDirectory = path.join(standaloneRoot, "apps", "admin");
const serverDirectories = await findServerDirectories(standaloneRoot);

for (const serverDirectory of serverDirectories.length > 0 ? serverDirectories : [preferredServerDirectory]) {
  const targetStaticDir = path.join(serverDirectory, ".next", "static");
  await mkdir(path.dirname(targetStaticDir), { recursive: true });
  await cp(staticRoot, targetStaticDir, { recursive: true, force: true });
}
