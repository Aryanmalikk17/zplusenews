/**
 * YouTube Video Fetcher Utility
 * 
 * This script helps you fetch real video data from your @bizz_short YouTube channel
 * 
 * SETUP:
 * 1. Get YouTube API Key from: https://console.cloud.google.com/
 * 2. Enable YouTube Data API v3
 * 3. Replace 'YOUR_API_KEY' below with your actual key
 * 4. Replace 'YOUR_CHANNEL_ID' with your channel ID
 * 
 * USAGE:
 * node fetch-youtube-videos.js
 */

const https = require('https');
const fs = require('fs');
require('dotenv').config();

// ============ CONFIGURATION ============
const CONFIG = {
    API_KEY: process.env.YT_API_KEY || 'YOUR_API_KEY_HERE', // Prefer .env, fallback to placeholder
    CHANNEL_ID: process.env.YT_CHANNEL_ID || 'YOUR_CHANNEL_ID_HERE', // Prefer .env, fallback to placeholder
    MAX_RESULTS: Number(process.env.YT_MAX_RESULTS || 10)
};

// Category mapping based on keywords
const CATEGORY_KEYWORDS = {
    'Markets': ['stock', 'market', 'sensex', 'nifty', 'trading', 'shares', 'investment'],
    'Startups': ['startup', 'entrepreneur', 'founder', 'funding', 'unicorn', 'new company'],
    'Economy': ['gdp', 'economy', 'economic', 'inflation', 'growth', 'recession'],
    'Energy': ['oil', 'energy', 'power', 'renewable', 'solar', 'electric'],
    'Cryptocurrency': ['crypto', 'bitcoin', 'blockchain', 'cryptocurrency', 'btc', 'ethereum'],
    'Manufacturing': ['manufacturing', 'production', 'factory', 'industry', 'make in india'],
    'E-commerce': ['ecommerce', 'online', 'amazon', 'flipkart', 'shopping', 'retail'],
    'Healthcare': ['health', 'medical', 'pharma', 'hospital', 'medicine', 'healthcare'],
    'Banking': ['bank', 'finance', 'loan', 'credit', 'rbi', 'financial']
};

// ============ FUNCTIONS ============

function categorizeVideo(title, description) {
    const text = (title + ' ' + description).toLowerCase();
    
    for (const [category, keywords] of Object.entries(CATEGORY_KEYWORDS)) {
        if (keywords.some(keyword => text.includes(keyword))) {
            return category;
        }
    }
    
    return 'Markets'; // Default category
}

function formatDuration(isoDuration) {
    // Convert ISO 8601 duration to MM:SS format
    const match = isoDuration.match(/PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/);
    const hours = parseInt(match[1] || 0);
    const minutes = parseInt(match[2] || 0);
    const seconds = parseInt(match[3] || 0);
    
    if (hours > 0) {
        return `${hours}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
    }
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
}

function formatViews(count) {
    if (count >= 1000000) {
        return `${(count / 1000000).toFixed(1)}M`;
    } else if (count >= 1000) {
        return `${(count / 1000).toFixed(1)}K`;
    }
    return count.toString();
}

function formatDate(dateString) {
    const date = new Date(dateString);
    const options = { year: 'numeric', month: 'short', day: 'numeric' };
    return date.toLocaleDateString('en-US', options);
}

async function fetchChannelVideos() {
    return new Promise((resolve, reject) => {
        const url = `https://www.googleapis.com/youtube/v3/search?key=${CONFIG.API_KEY}&channelId=${CONFIG.CHANNEL_ID}&part=snippet,id&order=date&maxResults=${CONFIG.MAX_RESULTS}&type=video`;
        
        https.get(url, (res) => {
            let data = '';
            
            res.on('data', (chunk) => {
                data += chunk;
            });
            
            res.on('end', () => {
                try {
                    const response = JSON.parse(data);
                    if (response.error) {
                        reject(new Error(response.error.message));
                    } else {
                        resolve(response.items);
                    }
                } catch (error) {
                    reject(error);
                }
            });
        }).on('error', (error) => {
            reject(error);
        });
    });
}

