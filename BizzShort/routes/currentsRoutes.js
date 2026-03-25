/**
 * CurrentsAPI Routes
 * Proxy routes to fetch news from CurrentsAPI
 * Hides API key from client and provides caching
 */

const express = require('express');
const router = express.Router();
const currentsAPI = require('../services/currentsAPI');

/**
 * GET /api/news/latest
 * Get latest news articles
 * Query params: language (default: en), category (optional)
 */
router.get('/latest', async (req, res) => {
    try {
        const { language = 'en', category } = req.query;
        const articles = await currentsAPI.getLatestNews({ language, category });
        
        res.json({
            success: true,
            count: articles.length,
            data: articles
        });
    } catch (error) {
        console.error('[News Routes] Error fetching latest:', error.message);
        res.status(500).json({
            success: false,
            error: 'Failed to fetch latest news',
            message: error.message
        });
    }
});

/**
 * GET /api/news/search
 * Search news by keywords
 * Query params: keywords, category, language, country
 */
router.get('/search', async (req, res) => {
    try {
        const { keywords, category, language = 'en', country } = req.query;
        const articles = await currentsAPI.searchNews(keywords, { category, language, country });
        
        res.json({
            success: true,
            count: articles.length,
            data: articles
        });
    } catch (error) {
        console.error('[News Routes] Error searching:', error.message);
        res.status(500).json({
            success: false,
            error: 'Failed to search news',
            message: error.message
        });
    }
});

/**
 * GET /api/news/category/:category
 * Get news by category
 * Params: category (technology, business, sports, etc.)
 * Query params: language (default: en)
 */
router.get('/category/:category', async (req, res) => {
    try {
        const { category } = req.params;
        const { language = 'en' } = req.query;
        
        const articles = await currentsAPI.getNewsByCategory(category, { language });
        
        res.json({
            success: true,
            category: category,
            count: articles.length,
            data: articles
        });
    } catch (error) {
        console.error(`[News Routes] Error fetching category ${req.params.category}:`, error.message);
        res.status(500).json({
            success: false,
            error: `Failed to fetch ${req.params.category} news`,
            message: error.message
        });
    }
});

/**
 * GET /api/news/trending
 * Get trending news (combination of latest from multiple categories)
 */
router.get('/trending', async (req, res) => {
    try {
        const { language = 'en' } = req.query;
        
        // Get latest news as trending
        const articles = await currentsAPI.getLatestNews({ language });
        
        // Sort by simulated popularity (views)
        const trending = articles
            .sort((a, b) => (b.views || 0) - (a.views || 0))
            .slice(0, 10);
        
        res.json({
            success: true,
            count: trending.length,
            data: trending
        });
    } catch (error) {
        console.error('[News Routes] Error fetching trending:', error.message);
        res.status(500).json({
            success: false,
            error: 'Failed to fetch trending news',
            message: error.message
        });
    }
});

/**
 * GET /api/news/cache/stats
 * Get cache statistics (for debugging)
 */
router.get('/cache/stats', (req, res) => {
    const stats = currentsAPI.getCacheStats();
    res.json({
        success: true,
        cache: stats
    });
});

/**
 * POST /api/news/cache/clear
 * Clear the cache (admin only in production)
 */
router.post('/cache/clear', (req, res) => {
    currentsAPI.clearCache();
    res.json({
        success: true,
        message: 'Cache cleared'
    });
});

module.exports = router;
