import { chromium } from "playwright";

export async function renderWeeklyReportPdf(html: string): Promise<Buffer> {
  const browser = await chromium.launch({
    headless: true,
  });

  try {
    const page = await browser.newPage();

    await page.setContent(html, {
      waitUntil: "networkidle",
    });

    const pdf = await page.pdf({
      format: "Letter",
      printBackground: true,
      margin: {
        top: "0in",
        right: "0in",
        bottom: "0in",
        left: "0in",
      },
    });

    return Buffer.from(pdf);
  } finally {
    await browser.close();
  }
}
