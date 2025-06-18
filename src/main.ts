import path from "path";
import { findScenarioFiles } from "./core/helpers/findScenarioFiles";
import { generateIndividualReport } from "./core/actions/handlers/generateIndividualReport";
import { updateReportIndex } from "./core/actions/handlers/updateReportIndex";
import { core } from "./core";
import { Report } from "./core/core.interface";

export async function main({
  rootFolder = "",
  devPath = "",
  config: {
    headless = true,
    defaultBrowser = "chromium",
    devtools = false,
    autoClose = false,
  } = {},
}: {
  rootFolder: string;
  devPath: string;
  config: {
    headless?: boolean;
    defaultBrowser?: "firefox" | "webkit" | "chromium";
    devtools?: boolean;
    autoClose?: boolean;
  };
}): Promise<void> {
  const allReports: Report[] = [];
  const getbuildDir = "./dist/";
  const getRootDir = `${getbuildDir}${rootFolder}`;
  const getDevDir = `${getbuildDir}${devPath}`;
  const scenarioFiles = await findScenarioFiles(getRootDir, getDevDir);

  console.info("===== 🔥🔥 START:ALL:SCENARIO:TEST 🔥🔥 =====");
  console.info(`browser: ${defaultBrowser}`);
  console.info(`headless: ${headless}`);
  console.info(`file: ${scenarioFiles.length} scenario`);
  console.info(`dir: ${getRootDir}`, "\n");

  for await (const scenarioFile of scenarioFiles) {
    const relativePath = path.relative(getRootDir, scenarioFile);
    const scenarioDir = path.dirname(relativePath);
    const scenarioGroup =
      scenarioDir === "" ? "root" : scenarioDir.replace(/\\/g, "/");

    const report = await core(
      scenarioFile,
      scenarioGroup,
      headless,
      defaultBrowser,
      devtools,
      autoClose
    );
    if (report) {
      allReports.push(report);
      await generateIndividualReport(report);
    }
  }

  await updateReportIndex(allReports);
}
