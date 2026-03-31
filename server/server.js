require('dotenv').config();
const express = require('express');
const cors = require('cors');
const cron = require('node-cron');
const connectDB = require('./config/db');
const apiRoutes = require('./routes/api');
const errorHandler = require('./middleware/errorHandler');
const { globalLimiter } = require('./middleware/rateLimiter');
const Product = require('./models/Product');
const { scrapeProduct } = require('./services/scraperService');
const { sendNotifications } = require('./services/notificationService');

const app = express();
const PORT = process.env.PORT || 5000;

connectDB();

app.use(cors({
  origin: process.env.NODE_ENV === 'production'
    ? process.env.CLIENT_URL || 'http://localhost:3000'
    : ['http://localhost:3000', 'http://localhost:5173', 'http://127.0.0.1:3000'],
  credentials: true,
  methods: ['GET', 'POST', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
}));

app.use(express.json({ limit: '10kb' }));
app.use(express.urlencoded({ extended: true, limit: '10kb' }));

app.use(globalLimiter);

app.use((req, res, next) => {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('X-XSS-Protection', '1; mode=block');
  next();
});

app.use('/api', apiRoutes);

app.use('*', (req, res) => {
  res.status(404).json({ success: false, message: `Route ${req.originalUrl} not found` });
});

app.use(errorHandler);

const runPriceCheck = async () => {
  console.log(`[Cron] Price check started at ${new Date().toISOString()}`);
  try {
    const products = await Product.find({
      isActive: true,
      notificationSent: false,
    }).limit(50);

    if (products.length === 0) {
      console.log('[Cron] No active products to check');
      return;
    }

    for (const product of products) {
      try {
        await new Promise((r) => setTimeout(r, 2000 + Math.random() * 3000));
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
      } catch (err) {
        console.error(`[Cron] Error for ${product.url}: ${err.message}`);
      }
    }
  } catch (err) {
    console.error('[Cron] Fatal error:', err.message);
  }
};

const intervalMinutes = parseInt(process.env.SCRAPE_INTERVAL_MINUTES) || 60;
cron.schedule(`*/${intervalMinutes} * * * *`, runPriceCheck);

app.listen(PORT, () => {
  console.log(`PricePulse server running on http://localhost:${PORT}`);
  console.log(`Price checks scheduled every ${intervalMinutes} minute(s)`);
});

process.on('unhandledRejection', (err) => {
  console.error('Unhandled Promise Rejection:', err.message);
  process.exit(1);
});

module.exports = app;
