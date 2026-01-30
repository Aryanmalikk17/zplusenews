/**
 * CurrentsAPI Service
 * Handles all interactions with the Currents News API
 * Includes caching to minimize API calls
 */

const axios = require('axios');

const CURRENTS_API_URL = 'https://api.currentsapi.services/v1';
const API_KEY = process.env.CURRENTS_API_KEY;

// In-memory cache with TTL
const cache = new Map();
const CACHE_TTL = 60 * 60 * 1000; // 60 minutes (1 hour) - limits to ~20 API calls/day

/**
 * Get cached data if valid
 */
function getCached(key) {
    if (cache.has(key)) {
        const { data, timestamp } = cache.get(key);
        if (Date.now() - timestamp < CACHE_TTL) {
            console.log(`[CurrentsAPI] Cache hit: ${key}`);
            return data;
        }
        cache.delete(key);
    }
    return null;
}

/**
 * Set cache with timestamp
 */
function setCache(key, data) {
    cache.set(key, { data, timestamp: Date.now() });
    console.log(`[CurrentsAPI] Cached: ${key}`);
}

/**
 * Map ZPluse categories to CurrentsAPI categories
 */
const CATEGORY_MAP = {
    'technology': 'technology',
    'tech': 'technology',
    'economics': 'business',
    'economy': 'business',
    'business': 'business',
    'polity': 'politics',
    'politics': 'politics',
    'environment': 'environment',
    'sports': 'sports',
    'international': 'world',
    'world': 'world',
    'national': 'regional',
    'india': 'regional',
    'positive': 'general',
    'state': 'regional',
    'entertainment': 'entertainment',
    'health': 'health',
    'science': 'science',
};

/**
 * Get the CurrentsAPI category for a ZPluse category
 */
function mapCategory(category) {
    const key = category?.toLowerCase()?.trim();
    return CATEGORY_MAP[key] || 'general';
}

/**
 * Transform CurrentsAPI article to ZPluse format
 */
function transformArticle(article, categoryOverride = null) {
    return {
        _id: article.id || `currents_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        title: article.title,
        slug: article.id,
        excerpt: article.description?.substring(0, 200) || '',
        content: article.description || '',
        image: article.image && article.image !== 'None' 
            ? article.image 
            : 'https://images.unsplash.com/photo-1504711434969-e33886168f5c?w=800&q=80',
        author: article.author || 'News Agency',
        createdAt: article.published ? new Date(article.published) : new Date(),
        category: categoryOverride || article.category?.[0] || 'general',
        source: {
            name: extractDomain(article.url),
            url: article.url
        },
        readTime: estimateReadTime(article.description),
        isExternal: true,
        views: Math.floor(Math.random() * 1000) + 100, // Simulated views
    };
}

/**
 * Extract domain name from URL
 */
function extractDomain(url) {
    try {
        const domain = new URL(url).hostname.replace('www.', '');
        return domain.charAt(0).toUpperCase() + domain.slice(1);
    } catch {
        return 'External Source';
    }
}

/**
 * Estimate read time based on content length
 */
function estimateReadTime(content) {
    if (!content) return '2 min read';
    const words = content.split(/\s+/).length;
    const minutes = Math.ceil(words / 200);
    return `${Math.max(2, minutes)} min read`;
}

/**
 * Get latest news from CurrentsAPI
 */
async function getLatestNews(options = {}) {
    if (!API_KEY) {
        console.warn('[CurrentsAPI] No API key configured');
        return [];
    }

    const cacheKey = `latest_${options.language || 'en'}_${options.category || 'all'}`;
    const cached = getCached(cacheKey);
    if (cached) return cached;

    try {
        const params = {
            apiKey: API_KEY,
            language: options.language || 'en',
        };

        if (options.category) {
            params.category = mapCategory(options.category);
        }

        console.log(`[CurrentsAPI] Fetching latest news...`, params);
        
        const response = await axios.get(`${CURRENTS_API_URL}/latest-news`, { 
            params,
            timeout: 10000 
        });

        const articles = (response.data.news || []).map(a => transformArticle(a, options.category));
        setCache(cacheKey, articles);
        
        return articles;
    } catch (error) {
        console.error('[CurrentsAPI] Error fetching latest news:', error.message);
        throw error;
    }
}

/**
 * Search news by keywords and filters
 */
async function searchNews(keywords = '', options = {}) {
    if (!API_KEY) {
        console.warn('[CurrentsAPI] No API key configured');
        return [];
    }

    const cacheKey = `search_${keywords}_${options.category || 'all'}_${options.language || 'en'}`;
    const cached = getCached(cacheKey);
    if (cached) return cached;

    try {
        const params = {
            apiKey: API_KEY,
            language: options.language || 'en',
        };

        if (keywords) {
            params.keywords = keywords;
        }

        if (options.category) {
            params.category = mapCategory(options.category);
        }

        if (options.country) {
            params.country = options.country;
        }

        console.log(`[CurrentsAPI] Searching news...`, params);

        const response = await axios.get(`${CURRENTS_API_URL}/search`, { 
            params,
            timeout: 10000 
        });

        const articles = (response.data.news || []).map(a => transformArticle(a, options.category));
        setCache(cacheKey, articles);
        
        return articles;
    } catch (error) {
        console.error('[CurrentsAPI] Error searching news:', error.message);
        throw error;
    }
}

/**
 * Get news by category
 */
async function getNewsByCategory(category, options = {}) {
    if (!API_KEY) {
        console.warn('[CurrentsAPI] No API key configured');
        return [];
    }

    const currentsCategory = mapCategory(category);
    const cacheKey = `category_${currentsCategory}_${options.language || 'en'}`;
    const cached = getCached(cacheKey);
    if (cached) return cached;

    try {
        const params = {
            apiKey: API_KEY,
            language: options.language || 'en',
            category: currentsCategory,
        };

        // Add category-specific keywords for better results
        const categoryKeywords = {
            'positive': 'achievement success breakthrough innovation',
            'national': 'India Indian government',
            'state': 'state local regional India',
        };

        if (categoryKeywords[category?.toLowerCase()]) {
            params.keywords = categoryKeywords[category.toLowerCase()];
        }

        console.log(`[CurrentsAPI] Fetching category: ${category}`, params);

        const response = await axios.get(`${CURRENTS_API_URL}/search`, { 
            params,
            timeout: 10000 
        });

        const articles = (response.data.news || []).map(a => transformArticle(a, category));
        setCache(cacheKey, articles);
        
        return articles;
    } catch (error) {
        console.error(`[CurrentsAPI] Error fetching category ${category}:`, error.message);
        throw error;
    }
}

/**
 * Clear the cache (useful for testing)
 */
function clearCache() {
    cache.clear();
    console.log('[CurrentsAPI] Cache cleared');
}

/**
 * Get cache stats
 */
function getCacheStats() {
    return {
        size: cache.size,
        keys: Array.from(cache.keys())
    };
}

module.exports = {
    getLatestNews,
    searchNews,
    getNewsByCategory,
    clearCache,
    getCacheStats,
    mapCategory,
    CATEGORY_MAP
};
