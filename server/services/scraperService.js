const axios = require('axios');
const cheerio = require('cheerio');

const USER_AGENTS = [
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.3 Safari/605.1.15',
  'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36',
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:123.0) Gecko/20100101 Firefox/123.0',
];

const getRandomUserAgent = () => USER_AGENTS[Math.floor(Math.random() * USER_AGENTS.length)];

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

const fetchPage = async (url, retries = 3) => {
  const scraperApiKey = process.env.SCRAPER_API_KEY;
  const targetUrl = scraperApiKey
    ? `http://api.scraperapi.com?api_key=${scraperApiKey}&url=${encodeURIComponent(url)}`
    : url;

  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      await sleep(Math.random() * 1500 + 500);
      const response = await axios.get(targetUrl, {
        headers: {
          'User-Agent': getRandomUserAgent(),
          'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8',
          'Accept-Language': 'en-IN,en-GB;q=0.9,en;q=0.8',
          'Accept-Encoding': 'gzip, deflate, br',
          'Connection': 'keep-alive',
          'Upgrade-Insecure-Requests': '1',
          'Cache-Control': 'max-age=0',
          'DNT': '1',
        },
        timeout: 30000,
        maxRedirects: 5,
      });
      return response.data;
    } catch (error) {
      if (attempt === retries) throw error;
      await sleep(attempt * 2000);
    }
  }
};

const parsePrice = (text) => {
  if (!text) return null;
  const cleaned = text.replace(/[₹,\s]/g, '').replace(/[^0-9.]/g, '');
  const price = parseFloat(cleaned);
  return isNaN(price) ? null : price;
};

const scrapeAmazon = async (url) => {
  const html = await fetchPage(url);
  const $ = cheerio.load(html);

  const productName =
    $('#productTitle').text().trim() ||
    $('h1.a-size-large').text().trim() ||
    $('[data-feature-name="title"] h1').text().trim();

  const priceSelectors = [
    '#priceblock_ourprice',
    '#priceblock_dealprice',
    '.a-price.a-text-price.a-size-medium.apexPriceToPay .a-offscreen',
    '.a-price[data-a-color="price"] .a-offscreen',
    '#corePrice_feature_div .a-price .a-offscreen',
    '.a-price .a-offscreen',
    '#apex_desktop .a-price .a-offscreen',
  ];

  let currentPrice = null;
  for (const selector of priceSelectors) {
    const priceText = $(selector).first().text().trim();
    currentPrice = parsePrice(priceText);
    if (currentPrice) break;
  }

  const originalPriceText =
    $('[data-feature-name="priceInsideBuyBox"] .a-text-strike').text().trim() ||
    $('.priceBlockStrikePriceString').text().trim() ||
    $('.a-price.a-text-price[data-a-strike="true"] .a-offscreen').first().text().trim();
  const originalPrice = parsePrice(originalPriceText) || currentPrice;

  const productImage =
    $('#landingImage').attr('src') ||
    $('#imgBlkFront').attr('src') ||
    $('img[data-old-hires]').attr('src') ||
    '';

  return { productName, currentPrice, originalPrice, productImage, currency: '₹' };
};

const scrapeFlipkart = async (url) => {
  const html = await fetchPage(url);
  const $ = cheerio.load(html);

  const productName =
    $('h1.yhB1nd').text().trim() ||
    $('span.B_NuCI').text().trim() ||
    $('h1[class*="title"]').text().trim() ||
    $('h1').first().text().trim();

  const priceSelectors = [
    '._30jeq3._16Jk6d',
    '._30jeq3',
    'div[class*="CEmiEU"] div[class*="Nx9bqj"]',
    '._1_WHN1',
    '.aMaAEs ._30jeq3',
  ];

  let currentPrice = null;
  for (const selector of priceSelectors) {
    const priceText = $(selector).first().text().trim();
    currentPrice = parsePrice(priceText);
    if (currentPrice) break;
  }

  const originalPriceText =
    $('._3I9_wc._2p6lqe').text().trim() ||
    $('._3I9_wc').text().trim() ||
    $('._2p6lqe').text().trim();
  const originalPrice = parsePrice(originalPriceText) || currentPrice;

  const productImage =
    $('img._396cs4').attr('src') ||
    $('img[class*="DByuf4"]').attr('src') ||
    $('img._2r_T1I').attr('src') ||
    '';

  return { productName, currentPrice, originalPrice, productImage, currency: '₹' };
};

const scrapeMyntra = async (url) => {
  const html = await fetchPage(url);
  const $ = cheerio.load(html);

  const productName =
    $('h1.pdp-title').text().trim() ||
    $('.pdp-name').text().trim() ||
    $('h1.title-info-title').text().trim() ||
    $('h1').first().text().trim();

  const priceSelectors = [
    '.pdp-price strong',
    '.pdp-discount-container .pdp-price strong',
    'span[class*="pdp-price"]',
    '.common-progressiveImage img',
  ];

  let currentPrice = null;
  for (const selector of priceSelectors) {
    const priceText = $(selector).first().text().trim();
    currentPrice = parsePrice(priceText);
    if (currentPrice) break;
  }

  const originalPriceText =
    $('.pdp-mrp s').text().trim() ||
    $('span.pdp-mrp').text().trim();
  const originalPrice = parsePrice(originalPriceText) || currentPrice;

  const productImage =
    $('img.image-grid-image').attr('src') ||
    $('.image-grid-imageContainer img').attr('src') ||
    '';

  return { productName, currentPrice, originalPrice, productImage, currency: '₹' };
};

const detectPlatform = (url) => {
  const lower = url.toLowerCase();
  if (lower.includes('amazon.in') || lower.includes('amazon.com')) return 'amazon';
  if (lower.includes('flipkart.com')) return 'flipkart';
  if (lower.includes('myntra.com')) return 'myntra';
  return 'unknown';
};

const scrapeProduct = async (url) => {
  const platform = detectPlatform(url);

  try {
    let result;
    switch (platform) {
      case 'amazon':
        result = await scrapeAmazon(url);
        break;
      case 'flipkart':
        result = await scrapeFlipkart(url);
        break;
      case 'myntra':
        result = await scrapeMyntra(url);
        break;
      default:
        throw new Error(`Unsupported platform for URL: ${url}`);
    }
    return { ...result, platform };
  } catch (error) {
    throw new Error(`Scraping failed for ${platform}: ${error.message}`);
  }
};

module.exports = { scrapeProduct, detectPlatform };
