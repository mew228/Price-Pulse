require('dotenv').config({ path: './server/.env' });
const { scrapeProduct } = require('./server/services/scraperService');

const url = 'https://www.amazon.in/dp/B0CHX1W1XY';

(async () => {
    try {
        console.log('Testing scrapeProduct via ScraperAPI mapping...');
        const result = await scrapeProduct(url);
        console.log('Result:', result);
    } catch (e) {
        console.error('Scraper test error:', e);
    }
})();