async function fetchVideoDetails(videoIds) {
    return new Promise((resolve, reject) => {
        const url = `https://www.googleapis.com/youtube/v3/videos?key=${CONFIG.API_KEY}&id=${videoIds.join(',')}&part=snippet,contentDetails,statistics`;
        
        https.get(url, (res) => {
            let data = '';
            
            res.on('data', (chunk) => {
                data += chunk;
            });
            
            res.on('end', () => {
                try {
                    const response = JSON.parse(data);
                    if (response.error) {
                        reject(new Error(response.error.message));
                    } else {
                        resolve(response.items);
                    }
                } catch (error) {
                    reject(error);
                }
            });
        }).on('error', (error) => {
            reject(error);
        });
    });
}

async function generateVideoDatabase() {
    try {
        console.log('🔍 Fetching videos from @bizz_short...\n');
        
        // Fetch video list
        const videos = await fetchChannelVideos();
        const videoIds = videos.map(v => v.id.videoId);
        
        // Fetch detailed info
        const details = await fetchVideoDetails(videoIds);
        
        // Generate database entries
        const videoDatabase = details.map((video, index) => {
            const snippet = video.snippet;
            const stats = video.statistics;
            const category = categorizeVideo(snippet.title, snippet.description);
            
            return {
                id: (index + 1).toString(),
                title: snippet.title,
                category: category,
                source: 'youtube',
                videoId: video.id,
                thumbnail: `https://img.youtube.com/vi/${video.id}/maxresdefault.jpg`,
                description: snippet.description.substring(0, 150) + '...',
                views: formatViews(parseInt(stats.viewCount)),
                date: formatDate(snippet.publishedAt),
                duration: formatDuration(video.contentDetails.duration),
                featured: index === 0 // First video is featured
            };
        });
        
        // Generate JavaScript code
        const jsCode = `const videoDatabase = ${JSON.stringify(videoDatabase, null, 4)};\n`;
        
        // Save to file
        fs.writeFileSync('video-database-output.js', jsCode);
        
        console.log('✅ Successfully fetched videos!\n');
        console.log('📊 Summary:');
        console.log(`   Total Videos: ${videoDatabase.length}`);
        console.log(`   Categories:`, [...new Set(videoDatabase.map(v => v.category))].join(', '));
        console.log('\n📁 Output saved to: video-database-output.js');
        console.log('\n💡 Copy the content to assets/js/video-manager.js (line 6)\n');
        
        // Display preview
        console.log('📋 Preview of first video:');
        console.log(JSON.stringify(videoDatabase[0], null, 2));
        
    } catch (error) {
        console.error('❌ Error:', error.message);
        console.log('\n📝 Setup Instructions:');
        console.log('1. Get API key: https://console.cloud.google.com/');
        console.log('2. Enable YouTube Data API v3');
        console.log('3. Update CONFIG object in this file');
        console.log('4. Run: node fetch-youtube-videos.js');
    }
}

// ============ MAIN ============

if (CONFIG.API_KEY === 'YOUR_API_KEY_HERE') {
    console.log('⚠️  Please configure the script first!\n');
    console.log('📝 Steps:');
    console.log('1. Create .env in repo root with:');
    console.log('   YT_API_KEY=YOUR_KEY');
    console.log('   YT_CHANNEL_ID=YOUR_CHANNEL_ID');
    console.log('2. Or edit CONFIG in this file and replace placeholders');
    console.log('3. Run: node utils/fetch-youtube-videos.js\n');
    console.log('🔗 Get API key: https://console.cloud.google.com/');
    console.log('🔗 Find channel ID: https://www.youtube.com/account_advanced\n');
} else {
    generateVideoDatabase();
}
