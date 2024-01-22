const puppeteer = require('puppeteer');
const axios = require('axios');
const fs = require('fs');
const path = require('path');
async function scrapeImages(url) {
    const browser = await puppeteer.launch({ headless: false }); // Non-headless for debugging
    const page = await browser.newPage();
    await page.goto(url, { waitUntil: 'networkidle0' });

    while (true) {
        // Check if the 'View More' button is visible and clickable
        const loadMoreButton = await page.$('.load-more');
        if (loadMoreButton) {
            try {
                await loadMoreButton.click();
                await page.waitForFunction('document.readyState === "complete"');
                await page.waitForTimeout(3000); // Adjust based on site's behavior
            } catch (error) {
                console.log("No more 'View More' buttons to click or error clicking.");
                break; // Exit the loop if the button can't be clicked
            }
        } else {
            break; // Exit the loop if the button is no longer present
        }
    }

    const images = await page.evaluate(() => {
        const imageDivs = Array.from(document.querySelectorAll('div.product__image'));
        return imageDivs.map(div => {
            const style = window.getComputedStyle(div);
            const backgroundImage = style.backgroundImage;
            return backgroundImage.replace(/url\((['"])?(.*?)\1\)/gi, '$2'); // Extract URL
        });
    });

    await browser.close();
    return images;
}


async function downloadImage(url, filepath) {
    try {
        const response = await axios({
            url,
            method: 'GET',
            responseType: 'stream'
        });

        const writer = fs.createWriteStream(filepath);

        response.data.pipe(writer);

        return new Promise((resolve, reject) => {
            writer.on('finish', resolve);
            writer.on('error', reject);
        });
    } catch (error) {
        console.error("Error downloading the image:", error.message);
    }
}
async function main() {
    const url = 'https://www.uniboard.com/en/tfl-panels';
    const images = await scrapeImages(url);

    for (let i = 0; i < images.length; i++) {
        const imageUrl = images[i];
        // Extract part of the URL for the filename
        const matches = /\/([^\/]+)_\d+x\d+_/.exec(imageUrl);
        let filename = `image${i}.png`;
        if (matches && matches[1]) {
            filename = `${matches[1]}.png`; // Use the extracted part as the filename
        }

        const filepath = path.join(__dirname, filename);
        await downloadImage(imageUrl, filepath);
        console.log(`Downloaded image ${filename} from ${imageUrl}`);
    }
}

main().catch(console.error);