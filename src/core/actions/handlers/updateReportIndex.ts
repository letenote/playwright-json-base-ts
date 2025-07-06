import { promises as fs } from "fs";
import path from "path";
import { IndexReportEntry, Report } from "../../core.interface";
import { formatDuration } from "../../helpers/formatDuration";
// import ExcelJS from "exceljs";

export async function updateReportIndex(allReports: Report[]): Promise<void> {
  const reportDir = "reports";
  const indexPath = path.join(reportDir, "index.html");
  const indexDataPath = path.join(reportDir, "reports_index.json");
  // const excelReportPath = path.join(
  //   reportDir,
  //   `automation_report_${new Date().toISOString().replace(/:/g, "-")}.xlsx`
  // );

  let existingIndex: IndexReportEntry[] = [];

  try {
    const indexJsonData = await fs.readFile(indexDataPath, "utf8");
    existingIndex = JSON.parse(indexJsonData);
  } catch (error: any) {
    if (error.code === "ENOENT") {
      // console.log("File reports_index.json tidak ditemukan, membuat baru.");
    } else {
      console.error(
        "Gagal membaca atau mengurai reports_index.json:",
        error.message
      );
    }
  }

  // Buat entri baru hanya untuk laporan yang baru saja digeneraate
  const newIndexEntries: IndexReportEntry[] = allReports.map((reportData) => {
    let overallStatus: IndexReportEntry["status"] = "PASSED";
    if (reportData.failedSteps > 0 && reportData.passedSteps > 0) {
      overallStatus = "MIXED";
    } else if (reportData.failedSteps > 0) {
      overallStatus = "FAILED";
    }

    const scenarioBaseName = path.basename(reportData.scenarioFile, ".json");
    const reportSubDir =
      reportData.scenarioGroup && reportData.scenarioGroup !== "root"
        ? reportData.scenarioGroup
        : "";

    const reportFileName = `${scenarioBaseName}_${reportData.timestamp.replace(
      /:/g,
      "-"
    )}.html`;
    const relativeReportPath = path
      .join(reportSubDir, reportFileName)
      .replace(/\\/g, "/");

    return {
      timestamp: reportData.timestamp,
      reportFileName: relativeReportPath,
      scenarioFile: reportData.scenarioFile,
      browserUsed: reportData.browserUsed,
      totalSteps: reportData.totalSteps,
      passedSteps: reportData.passedSteps,
      failedSteps: reportData.failedSteps,
      status: overallStatus,
      executionTimeFormatted: formatDuration(reportData.executionTimeMs),
      scenarioGroup: reportData.scenarioGroup,
      scenarioName: reportData.scenarioName,
    };
  });

  // merge entri baru dengan yang sudah ada (taruh yang baru di depan)
  // Filter untuk menghindari duplikasi jika skrip dijalankan berkali-kali tanpa membersihkan reports_index.json
  const combinedIndex = [
    ...newIndexEntries,
    ...existingIndex.filter(
      (existing) =>
        !newIndexEntries.some(
          (newEntry) =>
            newEntry.scenarioFile === existing.scenarioFile &&
            newEntry.timestamp === existing.timestamp
        )
    ),
  ];

  try {
    await fs.writeFile(indexDataPath, JSON.stringify(combinedIndex, null, 2));
  } catch (error: any) {
    console.error("Gagal menulis reports_index.json:", error.message);
  }

  // grouping entri berdasarkan scenarioGroup
  const groupedReports: { [key: string]: IndexReportEntry[] } =
    combinedIndex.reduce((acc, entry) => {
      const group = entry.scenarioGroup || "Tidak Dikelompokkan";
      if (!acc[group]) {
        acc[group] = [];
      }
      acc[group].push(entry);
      return acc;
    }, {} as { [key: string]: IndexReportEntry[] });

  let groupedReportHtml = "";
  for (const group in groupedReports) {
    groupedReportHtml += `
            <div class="report-group">
                <h2>Folder: ${group}</h2>
                <div class="reports-grid">
        `;
    // Urutkan laporan di dalam grup berdasarkan timestamp terbaru
    // Penting: Pastikan timestamp di IndexReportEntry adalah format yang bisa diurai oleh new Date()
    const sortedGroupReports = groupedReports[group].sort(
      (a, b) =>
        new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
    );

    for (const entry of sortedGroupReports) {
      const statusClass = entry.status.toLowerCase();
      // Format timestamp untuk tampilan di index.html
      const displayTimestamp = new Date(entry.timestamp).toLocaleString(
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

      groupedReportHtml += `
                <div class="report-card ${statusClass}">
                    <div class="card-header">
                        <span class="status-indicator ${statusClass}"></span>
                        <h3>${path.basename(entry.scenarioFile, ".json")}</h3>
                        <span class="card-duration">${
                          entry.executionTimeFormatted
                        }</span>
                    </div>
                    <div class="card-body">
                        <p><strong>Skenario:</strong> ${entry.scenarioName}</p>
                        <p><strong>Waktu:</strong> ${displayTimestamp}</p>
                        <p><strong>Browser:</strong> ${entry.browserUsed}</p>
                        <p><strong>Status:</strong> <span class="status-text ${statusClass}">${
        entry.status
      }</span></p>
                        <p><strong>Langkah Berhasil:</strong> ${
                          entry.passedSteps
                        } / ${entry.totalSteps}</p>
                        <a href="./${
                          entry.reportFileName
                        }" target="_blank" class="view-report-btn">Lihat Laporan Detail</a>
                    </div>
                </div>
            `;
    }
    groupedReportHtml += `
                </div>
            </div>
        `;
  }

  const indexHtmlContent = `
        <!DOCTYPE html>
        <html lang="en">
        <head>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>Indeks Laporan Otomatisasi Playwright</title>
            <link href="https://fonts.googleapis.com/css2?family=Roboto:wght@400;700&display=swap" rel="stylesheet">
            <style>
                body { font-family: 'Roboto', Arial, sans-serif; margin: 0; background-color: #f0f2f5; color: #333; line-height: 1.6; }
                .container { max-width: 1200px; margin: 30px auto; background-color: #ffffff; padding: 40px; border-radius: 10px; box-shadow: 0 4px 20px rgba(0,0,0,0.08); }
                h1 { color: #2c3e50; text-align: center; margin-bottom: 40px; font-size: 2.8em; font-weight: 700; }
                
                .report-group {
                    margin-bottom: 40px;
                    padding: 20px;
                    border: 1px solid #e0e0e0;
                    border-radius: 10px;
                    background-color: #fcfcfc;
                }
                .report-group h2 {
                    color: #007bff;
                    font-size: 1.8em;
                    margin-top: 0;
                    margin-bottom: 20px;
                    border-bottom: 2px solid #eee;
                    padding-bottom: 10px;
                }

                .reports-grid {
                    display: grid;
                    grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
                    gap: 25px;
                    padding: 0;
                }
                .report-card {
                    background-color: #fff;
                    border-radius: 8px;
                    box-shadow: 0 2px 10px rgba(0,0,0,0.08);
                    overflow: hidden;
                    transition: transform 0.2s ease-in-out;
                    border: 1px solid #e0e0e0;
                }
                .report-card:hover {
                    transform: translateY(-5px);
                }

                .report-card.passed { border-left: 8px solid #28a745; }
                .report-card.failed { border-left: 8px solid #dc3545; }
                .report-card.mixed { border-left: 8px solid #ffc107; }

                .card-header {
                    background-color: #f8f8f8;
                    padding: 15px 20px;
                    display: flex;
                    align-items: center;
                    border-bottom: 1px solid #e0e0e0;
                }
                .card-header h3 {
                    margin: 0;
                    font-size: 1.4em;
                    flex-grow: 1;
                    color: #2c3e50;
                }
                .status-indicator {
                    width: 15px;
                    height: 15px;
                    border-radius: 50%;
                    margin-right: 15px;
                    display: inline-block;
                }
                .status-indicator.passed { background-color: #28a745; }
                .status-indicator.failed { background-color: #dc3545; }
                .status-indicator.mixed { background-color: #ffc107; }
                .card-duration {
                    font-size: 0.95em;
                    color: #666;
                    font-weight: bold;
                }

                .card-body {
                    padding: 20px;
                }
                .card-body p {
                    margin: 5px 0;
                    font-size: 0.95em;
                }
                .card-body p strong {
                    color: #555;
                }
                .status-text.passed { color: #28a745; }
                .status-text.failed { color: #dc3545; }
                .status-text.mixed { color: #ffc107; }
                .status-text { font-weight: bold; }

                .view-report-btn {
                    display: block;
                    width: calc(100% - 40px);
                    margin-top: 20px;
                    padding: 12px 0;
                    text-align: center;
                    background-color: #007bff;
                    color: white;
                    text-decoration: none;
                    border-radius: 5px;
                    font-weight: bold;
                    transition: background-color 0.3s ease;
                }
                .view-report-btn:hover {
                    background-color: #0056b3;
                }
            </style>
        </head>
        <body>
            <div class="container">
                <h1>Indeks Laporan Otomatisasi Playwright</h1>
                ${groupedReportHtml}
            </div>
        </body>
        </html>
    `;

  try {
    const totalExecutionTimeMs = allReports.reduce((sum, currentItem) => {
      return sum + currentItem.executionTimeMs;
    }, 0);
    await fs.writeFile(indexPath, indexHtmlContent);
    console.info("===== 🔥🔥 END:ALL:SCENARIO:TEST 🔥🔥 =====");
    console.log(
      `Updated: ${indexPath}. Execution all scenario in ${totalExecutionTimeMs}ms.` +
        "\n"
    );
  } catch (error: any) {
    console.error(`Gagal menulis index laporan HTML: ${error.message}`);
  }

  // // --- START NEW LOGIC UNTUK EXCEL REPORT ---
  // try {
  //   const workbook = new ExcelJS.Workbook();
  //   workbook.creator = "Playwright Automation Reporter";
  //   workbook.lastModifiedBy = "Playwright Automation";
  //   workbook.created = new Date();
  //   workbook.modified = new Date();
  //   workbook.properties.date1904 = true;

  //   // Sheet 1: Ringkasan Skenario
  //   const summarySheet = workbook.addWorksheet("Ringkasan Skenario");
  //   summarySheet.columns = [
  //     { header: "No.", key: "no", width: 5 },
  //     { header: "File Skenario", key: "scenarioFile", width: 40 },
  //     { header: "Timestamp Eksekusi", key: "timestamp", width: 25 },
  //     { header: "Grup Skenario", key: "scenarioGroup", width: 20 },
  //     { header: "Browser", key: "browserUsed", width: 15 },
  //     { header: "Total Langkah", key: "totalSteps", width: 15 },
  //     { header: "Langkah Berhasil", key: "passedSteps", width: 18 },
  //     { header: "Langkah Gagal", key: "failedSteps", width: 15 },
  //     { header: "Status Keseluruhan", key: "status", width: 20 },
  //     { header: "Waktu Eksekusi", key: "executionTimeFormatted", width: 20 },
  //     { header: "Link Laporan HTML", key: "htmlReportLink", width: 40 },
  //   ];

  //   combinedIndex.forEach((entry, idx) => {
  //     summarySheet.addRow({
  //       no: idx + 1,
  //       scenarioFile: entry.scenarioFile,
  //       timestamp: new Date(entry.timestamp).toLocaleString("id-ID"),
  //       scenarioGroup: entry.scenarioGroup,
  //       browserUsed: entry.browserUsed,
  //       totalSteps: entry.totalSteps,
  //       passedSteps: entry.passedSteps,
  //       failedSteps: entry.failedSteps,
  //       status: entry.status,
  //       executionTimeFormatted: entry.executionTimeFormatted,
  //       htmlReportLink: {
  //         text: entry.reportFileName,
  //         hyperlink: `./${entry.reportFileName}`,
  //       }, // Membuat hyperlink
  //     });
  //   });

  //   // Styling Header
  //   summarySheet.getRow(1).eachCell((cell) => {
  //     cell.font = { bold: true, color: { argb: "FFFFFFFF" } };
  //     cell.fill = {
  //       type: "pattern",
  //       pattern: "solid",
  //       fgColor: { argb: "FF4CAF50" },
  //     }; // Green
  //     cell.alignment = { vertical: "middle", horizontal: "center" };
  //     cell.border = {
  //       top: { style: "thin" },
  //       left: { style: "thin" },
  //       bottom: { style: "thin" },
  //       right: { style: "thin" },
  //     };
  //   });

  //   // Styling Status Kolom
  //   summarySheet.columns.forEach((column) => {
  //     if (column.key === "status") {
  //       column.eachCell?.({ includeEmpty: false }, (cell) => {
  //         if (parseInt(cell.row as string) > 1) {
  //           // Skip header row
  //           if (cell.value === "PASSED") {
  //             cell.font = { bold: true, color: { argb: "FF28A745" } }; // Darker Green
  //           } else if (cell.value === "FAILED") {
  //             cell.font = { bold: true, color: { argb: "FFDC3545" } }; // Red
  //           } else if (cell.value === "MIXED") {
  //             cell.font = { bold: true, color: { argb: "FFFFC107" } }; // Amber/Orange
  //           }
  //         }
  //       });
  //     }
  //   });

  //   // Sheet 2: Detail Langkah Per Skenario
  //   const detailSheet = workbook.addWorksheet("Detail Langkah");
  //   detailSheet.columns = [
  //     { header: "No.", key: "no", width: 5 },
  //     { header: "File Skenario", key: "scenarioFile", width: 35 },
  //     { header: "Timestamp Skenario", key: "scenarioTimestamp", width: 25 },
  //     { header: "Grup Skenario", key: "scenarioGroup", width: 20 },
  //     { header: "Deskripsi Langkah", key: "description", width: 40 },
  //     { header: "Aksi", key: "action", width: 20 },
  //     { header: "Status", key: "status", width: 12 },
  //     { header: "Pesan", key: "message", width: 60 },
  //     { header: "Selector", key: "selector", width: 25 },
  //     { header: "Nilai", key: "value", width: 25 },
  //     { header: "Pola URL", key: "urlPattern", width: 30 },
  //     { header: "Waktu Eksekusi (ms)", key: "durationMs", width: 20 },
  //     { header: "Link Screenshot", key: "screenshotPath", width: 40 },
  //   ];

  //   let detailRowNo = 1;
  //   for (const report of allReports) {
  //     for (const step of report.steps) {
  //       detailSheet.addRow({
  //         no: detailRowNo++,
  //         scenarioFile: report.scenarioFile,
  //         scenarioTimestamp: new Date(report.timestamp).toLocaleString("id-ID"),
  //         scenarioGroup: report.scenarioGroup,
  //         description: step.description,
  //         action: step.action,
  //         status: step.status,
  //         message: step.message,
  //         selector: step.selector,
  //         value: step.value,
  //         urlPattern: Array.isArray(step.urlPattern)
  //           ? step.urlPattern.join(", ")
  //           : step.urlPattern,
  //         durationMs: step.durationMs,
  //         screenshotPath: step.screenshotPath
  //           ? {
  //               text: path.basename(step.screenshotPath),
  //               hyperlink: `./${path
  //                 .relative(reportDir, step.screenshotPath)
  //                 .replace(/\\/g, "/")}`,
  //             }
  //           : "",
  //       });
  //     }
  //   }

  //   // Styling Header Sheet Detail Langkah
  //   detailSheet.getRow(1).eachCell((cell) => {
  //     cell.font = { bold: true, color: { argb: "FFFFFFFF" } };
  //     cell.fill = {
  //       type: "pattern",
  //       pattern: "solid",
  //       fgColor: { argb: "FF1976D2" },
  //     }; // Blue
  //     cell.alignment = { vertical: "middle", horizontal: "center" };
  //     cell.border = {
  //       top: { style: "thin" },
  //       left: { style: "thin" },
  //       bottom: { style: "thin" },
  //       right: { style: "thin" },
  //     };
  //   });

  //   // Styling Status Kolom di Sheet Detail
  //   detailSheet.columns.forEach((column) => {
  //     if (column.key === "status") {
  //       column.eachCell?.({ includeEmpty: false }, (cell) => {
  //         if (parseInt(cell.row as string) > 1) {
  //           if (cell.value === "SUCCESS") {
  //             cell.font = { bold: true, color: { argb: "FF28A745" } };
  //           } else if (cell.value === "FAILURE") {
  //             cell.font = { bold: true, color: { argb: "FFDC3545" } };
  //           }
  //         }
  //       });
  //     }
  //   });

  //   // Simpan workbook ke file
  //   await workbook.xlsx.writeFile(excelReportPath);
  //   console.log(`Laporan Excel berhasil dibuat: ${excelReportPath}`);
  // } catch (error: any) {
  //   console.error(`Gagal membuat laporan Excel: ${error.message}`);
  // }
  // // --- END NEW LOGIC UNTUK EXCEL REPORT ---
}
