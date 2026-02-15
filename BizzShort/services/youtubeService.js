/**
 * YouTube Service
 * Fetches video metadata from YouTube Data API v3
 */
const axios = require('axios');

const YOUTUBE_API_URL = 'https://www.googleapis.com/youtube/v3';

/**
 * Resolve a YouTube channel handle (e.g. @zplusenews) to a channel ID
 * @param {string} handle - Channel handle or URL
 * @returns {string} Channel ID
 */
async function resolveChannelId(handle) {
    const apiKey = process.env.YOUTUBE_API_KEY;
    if (!apiKey) throw new Error('YOUTUBE_API_KEY is not configured');

    // Clean handle: extract from URL or strip @
    let cleanHandle = handle;
    const handleMatch = handle.match(/@([\w-]+)/);
    if (handleMatch) cleanHandle = handleMatch[1];

    // Try forHandle first (newer API)
    const response = await axios.get(`${YOUTUBE_API_URL}/channels`, {
        params: {
            part: 'id,snippet',
            forHandle: cleanHandle,
            key: apiKey,
        },
    });

    if (response.data.items && response.data.items.length > 0) {
        return response.data.items[0].id;
    }

    // Fallback: try forUsername
    const response2 = await axios.get(`${YOUTUBE_API_URL}/channels`, {
        params: {
            part: 'id,snippet',
            forUsername: cleanHandle,
            key: apiKey,
        },
    });

    if (response2.data.items && response2.data.items.length > 0) {
        return response2.data.items[0].id;
    }

    throw new Error(`Could not resolve channel: ${handle}`);
}

/**
 * Fetch ALL video IDs from a YouTube channel (paginated)
 * @param {string} channelId - YouTube channel ID
 * @param {number} maxResults - Max videos to fetch (default: 500)
 * @returns {Array<string>} Array of video IDs
 */
async function fetchChannelVideoIds(channelId, maxResults = 500) {
    const apiKey = process.env.YOUTUBE_API_KEY;
    if (!apiKey) throw new Error('YOUTUBE_API_KEY is not configured');

    const videoIds = [];
    let nextPageToken = null;

    do {
        const params = {
            part: 'id',
            channelId: channelId,
            type: 'video',
            order: 'date',
            maxResults: 50, // API maximum per page
            key: apiKey,
        };
        if (nextPageToken) params.pageToken = nextPageToken;

        const response = await axios.get(`${YOUTUBE_API_URL}/search`, { params });

        if (response.data.items) {
            for (const item of response.data.items) {
                if (item.id?.videoId) {
                    videoIds.push(item.id.videoId);
                }
            }
        }

        nextPageToken = response.data.nextPageToken;

        // Safety: don't exceed maxResults
        if (videoIds.length >= maxResults) {
            break;
        }
    } while (nextPageToken);

    console.log(`[YouTube] Found ${videoIds.length} videos from channel ${channelId}`);
    return videoIds.slice(0, maxResults);
}

/**
 * Fetch video details from YouTube by video ID
 * @param {string} videoId - The YouTube video ID
 * @returns {Object} Video metadata
 */
async function fetchVideoDetails(videoId) {
    const apiKey = process.env.YOUTUBE_API_KEY;
    if (!apiKey) {
        throw new Error('YOUTUBE_API_KEY is not configured in environment variables');
    }

    const response = await axios.get(`${YOUTUBE_API_URL}/videos`, {
        params: {
            part: 'snippet,contentDetails,statistics',
            id: videoId,
            key: apiKey,
        },
    });

    const items = response.data.items;
    if (!items || items.length === 0) {
        throw new Error(`No video found with ID: ${videoId}`);
    }

    const video = items[0];
    const snippet = video.snippet;
    const stats = video.statistics;
    const contentDetails = video.contentDetails;

    const duration = parseDuration(contentDetails.duration);

    return {
        videoId,
        title: snippet.title,
        description: snippet.description,
        thumbnail: snippet.thumbnails.maxres?.url
            || snippet.thumbnails.high?.url
            || snippet.thumbnails.medium?.url
            || snippet.thumbnails.default?.url,
        channelTitle: snippet.channelTitle,
        publishedAt: snippet.publishedAt,
        duration,
        views: stats.viewCount || '0',
        tags: snippet.tags || [],
    };
}

/**
 * Fetch details for multiple videos at once (batch, up to 50 per call)
 * @param {Array<string>} videoIds - Array of video IDs
 * @returns {Array<Object>} Array of video metadata
 */
async function fetchMultipleVideoDetails(videoIds) {
    const apiKey = process.env.YOUTUBE_API_KEY;
    if (!apiKey) throw new Error('YOUTUBE_API_KEY is not configured');

    const results = [];

    // Process in batches of 50 (API limit)
    for (let i = 0; i < videoIds.length; i += 50) {
        const batch = videoIds.slice(i, i + 50);
        const response = await axios.get(`${YOUTUBE_API_URL}/videos`, {
            params: {
                part: 'snippet,contentDetails,statistics',
                id: batch.join(','),
                key: apiKey,
            },
        });

        if (response.data.items) {
            for (const video of response.data.items) {
                const snippet = video.snippet;
                const stats = video.statistics;
                const contentDetails = video.contentDetails;

                results.push({
                    videoId: video.id,
                    title: snippet.title,
                    description: snippet.description,
                    thumbnail: snippet.thumbnails.maxres?.url
                        || snippet.thumbnails.high?.url
                        || snippet.thumbnails.medium?.url
                        || snippet.thumbnails.default?.url,
                    channelTitle: snippet.channelTitle,
                    publishedAt: snippet.publishedAt,
                    duration: parseDuration(contentDetails.duration),
                    views: stats.viewCount || '0',
                    tags: snippet.tags || [],
                });
            }
        }

        console.log(`[YouTube] Fetched details batch ${Math.floor(i / 50) + 1}: ${results.length} videos so far`);
    }

    return results;
}

/**
 * Parse ISO 8601 duration to human-readable string
 */
function parseDuration(iso) {
    if (!iso) return '0:00';
    const match = iso.match(/PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/);
    if (!match) return '0:00';

    const hours = parseInt(match[1] || '0', 10);
    const minutes = parseInt(match[2] || '0', 10);
    const seconds = parseInt(match[3] || '0', 10);

    if (hours > 0) {
        return `${hours}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
    }
    return `${minutes}:${String(seconds).padStart(2, '0')}`;
}

module.exports = {
    resolveChannelId,
    fetchChannelVideoIds,
    fetchVideoDetails,
    fetchMultipleVideoDetails,
};
