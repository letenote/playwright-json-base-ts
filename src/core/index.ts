import { chromium, firefox, webkit, Browser, Page } from "playwright";
import { promises as fs } from "fs";
import { ReportStepResult, Scenario, Report } from "./core.interface";
import { DateTime } from "./helpers/dateTime";
import { actions } from "./actions";
import path from "path";
import { validatePartialJson } from "./helpers/validatePartialJson";

export async function core(
  scenarioFilePath: string,
  scenarioGroup: string = "root",
  headless: boolean = true,
  defaultBrowser:
    | "firefox"
    | "webkit"
    | "chromium"
    | "google_chrome" = "chromium",
  devtools: boolean = false,
  autoClose: boolean = true
): Promise<Report | null> {
  const runStartTime = new Date();
  const startTimeMs = runStartTime.getTime();
  let scenario: Scenario;

  try {
    const data = await fs.readFile(scenarioFilePath, "utf8");
    scenario = JSON.parse(data);
  } catch (error: any) {
    if (error.code === "ENOENT") {
      console.error(
        `Error: File skenario '${scenarioFilePath}' tidak ditemukan.`
      );
    } else if (error instanceof SyntaxError) {
      console.error(
        `Error: Gagal mengurai file JSON '${scenarioFilePath}'. Pastikan formatnya benar:`,
        error.message
      );
    } else {
      console.error(
        `Terjadi kesalahan saat membaca file skenario: ${error.message}`
      );
    }
    return null;
  }

  const browserType: Scenario["browser"] = defaultBrowser;
  // const headless: boolean = scenario.headless !== undefined ? scenario.headless : true;

  let browser: Browser | null = null;
  const reportResults: ReportStepResult[] = [];
  let passedCount = 0;
  let failedCount = 0;

  try {
    switch (browserType) {
      case "firefox":
        browser = await firefox.launch({ headless });
        break;
      case "webkit":
        browser = await webkit.launch({ headless });
        break;
      case "google_chrome":
        browser = await chromium.launch({ headless, channel: "chrome" });
        break;
      case "chromium":
      default:
        browser = await chromium.launch({ headless, devtools });
    }
  } catch (error: any) {
    console.error(
      `Gagal meluncurkan browser ${browserType} untuk skenario ${scenarioFilePath}: ${error.message}`
    );
    reportResults.push({
      description: "Gagal meluncurkan browser",
      action: "Launch Browser",
      status: "FAILURE",
      message: `Gagal meluncurkan browser ${browserType}: ${error.message}`,
      durationMs: 0,
    });
    failedCount++;
    const executionTimeMs = Date.now() - startTimeMs;
    return {
      timestamp: runStartTime.toISOString(),
      scenarioFile: scenarioFilePath,
      browserUsed: browserType,
      headlessMode: headless,
      totalSteps: scenario.steps?.length || 0,
      passedSteps: passedCount,
      failedSteps: failedCount,
      executionTimeMs: executionTimeMs,
      steps: reportResults,
      scenarioGroup: scenarioGroup,
    };
  }

  const page: Page = await browser.newPage();
  console.info("===== ✨ SCENARIO:TEST ✨ =====");
  console.info(`path: ${scenarioFilePath}`);
  console.info(`date: ${DateTime.format(new Date())}`);
  console.info("===== ✨ ACTION ✨ =======");

  for (const [stepIndex, step] of scenario.steps.entries() || []) {
    const stepStartTime = Date.now();
    const {
      action,
      value,
      selector,
      description = action,
      urlPattern,
      responseFileName,
      expectedJson,
    } = step;

    // console.info(`✅ ${stepIndex + 1}. ${action}: ${description}`);
    await actions({
      page,
      step,
      scenarioFilePath,
      stepStartTime,
      finallyCB: ({
        stepStatus,
        stepMessage,
        screenshotPathForReport,
        stepDuration,
      }) => {
        const isSuccess = stepStatus === "SUCCESS";
        console.info(
          `${isSuccess ? "✅" : "❌"} ${
            stepIndex + 1
          }. ${action}: ${description}`
        );
        reportResults.push({
          description: description,
          action: action,
          status: stepStatus,
          message: stepMessage,
          screenshotPath: screenshotPathForReport,
          durationMs: stepDuration,
          urlPattern: urlPattern,
          selector: selector,
          value: value,
        });
        if (isSuccess) {
          passedCount++;
        } else {
          failedCount++;
        }
      },
    });
  }

  if (browser && autoClose) {
    await browser.close();
  }

  const executionTimeMs = Date.now() - startTimeMs;
  console.info(
    `✅ ${scenario.steps.length + 1}. done: ${executionTimeMs}ms` + "\n"
  );
  return {
    timestamp: runStartTime.toISOString(),
    scenarioFile: scenarioFilePath,
    browserUsed: browserType,
    headlessMode: headless,
    totalSteps: scenario.steps?.length || 0,
    passedSteps: passedCount,
    failedSteps: failedCount,
    executionTimeMs: executionTimeMs,
    steps: reportResults,
    scenarioGroup: scenarioGroup,
    scenarioName: scenario.name || "please define scenario name",
  };
}
