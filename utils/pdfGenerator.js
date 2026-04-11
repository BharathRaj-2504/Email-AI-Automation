const puppeteer = require("puppeteer");
const fs = require("fs");
const path = require("path");

const generatePDF = async (name) => {
    try {
        // Launch a headless browser
        const browser = await puppeteer.launch({
            args: ['--no-sandbox', '--disable-setuid-sandbox']
        });
        const page = await browser.newPage();

        // Dynamically inject the user's name into the PDF HTML template
        const htmlContent = `
            <!DOCTYPE html>
            <html>
            <head>
                <style>
                    body { font-family: 'Helvetica Neue', Arial, sans-serif; text-align: center; padding: 50px; background-color: #f9f9f9; }
                    .certificate { border: 5px solid #2c3e50; padding: 40px; background-color: #ffffff; border-radius: 10px; }
                    h1 { color: #e74c3c; font-size: 40px; margin-bottom: 5px; }
                    h2 { color: #2c3e50; font-size: 35px; margin-top: 30px; text-decoration: underline; }
                    p { font-size: 20px; color: #7f8c8d; margin-top: 20px;}
                </style>
            </head>
            <body>
                <div class="certificate">
                    <h1>Certificate of Excellence</h1>
                    <p>This certifies that</p>
                    <h2>${name}</h2>
                    <p>has been officially selected for our premium access tier.</p>
                </div>
            </body>
            </html>
        `;

        await page.setContent(htmlContent, { waitUntil: 'networkidle0' });

        // Ensure a "temp" directory exists to temporarily store the PDF
        const tempDir = path.join(__dirname, "..", "temp");
        if (!fs.existsSync(tempDir)) {
            fs.mkdirSync(tempDir);
        }

        // Create a unique temporary filename
        const pdfFileName = `Certificate_${name.replace(/\s+/g, '_')}_${Date.now()}.pdf`;
        const pdfPath = path.join(tempDir, pdfFileName);

        // Render and save the PDF
        await page.pdf({ path: pdfPath, format: "A4", printBackground: true });

        await browser.close();

        return pdfPath;
    } catch (error) {
        console.error("Error generating PDF:", error);
        throw error;
    }
};

module.exports = { generatePDF };
