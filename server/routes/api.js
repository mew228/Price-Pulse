const express = require('express');
const { body, param, query } = require('express-validator');
const {
  addTracker,
  getAllTrackers,
  getTrackerById,
  updateTracker,
  deleteTracker,
  refreshTracker,
  getStats,
} = require('../controllers/trackerController');
const { addTrackerLimiter, refreshLimiter } = require('../middleware/rateLimiter');

const router = express.Router();

const validateUrl = body('url')
  .isURL({ protocols: ['http', 'https'], require_tld: true })
  .withMessage('Invalid URL format')
  .custom((url) => {
    const lower = url.toLowerCase();
    if (!lower.includes('amazon') && !lower.includes('flipkart') && !lower.includes('myntra')) {
      throw new Error('Only Amazon, Flipkart, and Myntra URLs are supported');
    }
    return true;
  });

const validateEmail = body('userEmail')
  .isEmail()
  .withMessage('Valid email address is required')
  .normalizeEmail();

const validateTargetPrice = body('targetPrice')
  .isFloat({ min: 1 })
  .withMessage('Target price must be a positive number');

const validatePhone = body('userPhone')
  .optional({ nullable: true })
  .matches(/^\+?[1-9]\d{9,14}$/)
  .withMessage('Invalid phone number format (include country code, e.g. +919876543210)');

const validateId = param('id')
  .isMongoId()
  .withMessage('Invalid tracker ID');

router.get('/health', (req, res) => {
  res.json({ success: true, status: 'operational', timestamp: new Date().toISOString() });
});

router.get('/stats', getStats);

router.post(
  '/trackers',
  addTrackerLimiter,
  [validateUrl, validateEmail, validateTargetPrice, validatePhone],
  addTracker
);

router.get(
  '/trackers',
  [query('email').optional().isEmail().withMessage('Invalid email query')],
  getAllTrackers
);

router.get('/trackers/:id', [validateId], getTrackerById);

router.patch(
  '/trackers/:id',
  [
    validateId,
    body('targetPrice').optional().isFloat({ min: 1 }).withMessage('Target price must be positive'),
    body('notifyEmail').optional().isBoolean(),
    body('notifySMS').optional().isBoolean(),
    validatePhone,
    body('isActive').optional().isBoolean(),
  ],
  updateTracker
);

router.delete('/trackers/:id', [validateId], deleteTracker);

router.post('/trackers/:id/refresh', refreshLimiter, [validateId], refreshTracker);

module.exports = router;
