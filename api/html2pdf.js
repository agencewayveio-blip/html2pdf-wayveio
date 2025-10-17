import chromium from "@sparticuz/chromium";
import puppeteer from "puppeteer-core";

export default async function handler(req, res) {
  try {
    if (req.method !== "POST") return res.status(405).json({ error: "Use POST" });
    const body = typeof req.body === "string" ? JSON.parse(req.body) : (req.body || {});
    const { html, filename = "document.pdf", options = {}, apiKey } = body;

    // (Optionnel) protection simple par clé
    if (process.env.API_KEY && apiKey !== process.env.API_KEY) return res.status(401).json({ error: "Unauthorized" });
    if (!html || typeof html !== "string") return res.status(400).json({ error: "Missing 'html' string" });

    const execPath = await chromium.executablePath;
    const browser = await puppeteer.launch({
      args: chromium.args,
      defaultViewport: chromium.defaultViewport,
      executablePath: execPath,
      headless: chromium.headless
    });
    const page = await browser.newPage();
    await page.setContent(html, { waitUntil: "networkidle0" });

    const defaultHeader = `
      <div style="font-size:10px;font-family:Arial,sans-serif;color:#66728f;width:100%;padding:4mm 10mm;">
        <span style="float:left;">Bilan social media — Wayveio</span>
        <span style="float:right;"><span class="date"></span></span>
      </div>`;
    const defaultFooter = `
      <div style="font-size:10px;font-family:Arial,sans-serif;color:#66728f;width:100%;padding:4mm 10mm;text-align:right;">
        Page <span class="pageNumber"></span> / <span class="totalPages"></span>
      </div>`;

    const pdfBuffer = await page.pdf({
      format: "A4",
      printBackground: true,
      margin: { top: "20mm", bottom: "20mm", left: "15mm", right: "15mm" },
      displayHeaderFooter: true,
      headerTemplate: options.headerTemplate || defaultHeader,
      footerTemplate: options.footerTemplate || defaultFooter,
      ...options
    });

    await browser.close();
    res.setHeader("Content-Type", "application/pdf");
    res.setHeader("Content-Disposition", `inline; filename="${filename}"`);
    res.send(pdfBuffer);
  } catch (err) {
    res.status(500).json({ error: err.message || "PDF error" });
  }
}
