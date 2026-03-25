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
    'national': 'general', // Changed from 'regional' for better results
    'india': 'general',
    'positive': 'general',
    'state': 'general', // Changed from 'regional' for better results
    'entertainment': 'entertainment',
    'health': 'health',
    'science': 'science',
    'fake-news': 'general', // Now fetches general news for fact-checking
};

/**
 * Category-specific keywords to improve search relevance
 * These are used with the search API for better targeting
 */
const CATEGORY_KEYWORDS = {
    'positive': 'achievement success breakthrough innovation inspiring good news positive',
    'national': 'India government Modi parliament Delhi Indian policy',
    'state': 'India state government regional local development',
    'technology': 'AI technology startup innovation tech digital software',
    'business': 'market stock economy company CEO investment startup',
    'sports': 'cricket football IPL sports Olympics match tournament',
    'international': 'global world international UN USA China Europe',
    'environment': 'climate environment green sustainable carbon pollution',
    'polity': 'election government parliament democracy politics policy',
    'fake-news': 'fact check misinformation verified truth debunk',
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
 * Get news by category - Simplified to avoid rate limiting
 * Makes only ONE API call per category
 */
async function getNewsByCategory(category, options = {}) {
    if (!API_KEY) {
        console.warn('[CurrentsAPI] No API key configured');
        return [];
    }

    // Check if we're rate limited
    if (isRateLimited()) {
        console.warn('[CurrentsAPI] Rate limited, returning cached or empty');
        return getCached(`category_${category?.toLowerCase()}_${options.language || 'en'}`) || [];
    }

    const categoryLower = category?.toLowerCase()?.trim();
    const currentsCategory = mapCategory(category);
    const keywords = CATEGORY_KEYWORDS[categoryLower] || '';
    const cacheKey = `category_${categoryLower}_${options.language || 'en'}`;
    const cached = getCached(cacheKey);
    if (cached) return cached;

    try {
        // Use ONLY keyword search if we have keywords, otherwise use category endpoint
        // This reduces from 3 API calls to 1
        let params = {
            apiKey: API_KEY,
            language: options.language || 'en',
        };

        let endpoint = `${CURRENTS_API_URL}/latest-news`;

        if (keywords) {
            // Use search endpoint with keywords for better targeting
            endpoint = `${CURRENTS_API_URL}/search`;
            params.keywords = keywords;
        } else {
            // Use latest-news with category filter
            params.category = currentsCategory;
        }

        console.log(`[CurrentsAPI] Fetching "${category}"...`, { endpoint: endpoint.split('/').pop(), ...params, apiKey: '***' });

        const response = await axios.get(endpoint, {
            params,
            timeout: 15000
        });

        const articles = (response.data.news || []).map(a => transformArticle(a, category));
        
        // Only cache if we got results
        if (articles.length > 0) {
            setCache(cacheKey, articles);
        }
        
        console.log(`[CurrentsAPI] Fetched ${articles.length} articles for "${category}"`);
        return articles;

    } catch (error) {
        // Handle rate limiting
        if (error.response?.status === 429) {
            console.warn('[CurrentsAPI] Rate limited! Waiting before next request...');
            setRateLimited();
            return [];
        }
        
        console.error(`[CurrentsAPI] Error fetching category ${category}:`, error.message);
        return []; // Return empty instead of throwing
    }
}

// Rate limit tracking
let rateLimitedUntil = 0;

function isRateLimited() {
    return Date.now() < rateLimitedUntil;
}

function setRateLimited() {
    // Wait 5 minutes before trying again after a rate limit
    rateLimitedUntil = Date.now() + (5 * 60 * 1000);
    console.log('[CurrentsAPI] Rate limit set, will retry in 5 minutes');
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
