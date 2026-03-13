import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

export type AdminTarget = {
  configPath: string;
  stateDir: string;
};

const DATA_DIR = path.join(process.cwd(), "data");
const TARGET_PATH = path.join(DATA_DIR, "target.json");

export async function readTarget(): Promise<AdminTarget | null> {
  try {
    return JSON.parse(await readFile(TARGET_PATH, "utf8")) as AdminTarget;
  } catch {
    return null;
  }
}

export async function writeTarget(target: AdminTarget): Promise<void> {
  await mkdir(DATA_DIR, { recursive: true });
  await writeFile(TARGET_PATH, `${JSON.stringify(target, null, 2)}\n`, "utf8");
}
