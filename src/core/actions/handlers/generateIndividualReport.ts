import { promises as fs } from "fs";
import path from "path";
import { Report } from "../../core.interface";
import { formatDuration } from "../../helpers/formatDuration";

export async function generateIndividualReport(
  reportData: Report
): Promise<void> {
  const formattedTimestamp = new Date(reportData.timestamp).toLocaleString(
    "id-ID",
    {
      year: "numeric",
      month: "long",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
    }
  );

  const scenarioBaseName = path.basename(reportData.scenarioFile, ".json");
  const reportSubDir =
    reportData.scenarioGroup && reportData.scenarioGroup !== "root"
      ? reportData.scenarioGroup
      : "";
  const reportDir = path.join("reports", reportSubDir);
  await fs.mkdir(reportDir, { recursive: true });

  const reportFileName = `${scenarioBaseName}_${reportData.timestamp.replace(
    /:/g,
    "-"
  )}.html`;
  const reportPath = path.join(reportDir, reportFileName);

  let stepsHtml = "";
  for (const step of reportData.steps) {
    const statusClass = step.status === "SUCCESS" ? "success" : "failure";
    const screenshotHtml = step.screenshotPath
      ? `<div class="screenshot-container"><img src="${path
          .relative(reportDir, step.screenshotPath)
          .replace(
            /\\/g,
            "/"
          )}" alt="Screenshot Langkah" title="Klik untuk memperbesar"></div>`
      : "";

    let actionDetails = "";
    if (step.action === "waitForRequest" || step.action === "waitForResponse") {
      const patternsToDisplay = Array.isArray(step.urlPattern)
        ? step.urlPattern.join("', '")
        : step.urlPattern;
      actionDetails = `(Pola URL: <code>'${
        patternsToDisplay || "N/A"
      }'</code>)`;
    } else if (step.selector) {
      actionDetails = `(Selector: <code>${step.selector}</code>)`;
    }
    if (
      step.value !== undefined &&
      !["waitForRequest", "waitForResponse"].includes(step.action)
    ) {
      actionDetails += ` (Value: <code>${step.value}</code>)`;
    }

    stepsHtml += `
      <div class="step-item ${statusClass}">
        <div class="step-header">
          <span class="step-status-icon ${statusClass}"></span>
          <h3>${step.description}</h3>
          <span class="step-duration">${formatDuration(step.durationMs)}</span>
        </div>
        <div class="step-details">
          <p><strong>Action:</strong> <code>${
            step.action
          }</code> ${actionDetails}</p>
          <p class="step-message"><strong>Pesan:</strong> ${step.message}</p>
          ${screenshotHtml}
        </div>
      </div>
    `;
  }

  const htmlContent = `
    <!DOCTYPE html>
    <html lang="en">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Laporan Otomatisasi Playwright - ${path.basename(
          reportData.scenarioFile
        )}</title>
        <link href="https://fonts.googleapis.com/css2?family=Roboto:wght@400;700&display=swap" rel="stylesheet">
        <style>
            body { font-family: 'Roboto', Arial, sans-serif; margin: 0; background-color: #f0f2f5; color: #333; line-height: 1.6; }
            .container { max-width: 960px; margin: 30px auto; background-color: #ffffff; padding: 40px; border-radius: 10px; box-shadow: 0 4px 20px rgba(0,0,0,0.08); }
            h1 { color: #2c3e50; text-align: center; margin-bottom: 30px; font-size: 2.5em; font-weight: 700; }
            .summary { background-color: #e3f2fd; padding: 25px; border-radius: 8px; margin-bottom: 30px; display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 15px; border: 1px solid #bbdefb; }
            .summary p { margin: 0; font-size: 1.05em; color: #333; }
            .summary p strong { color: #2c3e50; }
            .summary .passed { color: #28a745; font-weight: 700; }
            .summary .failed { color: #dc3545; font-weight: 700; }
            .summary .total { color: #007bff; font-weight: 700; }
            
            h2 { color: #2c3e50; border-bottom: 2px solid #eee; padding-bottom: 10px; margin-top: 40px; margin-bottom: 25px; font-size: 1.8em; }

            .step-item {
                background-color: #ffffff;
                border: 1px solid #e0e0e0;
                border-left: 5px solid;
                border-radius: 8px;
                margin-bottom: 20px;
                box-shadow: 0 2px 8px rgba(0,0,0,0.05);
                transition: transform 0.2s ease-in-out;
            }
            .step-item:hover {
                transform: translateY(-3px);
            }
            .step-item.success { border-left-color: #28a745; }
            .step-item.failure { border-left-color: #dc3545; }

            .step-header {
                display: flex;
                align-items: center;
                padding: 15px 20px;
                background-color: #f8f8f8;
                border-bottom: 1px solid #e0e0e0;
                border-top-left-radius: 8px;
                border-top-right-radius: 8px;
            }
            .step-header h3 {
                margin: 0;
                font-size: 1.3em;
                flex-grow: 1;
                color: #2c3e50;
            }
            .step-status-icon {
                width: 15px;
                height: 15px;
                border-radius: 50%;
                margin-right: 15px;
                display: inline-block;
            }
            .step-status-icon.success { background-color: #28a745; }
            .step-status-icon.failure { background-color: #dc3545; }
            .step-duration {
                font-size: 0.95em;
                color: #666;
                font-weight: bold;
            }

            .step-details {
                padding: 20px;
            }
            .step-details p {
                margin-bottom: 8px;
                font-size: 0.95em;
            }
            .step-details p strong { color: #555; }
            .step-details code {
                background-color: #eceff1;
                padding: 3px 6px;
                border-radius: 4px;
                font-family: 'Consolas', 'Monaco', monospace;
                color: #c0392b;
            }
            .step-message {
                margin-top: 15px;
                padding: 10px;
                background-color: #fcfcfc;
                border: 1px dashed #e0e0e0;
                border-radius: 5px;
                font-style: italic;
                color: #4a4a4a;
            }
            .step-item.failure .step-message {
                background-color: #ffeaea;
                border-color: #dc3545;
                color: #dc3545;
            }

            .screenshot-container {
                margin-top: 20px;
                text-align: center;
                border: 1px solid #ddd;
                border-radius: 5px;
                overflow: hidden;
            }
            .screenshot-container img {
                max-width: 100%;
                height: auto;
                display: block;
                border-radius: 4px;
                cursor: zoom-in;
            }
            .screenshot-container img:hover {
                opacity: 0.9;
            }
            .lightbox {
                display: none;
                position: fixed;
                z-index: 999;
                padding-top: 100px;
                left: 0;
                top: 0;
                width: 100%;
                height: 100%;
                overflow: auto;
                background-color: rgba(0,0,0,0.9);
            }
            .lightbox-content {
                margin: auto;
                display: block;
                max-width: 80%;
                max-height: 80%;
            }
            .close {
                position: absolute;
                top: 15px;
                right: 35px;
                color: #f1f1f1;
                font-size: 40px;
                font-weight: bold;
                transition: 0.3s;
                cursor: pointer;
            }
            .close:hover,
            .close:focus {
                color: #bbb;
                text-decoration: none;
            }
        </style>
    </head>
    <body>
        <div class="container">
            <h1>Laporan Otomatisasi Playwright<br><small>${path.basename(
              reportData.scenarioFile
            )}</small></h1>
            <div class="summary">
                <p><strong>Waktu Eksekusi:</strong> ${formattedTimestamp}</p>
                <p><strong>Durasi Total:</strong> ${formatDuration(
                  reportData.executionTimeMs
                )}</p>
                <p><strong>Browser:</strong> ${reportData.browserUsed} (${
    reportData.headlessMode ? "Headless" : "UI"
  })</p>
                <p class="total"><strong>Total Langkah:</strong> ${
                  reportData.totalSteps
                }</p>
                <p class="passed"><strong>Berhasil:</strong> ${
                  reportData.passedSteps
                }</p>
                <p class="failed"><strong>Gagal:</strong> ${
                  reportData.failedSteps
                }</p>
                <p><strong>Grup Skenario:</strong> ${
                  reportData.scenarioGroup || "Tidak Dikelompokkan"
                }</p>
            </div>
            <h2>Detail Langkah</h2>
            <div class="steps-list">
                ${stepsHtml}
            </div>
        </div>

        <div id="screenshotLightbox" class="lightbox">
            <span class="close">&times;</span>
            <img class="lightbox-content" id="img01">
        </div>

        <script>
            document.addEventListener('DOMContentLoaded', () => {
                const images = document.querySelectorAll('.screenshot-container img');
                const lightbox = document.getElementById('screenshotLightbox');
                const lightboxImg = document.getElementById('img01');
                const closeBtn = document.querySelector('.close');

                images.forEach(img => {
                    img.onclick = function() {
                        lightbox.style.display = 'block';
                        lightboxImg.src = this.src;
                    }
                });

                closeBtn.onclick = function() {
                    lightbox.style.display = 'none';
                }

                lightbox.onclick = function(e) {
                    if (e.target === lightbox) {
                        lightbox.style.display = 'none';
                    }
                }
            });
        </script>
    </body>
    </html>
  `;

  try {
    await fs.writeFile(reportPath, htmlContent);
    // console.log(`Laporan HTML individu berhasil dibuat: ${reportPath}`);
  } catch (error: any) {
    console.error(`Gagal menulis laporan HTML individu: ${error.message}`);
  }
}
