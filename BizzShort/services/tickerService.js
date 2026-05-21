const axios = require('axios');
const NodeCache = require('node-cache');
const Article = require('../models/Article');
const Video = require('../models/Video');
const mongoose = require('mongoose');

// Cache for 10 minutes (600 seconds)
const tickerCache = new NodeCache({ stdTTL: 600, checkperiod: 60 });
const CACHE_KEY = 'live_ticker_feed';

// Baseline values for mock/fallback rates
const BASELINES = {
    nifty: { price: 24500, prevClose: 24450 },
    sensex: { price: 80500, prevClose: 80600 },
    gold: { price: 72500, prevClose: 72400 },
    silver: { price: 91000, prevClose: 91300 },
    petrol: { price: 94.72, prevClose: 94.68 },
    diesel: { price: 87.62, prevClose: 87.65 }
};

/**
 * Generate fluctuating mock data based on baseline
 */
function getFluctuatingMock(baseline, decimalPlaces = 2) {
    const factor = 1 + (Math.random() * 0.01 - 0.005); // +/- 0.5% fluctuation
    const price = parseFloat((baseline.price * factor).toFixed(decimalPlaces));
    const prevClose = baseline.prevClose;
    const change = parseFloat((price - prevClose).toFixed(decimalPlaces));
    const percentage = parseFloat(((change / prevClose) * 100).toFixed(2));
    return {
        price,
        change,
        percentage,
        up: change >= 0
    };
}

/**
 * Fetch Yahoo Finance chart data safely
 */
async function fetchYahooStock(symbol, baseline) {
    try {
        const response = await axios.get(`https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(symbol)}`, {
            timeout: 5000,
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
            }
        });
        const result = response.data?.chart?.result?.[0];
        if (result && result.meta) {
            const price = parseFloat(result.meta.regularMarketPrice);
            const prevClose = parseFloat(result.meta.chartPreviousClose || result.meta.previousClose || price);
            const change = parseFloat((price - prevClose).toFixed(2));
            const percentage = parseFloat(((change / prevClose) * 100).toFixed(2));
            return {
                price,
                change,
                percentage,
                up: change >= 0
            };
        }
        throw new Error('Invalid structure from Yahoo Finance');
    } catch (err) {
        console.warn(`⚠️ Yahoo Finance fetch failed for ${symbol}, using fluctuating mock:`, err.message);
        return getFluctuatingMock(baseline, 2);
    }
}

/**
 * Gather all ticker items from database safely
 */
async function getDbTickerItems() {
    const civic = [];
    const general = [];
    const commodity = [];
    const financial = [];

    // If database is not connected, return empty arrays to avoid blocking
    if (mongoose.connection.readyState !== 1) {
        console.warn('⚠️ MongoDB not connected, returning empty database ticker arrays.');
        return { civic, general, commodity, financial };
    }

    try {
        // Find isTicker: true articles
        const articles = await Article.find({ isTicker: true, status: 'PUBLISHED' })
            .sort({ publishedAt: -1 })
            .limit(20)
            .lean();

        // Find isTicker: true videos
        const videos = await Video.find({ isTicker: true })
            .sort({ createdAt: -1 })
            .limit(20)
            .lean();

        const allItems = [
            ...articles.map(a => ({ id: a._id, title: a.title, type: 'article', slug: a.slug, category: a.category, tickerCategory: a.tickerCategory || 'general' })),
            ...videos.map(v => ({ id: v._id, title: v.title, type: 'video', videoId: v.videoId, category: v.category, tickerCategory: v.tickerCategory || 'general' }))
        ];

        allItems.forEach(item => {
            const cleanItem = {
                id: item.id,
                title: item.title,
                type: item.type,
                slug: item.slug,
                videoId: item.videoId,
                category: item.category
            };
            
            if (item.tickerCategory === 'civic') {
                civic.push(cleanItem);
            } else if (item.tickerCategory === 'commodity') {
                commodity.push(cleanItem);
            } else if (item.tickerCategory === 'financial') {
                financial.push(cleanItem);
            } else {
                general.push(cleanItem);
            }
        });
    } catch (err) {
        console.error('Error fetching database ticker items:', err.message);
    }

    return { civic, general, commodity, financial };
}

/**
 * Build unified ticker payload
 */
async function getLiveTickerPayload() {
    // 1. Check cache first
    const cachedData = tickerCache.get(CACHE_KEY);
    if (cachedData) {
        return cachedData;
    }

    console.log('🔄 Generating new live ticker payload...');

    // 2. Fetch stocks in parallel
    const [niftyStock, sensexStock] = await Promise.all([
        fetchYahooStock('^NSEI', BASELINES.nifty),
        fetchYahooStock('^BSESN', BASELINES.sensex)
    ]);

    const stocks = [
        { name: 'Nifty 50', ...niftyStock },
        { name: 'Sensex', ...sensexStock }
    ];

    // 3. Generate fluctuating commodity prices
    const goldData = getFluctuatingMock(BASELINES.gold, 0);
    const silverData = getFluctuatingMock(BASELINES.silver, 0);
    const commodities = [
        { name: 'Gold 24K (10g)', ...goldData },
        { name: 'Silver (1kg)', ...silverData }
    ];

    // 4. Generate fluctuating fuel rates
    const petrolData = getFluctuatingMock(BASELINES.petrol, 2);
    const dieselData = getFluctuatingMock(BASELINES.diesel, 2);
    const fuel = [
        { name: 'Petrol (Delhi)', ...petrolData },
        { name: 'Diesel (Delhi)', ...dieselData }
    ];

    // 5. Gather database ticker updates
    const dbItems = await getDbTickerItems();

    const payload = {
        success: true,
        timestamp: new Date().toISOString(),
        data: {
            stocks,
            commodities,
            fuel,
            civic: dbItems.civic,
            general: dbItems.general,
            // Include db-specific updates in commodities and financial if any exist
            dbCommodity: dbItems.commodity,
            dbFinancial: dbItems.financial
        }
    };

    // Cache the result for 10 minutes
    tickerCache.set(CACHE_KEY, payload);
    return payload;
}

module.exports = {
    getLiveTickerPayload,
    tickerCache,
    CACHE_KEY
};
