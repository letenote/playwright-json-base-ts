import path from "path";
import { promises as fs } from "fs";
import { isDevMode } from "./isDevMode";
export async function findScenarioFiles(
  currentPath: string,
  devPath: string
): Promise<string[]> {
  let scenarioFiles: string[] = [];
  const getpath = isDevMode() ? devPath : currentPath;
  if (getpath.includes(".json")) {
    return [getpath];
  }

  const entries = await fs.readdir(getpath, { withFileTypes: true });
  for (const entry of entries) {
    const fullPath = path.join(getpath, entry.name);
    if (entry.isDirectory()) {
      if (
        entry.name === "node_modules" ||
        entry.name === "reports" ||
        entry.name === "screenshots" ||
        entry.name === "dist" ||
        entry.name.startsWith(".")
      ) {
        continue;
      }
      scenarioFiles = scenarioFiles.concat(
        await findScenarioFiles(fullPath, devPath)
      );
    } else if (entry.isFile() && entry.name.endsWith(".json")) {
      if (entry.name === "reports_index.json") {
        continue;
      }
      scenarioFiles.push(fullPath);
    }
  }
  return scenarioFiles;
}
