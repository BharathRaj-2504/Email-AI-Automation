const puppeteer = require("puppeteer");

(async () => {
    try {
        const browser = await puppeteer.launch();
        const page = await browser.newPage();

        await page.setContent("<h1>Puppeteer Working ✅</h1>");
        await page.pdf({ path: "test.pdf", format: "A4" });

        await browser.close();

        console.log("PDF generated successfully 🚀");
    } catch (error) {
        console.error("Error:", error);
    }
})();