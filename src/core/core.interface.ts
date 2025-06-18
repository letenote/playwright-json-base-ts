export interface Step {
  action:
    | "goto"
    | "fill"
    | "fillByLabel"
    | "fillByPlaceholder"
    | "click"
    | "clickById"
    | "buttonClick"
    | "press"
    | "waitForSelector"
    | "screenshot"
    | "expectText"
    | "waitForRequest"
    | "waitForResponse"
    | "mockResponse";
  selector?: string;
  value?: string;
  urlPattern?: string | string[];
  description?: string;
  responseFileName?: string;
  expectedJson?: object;
  requests?: Array<{
    url: string;
    status: number;
    contentType: string;
    body: any;
  }>;
}

export interface Scenario {
  name?: string;
  browser?: "chromium" | "firefox" | "webkit" | "google_chrome";
  headless?: boolean;
  steps: Step[];
}

export interface ReportStepResult {
  description: string;
  action: string;
  status: "SUCCESS" | "FAILURE";
  message: string;
  screenshotPath?: string;
  durationMs: number;
  urlPattern?: string | string[];
  selector?: string;
  value?: string;
}

export interface Report {
  timestamp: string;
  scenarioFile: string;
  browserUsed: string;
  headlessMode: boolean;
  totalSteps: number;
  passedSteps: number;
  failedSteps: number;
  executionTimeMs: number;
  steps: ReportStepResult[];
  scenarioGroup?: string;
  scenarioName?: string;
}

export interface IndexReportEntry {
  timestamp: string;
  reportFileName: string;
  scenarioFile: string;
  browserUsed: string;
  totalSteps: number;
  passedSteps: number;
  failedSteps: number;
  status: "PASSED" | "FAILED" | "MIXED";
  executionTimeFormatted: string;
  scenarioGroup?: string;
  scenarioName?: string;
}
