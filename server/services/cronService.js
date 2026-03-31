const Product = require('../models/Product');
const { scrapeProduct } = require('./scraperService');
const { sendNotifications } = require('./notificationService');

const runPriceCheck = async () => {
  console.log(`[Cron] Price check started at ${new Date().toISOString()}`);
  try {
    const products = await Product.find({
      isActive: true,
      notificationSent: false,
    }).limit(50);

    if (products.length === 0) {
      console.log('[Cron] No active products to check');
      return { success: true, count: 0 };
    }

    let processed = 0;
    for (const product of products) {
      try {
        // Only delay in development to avoid hitting rate limits too fast
        if (process.env.NODE_ENV !== 'production') {
          await new Promise((r) => setTimeout(r, 2000 + Math.random() * 3000));
        }
        
        const scraped = await scrapeProduct(product.url);

        product.currentPrice = scraped.currentPrice;
        product.originalPrice = scraped.originalPrice || product.originalPrice;
        product.productName = scraped.productName || product.productName;
        product.productImage = scraped.productImage || product.productImage;
        product.lastChecked = new Date();

        if (scraped.currentPrice) {
          product.priceHistory.push({ price: scraped.currentPrice });
          if (product.priceHistory.length > 90) {
            product.priceHistory = product.priceHistory.slice(-90);
          }
        }

        if (scraped.currentPrice !== null && scraped.currentPrice <= product.targetPrice) {
          product.notificationSent = true;
          await product.save();
          await sendNotifications(product);
          console.log(`[Cron] Price alert sent for: ${product.productName}`);
        } else {
          await product.save();
          console.log(`[Cron] ${product.productName}: ${scraped.currentPrice} (target: ${product.targetPrice})`);
        }
        processed++;
      } catch (err) {
        console.error(`[Cron] Error for ${product.url}: ${err.message}`);
      }
    }
    return { success: true, count: processed };
  } catch (err) {
    console.error('[Cron] Fatal error:', err.message);
    throw err;
  }
};

module.exports = { runPriceCheck };
