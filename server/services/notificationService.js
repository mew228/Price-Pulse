const nodemailer = require('nodemailer');

let twilioClient = null;
try {
  if (process.env.TWILIO_ACCOUNT_SID && process.env.TWILIO_AUTH_TOKEN) {
    const twilio = require('twilio');
    twilioClient = twilio(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN);
  }
} catch (e) {
  console.warn('Twilio not configured:', e.message);
}

const createTransporter = () => {
  return nodemailer.createTransport({
    host: process.env.EMAIL_HOST || 'smtp.gmail.com',
    port: parseInt(process.env.EMAIL_PORT) || 587,
    secure: false,
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASS,
    },
    tls: { rejectUnauthorized: false },
  });
};

const formatPrice = (price, currency = '₹') => `${currency}${price?.toLocaleString('en-IN') || 'N/A'}`;

const sendEmailNotification = async (product) => {
  if (!process.env.EMAIL_USER || !process.env.EMAIL_PASS) {
    console.warn('Email credentials not configured. Skipping email notification.');
    return { success: false, reason: 'Email not configured' };
  }

  const transporter = createTransporter();
  const priceDrop = product.originalPrice
    ? ((product.originalPrice - product.currentPrice) / product.originalPrice * 100).toFixed(1)
    : null;

  const emailHtml = `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0"/>
  <title>Price Drop Alert</title>
</head>
<body style="margin:0;padding:0;background:#e0e5ec;font-family:'Segoe UI',Arial,sans-serif;">
  <div style="max-width:600px;margin:40px auto;background:#e0e5ec;border-radius:20px;
    box-shadow:9px 9px 16px rgba(163,177,198,0.6),-9px -9px 16px rgba(255,255,255,0.5);
    overflow:hidden;">
    <div style="background:linear-gradient(135deg,#667eea 0%,#764ba2 100%);padding:30px;text-align:center;">
      <h1 style="color:#fff;margin:0;font-size:28px;letter-spacing:-0.5px;">🎯 PricePulse</h1>
      <p style="color:rgba(255,255,255,0.85);margin:8px 0 0;font-size:14px;">Smart Price Drop Alert</p>
    </div>
    <div style="padding:36px;">
      <div style="background:#e0e5ec;border-radius:16px;padding:24px;margin-bottom:24px;
        box-shadow:inset 4px 4px 8px rgba(163,177,198,0.5),inset -4px -4px 8px rgba(255,255,255,0.7);">
        <p style="margin:0 0 6px;color:#6b7280;font-size:12px;text-transform:uppercase;letter-spacing:1px;">Great news!</p>
        <h2 style="margin:0;color:#1f2937;font-size:20px;line-height:1.4;">${product.productName}</h2>
      </div>
      <div style="display:flex;gap:16px;margin-bottom:24px;">
        <div style="flex:1;background:#e0e5ec;border-radius:16px;padding:20px;text-align:center;
          box-shadow:9px 9px 16px rgba(163,177,198,0.6),-9px -9px 16px rgba(255,255,255,0.5);">
          <p style="margin:0 0 4px;color:#6b7280;font-size:11px;text-transform:uppercase;letter-spacing:1px;">Current Price</p>
          <p style="margin:0;color:#10b981;font-size:28px;font-weight:700;">${formatPrice(product.currentPrice, product.currency)}</p>
        </div>
        <div style="flex:1;background:#e0e5ec;border-radius:16px;padding:20px;text-align:center;
          box-shadow:9px 9px 16px rgba(163,177,198,0.6),-9px -9px 16px rgba(255,255,255,0.5);">
          <p style="margin:0 0 4px;color:#6b7280;font-size:11px;text-transform:uppercase;letter-spacing:1px;">Your Target</p>
          <p style="margin:0;color:#8b5cf6;font-size:28px;font-weight:700;">${formatPrice(product.targetPrice, product.currency)}</p>
        </div>
      </div>
      ${priceDrop ? `<div style="background:linear-gradient(135deg,#10b981,#059669);border-radius:12px;padding:16px;text-align:center;margin-bottom:24px;">
        <p style="margin:0;color:#fff;font-size:18px;font-weight:700;">🎉 You save ${priceDrop}% off original price!</p>
      </div>` : ''}
      <div style="text-align:center;">
        <a href="${product.url}" target="_blank"
          style="display:inline-block;background:linear-gradient(135deg,#667eea,#764ba2);
          color:#fff;text-decoration:none;padding:14px 32px;border-radius:50px;
          font-weight:600;font-size:16px;letter-spacing:0.3px;">
          Buy Now →
        </a>
      </div>
    </div>
    <div style="padding:20px;text-align:center;border-top:1px solid rgba(163,177,198,0.3);">
      <p style="margin:0;color:#9ca3af;font-size:12px;">Tracked by PricePulse • You requested this alert for ${product.userEmail}</p>
    </div>
  </div>
</body>
</html>`;

  try {
    await transporter.sendMail({
      from: process.env.EMAIL_FROM || `PricePulse <${process.env.EMAIL_USER}>`,
      to: product.userEmail,
      subject: `🎯 Price Drop Alert! ${product.productName} is now ${formatPrice(product.currentPrice, product.currency)}`,
      html: emailHtml,
    });
    console.log(`Email sent to ${product.userEmail}`);
    return { success: true };
  } catch (error) {
    console.error('Email send error:', error.message);
    return { success: false, reason: error.message };
  }
};

const sendSMSNotification = async (product) => {
  if (!twilioClient) {
    console.warn('Twilio not configured. Skipping SMS.');
    return { success: false, reason: 'Twilio not configured' };
  }
  if (!product.userPhone) {
    return { success: false, reason: 'No phone number provided' };
  }

  try {
    const message = `🎯 PricePulse Alert!\n${product.productName}\nCurrent: ${formatPrice(product.currentPrice, product.currency)}\nTarget: ${formatPrice(product.targetPrice, product.currency)}\nBuy: ${product.url.substring(0, 60)}...`;

    await twilioClient.messages.create({
      body: message,
      from: process.env.TWILIO_PHONE_NUMBER,
      to: product.userPhone,
    });
    console.log(`SMS sent to ${product.userPhone}`);
    return { success: true };
  } catch (error) {
    console.error('SMS send error:', error.message);
    return { success: false, reason: error.message };
  }
};

const sendNotifications = async (product) => {
  const results = {};

  if (product.notifyEmail) {
    results.email = await sendEmailNotification(product);
  }
  if (product.notifySMS && product.userPhone) {
    results.sms = await sendSMSNotification(product);
  }

  return results;
};

module.exports = { sendNotifications, sendEmailNotification, sendSMSNotification };
