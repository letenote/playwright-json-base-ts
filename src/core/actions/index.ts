import { Page } from "playwright";
import { promises as fs } from "fs";
import path from "path";
import { Step } from "../core.interface";
import { validatePartialJson } from "../helpers/validatePartialJson";

export async function actions({
  page,
  step,
  scenarioFilePath,
  stepStartTime,
  finallyCB,
}: {
  page: Page;
  step: Step;
  scenarioFilePath: string;
  stepStartTime: number;
  finallyCB: (param: {
    stepStatus: "SUCCESS" | "FAILURE";
    stepMessage: string;
    screenshotPathForReport: string | undefined;
    stepDuration: number;
  }) => void;
}) {
  const {
    action,
    value,
    selector,
    description = action,
    urlPattern,
    responseFileName,
    expectedJson,
    requests,
  } = step;
  let stepStatus: "SUCCESS" | "FAILURE" = "FAILURE";
  let stepMessage: string = "";
  let screenshotPathForReport: string | undefined;
  let stepDuration = 0;

  try {
    switch (action) {
      case "goto":
        if (value) {
          await page.goto(value, { waitUntil: "domcontentloaded" });
          stepStatus = "SUCCESS";
          stepMessage = `Berhasil navigasi ke URL: ${value}`;
        } else {
          stepMessage = "Peringatan: URL tidak disediakan untuk aksi 'goto'.";
        }
        break;
      case "fill":
        if (selector && value !== undefined) {
          await page.fill(selector, value);
          stepStatus = "SUCCESS";
          stepMessage = `Berhasil mengisi '${value}' ke selector: ${selector}`;
        } else {
          stepMessage =
            "Peringatan: Selector atau nilai tidak disediakan untuk aksi 'fill'.";
        }
        break;
      case "fillByLabel":
        if (selector && value !== undefined) {
          await page.getByLabel(selector).fill(value);
          stepStatus = "SUCCESS";
          stepMessage = `Berhasil mengisi '${value}' ke selector: ${selector}`;
        } else {
          stepMessage =
            "Peringatan: Selector atau nilai tidak disediakan untuk aksi 'fill'.";
        }
        break;
      case "fillByPlaceholder":
        if (selector && value !== undefined) {
          await page.getByPlaceholder(selector).fill(value);
          stepStatus = "SUCCESS";
          stepMessage = `Berhasil mengisi '${value}' ke selector: ${selector}`;
        } else {
          stepMessage =
            "Peringatan: Selector atau nilai tidak disediakan untuk aksi 'fill'.";
        }
        break;
      case "clickById":
        if (selector) {
          await page.click(selector);
          stepStatus = "SUCCESS";
          stepMessage = `Berhasil mengklik selector: ${selector}`;
        } else {
          stepMessage =
            "Peringatan: Selector atau nilai tidak disediakan untuk aksi 'click'.";
        }
        break;
      case "buttonClick":
        if (selector) {
          // await page.click(selector);
          // await page.click(selector);
          // await page.click(selector);
          // await page.getByRole("button").click();
          // await page.getByText(selector).click();
          await page
            .getByRole("button", { name: selector, exact: true })
            .click();
          stepStatus = "SUCCESS";
          stepMessage = `Berhasil mengklik selector: ${selector}`;
        } else {
          stepMessage =
            "Peringatan: Selector tidak disediakan untuk aksi 'click'.";
        }
        break;
      case "press":
        if (selector && value) {
          await page.press(selector, value);
          stepStatus = "SUCCESS";
          stepMessage = `Berhasil menekan tombol '${value}' pada selector: ${selector}`;
        } else {
          stepMessage =
            "Peringatan: Selector atau nilai tombol tidak disediakan untuk aksi 'press'.";
        }
        break;
      case "waitForSelector":
        if (selector) {
          await page.waitForSelector(selector);
          stepStatus = "SUCCESS";
          stepMessage = `Berhasil menunggu selector: ${selector}`;
        } else {
          stepMessage =
            "Peringatan: Selector tidak disediakan untuk aksi 'waitForSelector'.";
        }
        break;
      case "screenshot":
        if (value) {
          const screenshotFilePath = scenarioFilePath
            .replace("./dist/scenarios", "screenshots")
            .replace("dist/scenarios", "screenshots")
            .split("/")
            .slice(0, -1)
            .join("/");
          const fullPath = `${screenshotFilePath}/${value}`;
          await new Promise((resolve) => setTimeout(resolve, 1000));
          await page.screenshot({ path: fullPath });
          stepStatus = "SUCCESS";
          stepMessage = `Screenshot berhasil disimpan ke: ${fullPath}`;
          screenshotPathForReport = fullPath;
        } else {
          stepMessage =
            "Peringatan: Path file tidak disediakan untuk aksi 'screenshot'.";
        }
        break;
      case "expectText":
        if (selector && value !== undefined) {
          const actualText = await page.textContent(selector);
          if (actualText && actualText.includes(value)) {
            stepStatus = "SUCCESS";
            stepMessage = `Verifikasi berhasil: Teks '${value}' ditemukan di '${selector}'. Teks aktual: '${actualText}'`;
          } else {
            stepMessage = `Verifikasi GAGAL: Teks '${value}' TIDAK ditemukan di '${selector}'. Teks aktual: '${actualText}'`;
          }
        } else {
          stepMessage =
            "Peringatan: Selector atau nilai teks tidak disediakan untuk aksi 'expectText'.";
        }
        break;
      case "waitForRequest":
        if (urlPattern) {
          const patterns = Array.isArray(urlPattern)
            ? urlPattern
            : [urlPattern];
          const promises = patterns.map((pattern) =>
            page.waitForRequest((request) => request.url().includes(pattern))
          );
          await Promise.all(promises);
          stepStatus = "SUCCESS";
          stepMessage = `Berhasil menunggu permintaan jaringan yang mengandung URL: '${patterns.join(
            "', '"
          )}'`;
        } else {
          stepMessage =
            "Peringatan: Pola URL tidak disediakan untuk aksi 'waitForRequest'.";
        }
        break;
      case "waitForResponse":
        if (urlPattern) {
          const patterns = Array.isArray(urlPattern)
            ? urlPattern
            : [urlPattern];

          const responsePromise = page.waitForResponse((response) => {
            return patterns.some((pattern) => response.url().includes(pattern));
          });
          const response = await responsePromise;

          stepStatus = "SUCCESS";
          stepMessage = `Berhasil menunggu respons jaringan yang mengandung URL: '${patterns.join(
            "', '"
          )}'.`;

          if (responseFileName) {
            let responseBody: any;
            try {
              responseBody = await response.json();

              // --- LOGIC BARU UNTUK FOLDER RESPONSE_DATA ---
              const baseResponseDataDir = "response_data";
              const projectRoot = path.resolve(__dirname, "..", "..");
              const relativeScenarioPathFromProjectRoot = path.relative(
                projectRoot,
                scenarioFilePath
              );

              const scenariosBaseName = "scenarios";
              const distFolderName = "dist";

              let folderForResponseData = "";
              if (
                relativeScenarioPathFromProjectRoot.includes(
                  path.join(distFolderName, scenariosBaseName)
                )
              ) {
                folderForResponseData = path.relative(
                  path.join(projectRoot, distFolderName, scenariosBaseName),
                  path.dirname(scenarioFilePath)
                );
              } else if (
                relativeScenarioPathFromProjectRoot.includes(scenariosBaseName)
              ) {
                folderForResponseData = path.relative(
                  path.join(projectRoot, scenariosBaseName),
                  path.dirname(scenarioFilePath)
                );
              }

              const responseDataSaveDir = path.join(
                baseResponseDataDir,
                folderForResponseData
              );
              await fs.mkdir(responseDataSaveDir, { recursive: true });

              const fullResponseFilePath = path.join(
                responseDataSaveDir,
                responseFileName
              );
              await fs.writeFile(
                fullResponseFilePath,
                JSON.stringify(responseBody, null, 2),
                "utf8"
              );

              stepMessage += ` Respons JSON berhasil diambil dan disimpan ke '${fullResponseFilePath}'.`;

              // Jika ada 'expectedJson', gas verifikasi parsial
              if (expectedJson) {
                const validationResult = validatePartialJson(
                  responseBody,
                  expectedJson
                );
                if (validationResult.isValid) {
                  stepMessage += ` Verifikasi JSON parsial berhasil.`;
                } else {
                  stepStatus = "FAILURE";
                  stepMessage += ` Verifikasi JSON parsial GAGAL: ${validationResult.message}`;
                }
              }
            } catch (jsonError: any) {
              stepStatus = "FAILURE";
              stepMessage += ` Gagal mengurai respons dari URL '${response.url()}' sebagai JSON atau menyimpannya: ${
                jsonError.message
              }.`;
              console.error(
                `Error processing JSON response for URL ${response.url()}:`,
                jsonError
              );
            }
          }
        } else {
          stepMessage =
            "Peringatan: Pola URL tidak disediakan untuk aksi 'waitForResponse'.";
        }
        break;
      case "mockResponse":
        if (requests) {
          const promises = requests.map((request) =>
            page.route(request.url, async (route) => {
              await route.fulfill({
                status: request.status,
                contentType: request.contentType,
                body: JSON.stringify(request.body),
              });
            })
          );
          await Promise.all(promises);
          stepStatus = "SUCCESS";
          stepMessage = `Berhasil mock response, ${requests.map(
            (request) => request.url
          )}`;
        }
        // await page.route(
        //   "https://www.instagram.com/api/v1/web/accounts/login/ajax/",
        //   async (route) => {
        //     // response
        //     // const response = await route.fetch();
        //     // let json = await response.json();
        //     // let json = [
        //     //   { name: "playwright by testers talk", id: 11 },
        //     //   { name: "cypress by testers talk", id: 12 },
        //     //   { name: "api testing by testers talk", id: 13 },
        //     //   { name: "postman by testers talk", id: 14 },
        //     //   { name: "rest assured by testers talk", id: 15 },
        //     // ];
        //     // console.log("DEuG:JSON", { json, response });
        //     // await route.fulfill({ response, json, });
        //     await route.fulfill({
        //       status: 200,
        //       contentType: "application/json",
        //       body: JSON.stringify({ message: selector }), // Ensure body is correctly set
        //     });
        //   }
        // );
        break;
      default:
        stepMessage = `Aksi tidak dikenal: ${action as string}`;
        break;
    }
  } catch (e: any) {
    stepMessage = `Terjadi error saat menjalankan aksi '${action}': ${e.message}`;
  } finally {
    stepDuration = Date.now() - stepStartTime;
    finallyCB &&
      finallyCB({
        stepStatus,
        stepMessage,
        screenshotPathForReport,
        stepDuration,
      });
  }
}
