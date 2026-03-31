const Product = require('../models/Product');
const { scrapeProduct, detectPlatform } = require('../services/scraperService');
const { sendNotifications } = require('../services/notificationService');
const { validationResult } = require('express-validator');

const handleValidationErrors = (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    res.status(400).json({ success: false, errors: errors.array() });
    return true;
  }
  return false;
};

const addTracker = async (req, res, next) => {
  try {
    if (handleValidationErrors(req, res)) return;

    const { url, targetPrice, userEmail, userPhone, notifyEmail, notifySMS } = req.body;
    const platform = detectPlatform(url);

    if (platform === 'unknown') {
      return res.status(400).json({
        success: false,
        message: 'Unsupported platform. Please use Amazon, Flipkart, or Myntra URLs.',
      });
    }

    const existing = await Product.findOne({ url, userEmail, isActive: true });
    if (existing) {
      return res.status(409).json({
        success: false,
        message: 'You are already tracking this product. Update the target price instead.',
        data: existing,
      });
    }

    const product = new Product({
      url,
      platform,
      targetPrice,
      userEmail,
      userPhone: userPhone || null,
      notifyEmail: notifyEmail !== false,
      notifySMS: !!notifySMS,
    });

    await product.save();

    res.status(201).json({
      success: true,
      message: 'Product tracker added. Price details will be fetched shortly.',
      data: product,
    });

    setImmediate(async () => {
      try {
        const scraped = await scrapeProduct(url);
        product.productName = scraped.productName || 'Product';
        product.currentPrice = scraped.currentPrice;
        product.originalPrice = scraped.originalPrice;
        product.productImage = scraped.productImage || '';
        product.currency = scraped.currency || '₹';
        product.lastChecked = new Date();

        if (scraped.currentPrice) {
          product.priceHistory.push({ price: scraped.currentPrice });
        }

        if (scraped.currentPrice !== null && scraped.currentPrice <= targetPrice) {
          product.notificationSent = true;
          await product.save();
          await sendNotifications(product);
        } else {
          await product.save();
        }
      } catch (err) {
        console.error('Background scrape error:', err.message);
        product.productName = 'Could not fetch (bot protection)';
        await product.save();
      }
    });
  } catch (error) {
    next(error);
  }
};

const getAllTrackers = async (req, res, next) => {
  try {
    const { email, page = 1, limit = 20, active } = req.query;
    const filter = {};
    if (email) filter.userEmail = email.toLowerCase();
    if (active !== undefined) filter.isActive = active === 'true';

    const skip = (parseInt(page) - 1) * parseInt(limit);
    const [products, total] = await Promise.all([
      Product.find(filter)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(parseInt(limit))
        .lean(),
      Product.countDocuments(filter),
    ]);

    res.json({
      success: true,
      data: products,
      pagination: {
        total,
        page: parseInt(page),
        limit: parseInt(limit),
        pages: Math.ceil(total / parseInt(limit)),
      },
    });
  } catch (error) {
    next(error);
  }
};

const getTrackerById = async (req, res, next) => {
  try {
    const product = await Product.findById(req.params.id);
    if (!product) {
      return res.status(404).json({ success: false, message: 'Tracker not found' });
    }
    res.json({ success: true, data: product });
  } catch (error) {
    next(error);
  }
};

const updateTracker = async (req, res, next) => {
  try {
    if (handleValidationErrors(req, res)) return;

    const updates = {};
    const allowed = ['targetPrice', 'notifyEmail', 'notifySMS', 'userPhone', 'isActive'];
    allowed.forEach((key) => {
      if (req.body[key] !== undefined) updates[key] = req.body[key];
    });

    if (Object.keys(updates).length === 0) {
      return res.status(400).json({ success: false, message: 'No valid fields to update' });
    }

    const product = await Product.findByIdAndUpdate(
      req.params.id,
      { $set: updates },
      { new: true, runValidators: true }
    );

    if (!product) {
      return res.status(404).json({ success: false, message: 'Tracker not found' });
    }

    res.json({ success: true, message: 'Tracker updated', data: product });
  } catch (error) {
    next(error);
  }
};

const deleteTracker = async (req, res, next) => {
  try {
    const product = await Product.findByIdAndDelete(req.params.id);
    if (!product) {
      return res.status(404).json({ success: false, message: 'Tracker not found' });
    }
    res.json({ success: true, message: 'Tracker removed successfully' });
  } catch (error) {
    next(error);
  }
};

const refreshTracker = async (req, res, next) => {
  try {
    const product = await Product.findById(req.params.id);
    if (!product) {
      return res.status(404).json({ success: false, message: 'Tracker not found' });
    }

    const scraped = await scrapeProduct(product.url);
    product.productName = scraped.productName || product.productName;
    product.currentPrice = scraped.currentPrice;
    product.originalPrice = scraped.originalPrice;
    product.productImage = scraped.productImage || product.productImage;
    product.lastChecked = new Date();

    if (scraped.currentPrice) {
      product.priceHistory.push({ price: scraped.currentPrice });
      if (product.priceHistory.length > 90) {
        product.priceHistory = product.priceHistory.slice(-90);
      }
    }

    let notified = false;
    if (scraped.currentPrice !== null && scraped.currentPrice <= product.targetPrice && !product.notificationSent) {
      product.notificationSent = true;
      await product.save();
      await sendNotifications(product);
      notified = true;
    } else {
      await product.save();
    }

    res.json({
      success: true,
      message: notified ? 'Price refreshed and notification sent!' : 'Price refreshed successfully',
      data: product,
    });
  } catch (error) {
    next(error);
  }
};

const getStats = async (req, res, next) => {
  try {
    const [total, active, notified, byPlatform] = await Promise.all([
      Product.countDocuments(),
      Product.countDocuments({ isActive: true }),
      Product.countDocuments({ notificationSent: true }),
      Product.aggregate([
        { $group: { _id: '$platform', count: { $sum: 1 } } },
      ]),
    ]);

    res.json({
      success: true,
      data: {
        total,
        active,
        notified,
        byPlatform: byPlatform.reduce((acc, item) => {
          acc[item._id] = item.count;
          return acc;
        }, {}),
      },
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  addTracker,
  getAllTrackers,
  getTrackerById,
  updateTracker,
  deleteTracker,
  refreshTracker,
  getStats,
};
