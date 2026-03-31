# ● PricePulse
> **A sleek, brutalist web application that tracks real-time drops in e-commerce product pricing.**

![PricePulse UI](https://img.shields.io/badge/UI-Brutalist-black?style=flat-square) ![MongoDB](https://img.shields.io/badge/MongoDB-Atlas-47A248?style=flat-square&logo=mongodb) ![React](https://img.shields.io/badge/React-Vite-61DAFB?style=flat-square&logo=react) ![ScraperAPI](https://img.shields.io/badge/ScraperAPI-Connected-FF6600?style=flat-square)

PricePulse monitors target URLs from Amazon, Flipkart, and Myntra using advanced proxy-evasion middleware. Setting a "Target Price" initiates a background Cron tracker that pushes instant Email / SMS notifications when the deal drops below your threshold.

---

## ⚡ Features

- **High-Contrast Brutalist UI**: Complete black-and-white, border-heavy responsive interface built with React + Vite. No emojis, no gradients, no bloat.
- **Enterprise Web Scraping**: Integrates **ScraperAPI** to seamlessly bypass Amazon/电商 bot protections, CAPTCHAs, and IP bans.
- **Background Cron Engine**: Runs autonomous price-checks at set intervals, logging dynamic historical data to generate Price History Sparklines for each product.
- **Instant Triggers**: Fully hooked into Nodemailer (Gmail App Passwords) and Twilio logic for immediate Email and SMS alerts upon target hit.

## 🛠 Tech Stack 

### Frontend (Client)
- React.js + Vite
- Fluid CSS Grid System (Fully Mobile Optimized)
- `react-hot-toast` for minimalist popup notifications

### Backend (Server)
- Node.js & Express.js
- `mongoose` (MongoDB Atlas Data Modeling)
- `axios` & `cheerio` (ScraperAPI Integration)
- `node-cron` & `nodemailer` (Automated Polling & Notifications)

---

## 🚀 Getting Started

To get the application running locally:

### 1. Database & Scraping Configuration
Inside the `/server` directory, create a `.env` file referencing `.env.example`.
You will need:
- Your own **MongoDB Atlas** Connection string.
- Your own **ScraperAPI Key** (Free 5000 requests/month).
- Your own **Gmail App Password** for sending outbound alerts.

### 2. Run the Backend Middleware
```bash
cd server
npm install
npm start
```
*The server will boot up on `localhost:5000` and init the MongoDB MCP connection.*

### 3. Run the Frontend Interface
```bash
cd client
npm install
npm run dev
```
*The strict B&W Tracker UI will launch on `localhost:3000`.*

---
Built with strict minimalism and reliable backend persistence by [mew228](https://github.com/mew228).
