const mongoose = require('mongoose');

const priceHistorySchema = new mongoose.Schema({
  price: { type: Number, required: true },
  checkedAt: { type: Date, default: Date.now },
});

const productSchema = new mongoose.Schema(
  {
    url: {
      type: String,
      required: [true, 'Product URL is required'],
      trim: true,
    },
    platform: {
      type: String,
      enum: ['amazon', 'flipkart', 'myntra', 'unknown'],
      default: 'unknown',
    },
    productName: { type: String, default: 'Fetching...' },
    productImage: { type: String, default: '' },
    currentPrice: { type: Number, default: null },
    originalPrice: { type: Number, default: null },
    targetPrice: {
      type: Number,
      required: [true, 'Target price is required'],
      min: [0, 'Target price must be positive'],
    },
    currency: { type: String, default: '₹' },
    userEmail: {
      type: String,
      required: [true, 'Email is required'],
      match: [/^\S+@\S+\.\S+$/, 'Invalid email address'],
      trim: true,
      lowercase: true,
    },
    userPhone: { type: String, default: null },
    notifyEmail: { type: Boolean, default: true },
    notifySMS: { type: Boolean, default: false },
    isActive: { type: Boolean, default: true },
    lastChecked: { type: Date, default: null },
    notificationSent: { type: Boolean, default: false },
    priceHistory: [priceHistorySchema],
  },
  { timestamps: true }
);

productSchema.index({ url: 1, userEmail: 1 });
productSchema.index({ isActive: 1, lastChecked: 1 });

productSchema.methods.detectPlatform = function () {
  const url = this.url.toLowerCase();
  if (url.includes('amazon')) return 'amazon';
  if (url.includes('flipkart')) return 'flipkart';
  if (url.includes('myntra')) return 'myntra';
  return 'unknown';
};

productSchema.virtual('priceDrop').get(function () {
  if (!this.originalPrice || !this.currentPrice) return null;
  return this.originalPrice - this.currentPrice;
});

productSchema.set('toJSON', { virtuals: true });

module.exports = mongoose.model('Product', productSchema);
