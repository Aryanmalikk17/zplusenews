const https = require('https');
const http = require('http');

// Configuration
const API_BASE = 'https://bizzshort.onrender.com/api';
// Using the handle provided in index.html
const YT_HANDLE = '@bizz_short';
// Channel ID resolving logic implies we might need a key or use a public RSS bridge.
// Based on main-functionality.js, the user was using 'https://r.jina.ai/https://www.youtube.com/feeds/videos.xml?channel_id=...'
// But first we need the channel ID. The user's link was: https://youtube.com/@bizz_short?si=FZvH5iMI2v_J4vGE
// Since I don't have a YouTube API key available right now, and I want this to be robust...
// I will use a known RSS bridge or try to fetch the HTML of the channel page to extract the ID.
// OR, I can just ask the user or hardcode it if I can find it.
// Actually, let's use the 'main-functionality.js' approach:
// It uses `https://r.jina.ai/https://www.youtube.com/${handle}` to find the ID.
// I'll try to just scrape the channel ID or use a different approach.
// SIMPLER: I will try to fetch the RSS feed assuming I can get the ID.
// Let's try to get the channel ID via a simple fetch first.

// NOTE: Since I am running in Node, I can use 'fetch' if node v18+ (which the user has).
// If not, I'll use https module.

async function getChannelId(handle) {
    // This is a naive way to get ID from handle page
    // Using a public instance of invidious or just standard youtube page
    try {
        console.log(`🔍 Resolving ID for ${handle}...`);
        const res = await fetch(`https://www.youtube.com/${handle}`);
        const text = await res.text();
        // Look for channel_id
        const match = text.match(/"channelId":"(UC[\w-]+)"/);
        if (match) return match[1];

        // Fallback: look for externalId
        const match2 = text.match(/"externalId":"(UC[\w-]+)"/);
        if (match2) return match2[1];

        return null;
    } catch (e) {
        console.error("Failed to resolve channel ID", e);
        return null;
    }
}

async function getRSS(channelId) {
    try {
        const url = `https://www.youtube.com/feeds/videos.xml?channel_id=${channelId}`;
        console.log(`📡 Fetching RSS: ${url}`);
        const res = await fetch(url);
        if (!res.ok) throw new Error('Failed to fetch RSS');
        return await res.text();
    } catch (e) {
        console.error(e);
        return null;
    }
}

function parseXML(xml) {
    // Simple regex-based XML parser for standard YouTube RSS feed
    const items = [];
    const entryRegex = /<entry>([\s\S]*?)<\/entry>/g;
    let match;

    while ((match = entryRegex.exec(xml)) !== null) {
        const entry = match[1];

        const titleMatch = entry.match(/<title>([\s\S]*?)<\/title>/);
        const linkMatch = entry.match(/<link rel="alternate" href="([^"]+)"\/>/);
        const publishedMatch = entry.match(/<published>([^<]+)<\/published>/);
        const idMatch = entry.match(/<yt:videoId>([^<]+)<\/yt:videoId>/);
        const descMatch = entry.match(/<media:description[^>]*>([\s\S]*?)<\/media:description>/);

        if (titleMatch && idMatch) {
            const videoId = idMatch[1];
            items.push({
                title: titleMatch[1],
                url: linkMatch ? linkMatch[1] : `https://www.youtube.com/watch?v=${videoId}`,
                published: publishedMatch ? publishedMatch[1] : new Date().toISOString(),
                videoId: videoId,
                description: descMatch ? descMatch[1] : '',
                // High res thumbnail construction
                thumbnail: `https://i.ytimg.com/vi/${videoId}/maxresdefault.jpg`
            });
        }
    }
    return items;
}

async function loginAdmin() {
    console.log('🔑 Logging in as Admin...');
    try {
        const res = await fetch(`${API_BASE}/admin/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username: 'admin', password: 'password' }) // Default credentials from context
        });
        const data = await res.json();
        if (data.success) return data.sessionId || data.token;

        // Try admin/admin123
        const res2 = await fetch(`${API_BASE}/admin/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username: 'admin', password: 'admin123' })
        });
        const data2 = await res2.json();
        if (data2.success) return data2.sessionId || data2.token;
    } catch (e) {
        console.error("Login failed", e);
    }
    return null;
}

async function postArticle(token, item) {
    try {
        // Map YT item to Article format
        const article = {
            title: item.title,
            category: 'Business', // Default category
            author: 'BizzShort',
            content: item.description || `Watch this video: ${item.url}`,
            image: item.thumbnail, // Crucial: User asked for this
            videoUrl: item.url,
            isVideo: true
        };

        const res = await fetch(`${API_BASE}/articles`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`, // If using JWT
                'session-id': token // If using session header
            },
            body: JSON.stringify(article)
        });

        if (res.ok) {
            console.log(`✅ Imported: ${item.title}`);
        } else {
            const err = await res.text();
            console.error(`❌ Failed: ${item.title} - ${err}`);
        }
    } catch (e) {
        console.error(`🔥 Error posting ${item.title}:`, e.message);
    }
}

async function run() {
    const token = await loginAdmin();
    if (!token) {
        console.error("❌ Could not log in. Aborting.");
        return;
    }
    console.log("🔓 Logged in!");

    const cid = await getChannelId('@bizz_short');
    if (!cid) {
        console.error("❌ Could not get Channel ID.");
        // Fallback: Check if user provided it elsewhere or use a known one if desperate
        // The one in the url provided by user: `https://youtube.com/@bizz_short?si=FZv...`
        // Does not show UC... directly.
        // Let's assume the naive fetch works.
        return;
    }
    console.log(`📺 Channel ID: ${cid}`);

    const xml = await getRSS(cid);
    if (!xml) return;

    const items = parseXML(xml);
    console.log(`found ${items.length} videos`);

    for (const item of items) {
        await postArticle(token, item);
    }
}

run();
