# 🎯 Complete BizzShort AI Prompt - Production Ready

## Project Overview
Build a **professional business news website** called **BizzShort** with the tagline **"In Seconds, Say What Matters"**. This is a modern, responsive platform that integrates video content (YouTube/Instagram), fetches live news via Google APIs, displays real-time market data, and includes a comprehensive advertisement system.

---

## 🎨 Design & Branding

### Brand Identity
- **Name:** BizzShort
- **Tagline:** IN SECONDS, SAY WHAT MATTERS
- **Primary Color:** #e74c3c (Red)
- **Secondary Colors:** #2c3e50 (Dark Gray), #ffffff (White)
- **Font:** Poppins (headings), Inter (body)
- **Style:** Clean, professional, modern, trustworthy

---

## 📄 Required Pages (9 Total)

### 1. Homepage (index.html)
**Layout:**
- **Side Advertisements (Desktop Only >1400px):**
  - Left: 300x600 + 300x250 (fixed, sticky)
  - Right: 300x600 + 300x250 (fixed, sticky)

- **Header:**
  - Logo + Tagline on left
  - Top Ad Banner (970x90) on right
  - Navigation: Home | Latest News | Top Companies | Sectors | Interviews | Events | Blog | Advertise | About
  - Sticky header, mobile hamburger menu

- **Breaking News Section:**
  - 1 large featured story
  - 3 smaller news cards in grid
  - Market sidebar: Nifty 50, Sensex, FII Inflow (**LIVE from Google Finance API**)

- **Latest Updates Section (CRITICAL):**
  - **NO separate video section**
  - **Videos mixed with news articles as cards**
  - Tab filters: All | Business | Markets | Technology | Industry Update
  - 12-18 cards total (videos + articles)
  - Video cards have play icon overlay
  - News articles from **Google News API** (auto-fetched daily at 5:00 AM IST)
  - Sorted by date (newest first)

- **Market Data:**
  - Top Companies with **LIVE stock prices** (Google Finance API)
  - Sector Performance with **real-time % changes**
  - Charts with Chart.js

- **Interviews, Events, Analysis Sections**
- **Footer:** Links, social media, newsletter signup, admin login link

### 2. Article Detail Page (article-detail.html)
**Handles BOTH Videos AND News Articles:**

**For Videos (type=video):**
- Show video thumbnail as featured image
- Red play button overlay (80px, circular)
- Caption: "Click to watch the full video"
- On click: Embed YouTube/Instagram player (16:9)
- Use video description as article content

**For News Articles (type=article):**
- Show article featured image
- NO play button
- Display full article text content from Google News API
- Link to original source

**Layout:**
- Header with logo + tagline
- Top Ad Banner (728x90)
- Category badge
- Title, author, date, read time
- Featured image/video container
- Mid-Article Ad (336x280)
- Article content
- Sidebar with Ads (300x250, 300x600)
- Related articles

**URL Parameters:**
```
?title=...&thumb=...&url=...&source=youtube|instagram|news&category=...&published=...&excerpt=...&type=video|article
```

### 3. Blog Page (blog.html)
- Article cards with images
- Category filters
- Search functionality

### 4. Events Page (events.html)
- Upcoming events calendar
- Registration forms

### 5. About Page (about.html)
- Company info, mission, vision
- Team section
- Contact details

### 6. Contact Page (contact.html)
- Contact form (Name, Email, Subject, Message)
- Address, phone, email
- Google Maps embed

### 7. Advertise Page (advertise.html)
**Sections:**
- Hero with stats (50K+ readers, 85% business professionals)
- Advertising Solutions: Banner Ads, Sponsored Content, Newsletter, Analytics
- Pricing Packages:
  - Starter (₹25,000/month)
  - Professional (₹65,000/month) - Recommended
  - Enterprise (₹1,25,000/month)
- Demographics Charts (Chart.js)
- Success Stories (3 client testimonials)
- Contact Form for quote requests

### 8. Admin Login (admin-login.html)
- Two-column layout
- Username: `admin`, Password: `Admin@1147`
- Session storage authentication
- Redirect to admin.html on success

### 9. Admin Panel (admin.html)
**Features:**
- Dashboard with stats
- Video Manager section (iframe to AUTO_ADD_VIDEOS.html)
- Articles, Interviews, Events, News management (UI only)
- **Static mode - NO backend API calls**
- Show success messages for actions

---

## 🔌 Google API Integration (CRITICAL)

### 1. Google News API (NewsAPI.org)
**Purpose:** Fetch business news articles automatically

**Setup Steps:**
1. Register at https://newsapi.org/ (Free tier: 100 requests/day)
2. Get your API key from dashboard (format: `a1b2c3d4e5f6g7h8...`)
3. Replace `YOUR_API_KEY` below with your actual key
4. **IMPORTANT:** Never commit API keys to GitHub - use environment variables

**Implementation:**
```javascript
// Fetch news daily at 5:00 AM IST
const NEWS_API_KEY = 'YOUR_API_KEY'; // Replace with actual key from newsapi.org
const NEWS_API_URL = 'https://newsapi.org/v2/top-headlines';

async function fetchBusinessNews() {
    const response = await fetch(
        `${NEWS_API_URL}?country=in&category=business&apiKey=${NEWS_API_KEY}&pageSize=20`
    );
    const data = await response.json();
    return data.articles.map(article => ({
        title: article.title,
        description: article.description,
        thumbnail: article.urlToImage,
        url: article.url,
        source: 'news',
        category: 'Business',
        date: article.publishedAt,
        type: 'article'
    }));
}

// Schedule daily fetch at 5:00 AM IST
function scheduleDailyNewsFetch() {
    const now = new Date();
    const targetTime = new Date();
    targetTime.setHours(5, 0, 0, 0);
    
    if (now > targetTime) {
        targetTime.setDate(targetTime.getDate() + 1);
    }
    
    const timeUntilFetch = targetTime - now;
    setTimeout(() => {
        fetchBusinessNews().then(articles => {
            localStorage.setItem('dailyNews', JSON.stringify(articles));
            localStorage.setItem('lastFetch', new Date().toISOString());
        });
        // Repeat every 24 hours
        setInterval(() => {
            fetchBusinessNews().then(articles => {
                localStorage.setItem('dailyNews', JSON.stringify(articles));
                localStorage.setItem('lastFetch', new Date().toISOString());
            });
        }, 24 * 60 * 60 * 1000);
    }, timeUntilFetch);
}

// Check if news needs refresh on page load
function checkNewsUpdate() {
    const lastFetch = localStorage.getItem('lastFetch');
    if (!lastFetch || isMoreThan24HoursOld(lastFetch)) {
        fetchBusinessNews().then(articles => {
            localStorage.setItem('dailyNews', JSON.stringify(articles));
            localStorage.setItem('lastFetch', new Date().toISOString());
        });
    }
}

// Initialize on page load
window.addEventListener('DOMContentLoaded', () => {
    checkNewsUpdate();
    scheduleDailyNewsFetch();
});
```

### 2. Google Finance API / Alpha Vantage API
**Purpose:** Real-time stock market data

**Setup Steps:**
1. Register at https://www.alphavantage.co/support/#api-key (Free tier: 25 requests/day)
2. Get your API key instantly (format: `ABCDEFGHIJKLMNOP`)
3. Replace `YOUR_API_KEY` below with your actual key
4. For Indian stocks, use `.BSE` or `.NS` suffix (e.g., `RELIANCE.BSE`)

**Implementation:**
```javascript
const ALPHA_VANTAGE_KEY = 'YOUR_API_KEY'; // Replace with actual key from alphavantage.co
const ALPHA_VANTAGE_URL = 'https://www.alphavantage.co/query';

// Fetch live market data
async function fetchStockData(symbol) {
    const response = await fetch(
        `${ALPHA_VANTAGE_URL}?function=GLOBAL_QUOTE&symbol=${symbol}&apiKey=${ALPHA_VANTAGE_KEY}`
    );
    const data = await response.json();
    const quote = data['Global Quote'];
    
    return {
        symbol: symbol,
        price: parseFloat(quote['05. price']),
        change: parseFloat(quote['09. change']),
        changePercent: parseFloat(quote['10. change percent'].replace('%', '')),
        volume: parseInt(quote['06. volume'])
    };
}

// Indian Market Symbols (NSE equivalents)
const marketSymbols = {
    nifty50: '^NSEI',
    sensex: '^BSESN',
    reliance: 'RELIANCE.BSE',
    tcs: 'TCS.BSE',
    infy: 'INFY.BSE'
};

// Update market data every 5 minutes during trading hours
function updateMarketData() {
    const symbols = Object.values(marketSymbols);
    Promise.all(symbols.map(fetchStockData))
        .then(stocksData => {
            displayMarketData(stocksData);
        });
}

// Auto-refresh during market hours (9:15 AM - 3:30 PM IST)
setInterval(() => {
    const now = new Date();
    const hour = now.getHours();
    const minute = now.getMinutes();
    const isMarketOpen = (hour === 9 && minute >= 15) || (hour > 9 && hour < 15) || (hour === 15 && minute <= 30);
    
    if (isMarketOpen && [1,2,3,4,5].includes(now.getDay())) { // Mon-Fri
        updateMarketData();
    }
}, 5 * 60 * 1000); // Every 5 minutes
```

### 3. YouTube Data API v3
**Purpose:** Auto-fetch videos from your channel

**Setup Steps:**
1. Go to https://console.cloud.google.com/
2. Create new project or select existing
3. Enable "YouTube Data API v3"
4. Create credentials → API Key
5. Get your Channel ID: Go to youtube.com/account_advanced

**Implementation:**
```javascript
const YOUTUBE_API_KEY = 'YOUR_API_KEY'; // Get from Google Cloud Console
const YOUTUBE_CHANNEL_ID = 'YOUR_CHANNEL_ID'; // Found at youtube.com/account_advanced

async function fetchYouTubeVideos(maxResults = 10) {
    const response = await fetch(
        `https://www.googleapis.com/youtube/v3/search?key=${YOUTUBE_API_KEY}&channelId=${YOUTUBE_CHANNEL_ID}&part=snippet&order=date&maxResults=${maxResults}&type=video`
    );
    const data = await response.json();
    
    return data.items.map(item => ({
        videoId: item.id.videoId,
        title: item.snippet.title,
        description: item.snippet.description,
        thumbnail: item.snippet.thumbnails.high.url,
        publishedAt: item.snippet.publishedAt,
        source: 'youtube',
        category: 'Markets', // Auto-categorize or use video tags
        type: 'video'
    }));
}
```

---

## 📊 Video Database (Initial 19 Videos)

```javascript
const videoDatabase = [
    // YouTube Videos
    { id: '1', title: 'Business News Update', category: 'Markets', source: 'youtube', videoId: 'fH8Ir7doWGk', thumbnail: 'https://img.youtube.com/vi/fH8Ir7doWGk/maxresdefault.jpg', description: 'Latest market updates', views: '15.2K', date: 'Dec 10, 2025', duration: '10:45', featured: true },
    { id: '2', title: 'Business Insights', category: 'Economy', source: 'youtube', videoId: 'dHFaUxh_sBE', thumbnail: 'https://img.youtube.com/vi/dHFaUxh_sBE/maxresdefault.jpg', description: 'Economic analysis', views: '12.8K', date: 'Dec 9, 2025', duration: '8:30', featured: false },
    { id: '3', title: 'Market Watch', category: 'Markets', source: 'youtube', videoId: 'TXoQOkT8FiQ', thumbnail: 'https://img.youtube.com/vi/TXoQOkT8FiQ/maxresdefault.jpg', description: 'Market trends', views: '18.5K', date: 'Dec 8, 2025', duration: '12:15', featured: false },
    { id: '4', title: 'Business Update', category: 'Economy', source: 'youtube', videoId: 'ZZND7BcDA_c', thumbnail: 'https://img.youtube.com/vi/ZZND7BcDA_c/maxresdefault.jpg', description: 'Business news', views: '10.3K', date: 'Dec 7, 2025', duration: '9:20', featured: false },
    { id: '5', title: 'Financial News', category: 'Banking', source: 'youtube', videoId: 'DBjSV7cGluE', thumbnail: 'https://img.youtube.com/vi/DBjSV7cGluE/maxresdefault.jpg', description: 'Banking sector', views: '14.7K', date: 'Dec 6, 2025', duration: '11:05', featured: false },
    { id: '6', title: 'Market Analysis', category: 'Markets', source: 'youtube', videoId: 'B8ulzu1X8Y8', thumbnail: 'https://img.youtube.com/vi/B8ulzu1X8Y8/maxresdefault.jpg', description: 'Market insights', views: '16.2K', date: 'Dec 5, 2025', duration: '10:30', featured: false },
    { id: '7', title: 'Business Strategy', category: 'Economy', source: 'youtube', videoId: 'Gx5DmLYRWrI', thumbnail: 'https://img.youtube.com/vi/Gx5DmLYRWrI/maxresdefault.jpg', description: 'Strategic planning', views: '11.9K', date: 'Dec 4, 2025', duration: '13:45', featured: false },
    { id: '8', title: 'Tech News', category: 'Economy', source: 'youtube', videoId: '47bNBV5Ca7Y', thumbnail: 'https://img.youtube.com/vi/47bNBV5Ca7Y/maxresdefault.jpg', description: 'Technology sector', views: '13.4K', date: 'Dec 3, 2025', duration: '8:55', featured: false },
    { id: '9', title: 'Investment Tips', category: 'Markets', source: 'youtube', videoId: 'zX280yTaG_E', thumbnail: 'https://img.youtube.com/vi/zX280yTaG_E/maxresdefault.jpg', description: 'Investment guide', views: '19.1K', date: 'Dec 2, 2025', duration: '14:20', featured: false },
    { id: '10', title: 'Stock Market News', category: 'Markets', source: 'youtube', videoId: 'tR1ZlYUvzUo', thumbnail: 'https://img.youtube.com/vi/tR1ZlYUvzUo/maxresdefault.jpg', description: 'Stock updates', views: '17.6K', date: 'Dec 1, 2025', duration: '11:40', featured: false },
    { id: '11', title: 'Economic Outlook', category: 'Economy', source: 'youtube', videoId: 'pK70FxjUJCY', thumbnail: 'https://img.youtube.com/vi/pK70FxjUJCY/maxresdefault.jpg', description: 'Future outlook', views: '15.8K', date: 'Nov 30, 2025', duration: '12:50', featured: false },
    
    // Instagram Reels
    { id: '12', title: 'Business Shorts', category: 'Markets', source: 'instagram', videoId: 'DSHA0mkgHLS', thumbnail: 'https://via.placeholder.com/300x300', description: 'Quick business updates', views: '8.5K', date: 'Dec 10, 2025', duration: '0:45', featured: false },
    { id: '13', title: 'Financial Update', category: 'Banking', source: 'instagram', videoId: 'DSG50e1kf_H', thumbnail: 'https://via.placeholder.com/300x300', description: 'Banking insights', views: '7.2K', date: 'Dec 9, 2025', duration: '0:55', featured: false },
    { id: '14', title: 'Market Pulse', category: 'Markets', source: 'instagram', videoId: 'DSFvu7rlS7D', thumbnail: 'https://via.placeholder.com/300x300', description: 'Market snapshot', views: '9.3K', date: 'Dec 8, 2025', duration: '0:50', featured: false },
    { id: '15', title: 'Business Brief', category: 'Economy', source: 'instagram', videoId: 'DSFoxt3DqbH', thumbnail: 'https://via.placeholder.com/300x300', description: 'Business summary', views: '6.8K', date: 'Dec 7, 2025', duration: '0:40', featured: false },
    { id: '16', title: 'Economic Insights', category: 'Economy', source: 'instagram', videoId: 'DSFhp73Clum', thumbnail: 'https://via.placeholder.com/300x300', description: 'Economy watch', views: '7.9K', date: 'Dec 6, 2025', duration: '0:48', featured: false },
    { id: '17', title: 'Market Watch', category: 'Markets', source: 'instagram', videoId: 'DSD_ZR4jZoX', thumbnail: 'https://via.placeholder.com/300x300', description: 'Market brief', views: '8.1K', date: 'Dec 5, 2025', duration: '0:52', featured: false },
    { id: '18', title: 'Banking News', category: 'Banking', source: 'instagram', videoId: 'DSD4XfyFQZP', thumbnail: 'https://via.placeholder.com/300x300', description: 'Banking updates', views: '6.5K', date: 'Dec 4, 2025', duration: '0:46', featured: false },
    { id: '19', title: 'Business Flash', category: 'Economy', source: 'instagram', videoId: 'DSDqPEXD-hV', thumbnail: 'https://via.placeholder.com/300x300', description: 'Quick updates', views: '7.4K', date: 'Dec 3, 2025', duration: '0:43', featured: false }
];
```

---

## 💻 JavaScript Implementation

### content-manager.js (Main File)
```javascript
const videoDatabase = [/* 19 videos above */];
let newsArticles = [];

// Load news from localStorage or fetch new
function loadNewsArticles() {
    const cached = localStorage.getItem('dailyNews');
    if (cached) {
        newsArticles = JSON.parse(cached);
    } else {
        fetchBusinessNews().then(articles => {
            newsArticles = articles;
        });
    }
}

// Merge videos and news, sort by date
function getAllContent() {
    return [...videoDatabase, ...newsArticles].sort((a, b) => 
        new Date(b.date) - new Date(a.date)
    );
}

// Create unified card for videos and articles
function createArticleCard(item) {
    const isVideo = item.source === 'youtube' || item.source === 'instagram';
    const playIcon = isVideo ? '<div class="play-icon-overlay"><i class="fas fa-play"></i></div>' : '';
    const type = isVideo ? 'video' : 'article';
    
    return `
        <div class="news-card" onclick="window.location.href='article-detail.html?title=${encodeURIComponent(item.title)}&thumb=${encodeURIComponent(item.thumbnail)}&url=${encodeURIComponent(item.url || getVideoUrl(item))}&source=${item.source}&category=${item.category}&published=${item.date}&excerpt=${encodeURIComponent(item.description)}&type=${type}'">
            <img src="${item.thumbnail}" alt="${item.title}">
            ${playIcon}
            <div class="card-content">
                <span class="category-badge">${item.category}</span>
                <h3>${item.title}</h3>
                <p>${item.description.substring(0, 120)}...</p>
                <div class="card-meta">
                    <span><i class="far fa-clock"></i> ${formatDate(item.date)}</span>
                    ${isVideo ? `<span><i class="far fa-eye"></i> ${item.views}</span>` : ''}
                </div>
            </div>
        </div>
    `;
}

function getVideoUrl(item) {
    if (item.source === 'youtube') {
        return `https://www.youtube.com/watch?v=${item.videoId}`;
    } else if (item.source === 'instagram') {
        return `https://www.instagram.com/p/${item.videoId}/`;
    }
    return item.url;
}

// Render all content
function renderMixedContent(containerId) {
    const allContent = getAllContent();
    const container = document.getElementById(containerId);
    container.innerHTML = allContent.map(createArticleCard).join('');
}

// Initialize on page load
document.addEventListener('DOMContentLoaded', () => {
    loadNewsArticles();
    renderMixedContent('latest-updates-container');
    updateMarketData();
    scheduleDailyNewsFetch();
});
```

### article-detail.js
```javascript
// Get URL parameters
const params = new URLSearchParams(window.location.search);
const title = params.get('title');
const thumb = params.get('thumb');
const url = params.get('url');
const source = params.get('source');
const type = params.get('type'); // 'video' or 'article'
const excerpt = params.get('excerpt');

// Update page content
document.querySelector('.article-title').textContent = title;
document.querySelector('#article-thumbnail').src = thumb;
document.querySelector('.lead-paragraph').textContent = excerpt;

if (type === 'video') {
    // Video mode: Show play button
    const playOverlay = document.querySelector('.play-overlay');
    playOverlay.style.display = 'flex';
    
    document.querySelector('#video-container').addEventListener('click', () => {
        if (source === 'youtube') {
            const videoId = url.split('v=')[1] || url.split('/').pop();
            embedYouTubePlayer(videoId);
        } else if (source === 'instagram') {
            embedInstagramPlayer(url);
        }
    });
} else if (type === 'article') {
    // Article mode: Hide play button, show article content
    document.querySelector('.play-overlay').style.display = 'none';
    
    // Fetch full article or display excerpt
    if (url) {
        document.querySelector('#article-content').innerHTML = `
            <p>${excerpt}</p>
            <p><a href="${url}" target="_blank" class="read-more-link">Read full article at source →</a></p>
        `;
    }
}

function embedYouTubePlayer(videoId) {
    const container = document.querySelector('#video-container');
    container.innerHTML = `
        <iframe width="100%" height="500" 
            src="https://www.youtube.com/embed/${videoId}?autoplay=1&rel=0" 
            frameborder="0" 
            allow="autoplay; encrypted-media" 
            allowfullscreen>
        </iframe>
    `;
}

function embedInstagramPlayer(postUrl) {
    const container = document.querySelector('#video-container');
    const postId = postUrl.split('/p/')[1]?.split('/')[0];
    container.innerHTML = `
        <iframe src="https://www.instagram.com/p/${postId}/embed" 
            width="100%" height="600" 
            frameborder="0" scrolling="no">
        </iframe>
    `;
}
```

---

## 📢 Advertisement System

### Ad Placements:
1. **Homepage:** Side ads (desktop), header banner, in-content ads
2. **Article Pages:** Top banner, mid-article, sidebar ads
3. **Advertise Page:** Full pricing, forms, charts

### Google AdSense Integration:
```html
<script async src="https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=ca-pub-XXXXXXXXXXXXXXXX"></script>
```

---

## 📁 Final File Structure

```
BizzShort/
├── index.html
├── article-detail.html (handles videos + articles)
├── blog.html
├── events.html
├── about.html
├── contact.html
├── advertise.html
├── admin-login.html
├── admin.html
├── AUTO_ADD_VIDEOS.html
├── 404.html
├── robots.txt
├── sitemap.xml
├── README.md
├── assets/
│   ├── css/
│   │   ├── main-style.css
│   │   ├── article-detail.css
│   │   ├── market-sections.css
│   │   ├── video-cards.css
│   │   ├── admin.css
│   │   └── responsive.css
│   ├── js/
│   │   ├── content-manager.js (videos + news)
│   │   ├── article-detail.js
│   │   ├── market-data.js
│   │   ├── news-fetcher.js (Google News API)
│   │   ├── main-functionality.js
│   │   ├── admin-enhanced.js
│   │   ├── advertise.js
│   │   └── contact.js
│   └── images/
└── utils/
    └── easy-video-updater.js
```

---

## 🎯 Key Requirements Summary

### ✅ NO Separate Video Pages
- Videos displayed as cards in Latest Updates section
- Article-detail.html handles both videos and articles
- URL parameter `type=video` or `type=article` determines behavior

### ✅ Google News API - Daily Fetch at 5:00 AM IST
- Automatic news fetching scheduled for 5:00 AM IST
- Fetches 20 business articles from India
- Stores in localStorage with timestamp
- Checks on page load if news is stale (>24 hours)
- Re-fetches if needed

### ✅ Accurate Real-Time Market Data
- Google Finance API or Alpha Vantage for live stock data
- Updates every 5 minutes during market hours (9:15 AM - 3:30 PM IST, Mon-Fri)
- Displays: Nifty 50, Sensex, top companies
- Shows current price, change, % change, volume
- Green/red indicators for up/down movements

### ✅ Advertisement System
- Complete advertise.html page
- Strategic ad placements across site
- Google AdSense ready
- Demographics charts with Chart.js

### ✅ Professional Design
- Clean, modern, trustworthy
- Fully responsive (mobile, tablet, desktop)
- Fast loading with cache busting
- SEO optimized

---

## 🚀 Deployment Checklist

### API Setup:
- [ ] **NewsAPI.org:** Register → Get API key → Replace in `NEWS_API_KEY` (100 requests/day free)
- [ ] **Alpha Vantage:** Register → Get API key → Replace in `ALPHA_VANTAGE_KEY` (25 requests/day free)
- [ ] **YouTube API:** Google Cloud Console → Enable API → Create credentials → Get API key
- [ ] **Get YouTube Channel ID:** Go to youtube.com/account_advanced
- [ ] **Test all APIs:** Run test functions to verify keys work

### Security:
- [ ] **NEVER commit API keys to GitHub** 
- [ ] Create `.env` file locally (add to .gitignore)
- [ ] Use environment variables for production
- [ ] Consider using backend proxy to hide keys

### Testing:
- [ ] Test news fetching at 5 AM (or manually trigger)
- [ ] Verify market data updates every 5 minutes during trading hours
- [ ] Test video embedding (YouTube + Instagram)
- [ ] Test article display from news API
- [ ] Verify mixed content (videos + articles) displays correctly

### Monetization:
- [ ] Apply for Google AdSense (can take 1-2 weeks)
- [ ] Replace placeholder ad images with AdSense code
- [ ] Configure Google Analytics (G-XXXXXXXXXX)

### Deployment:
- [ ] Deploy to GitHub Pages / Netlify / Vercel
- [ ] Set up custom domain (optional)
- [ ] Enable HTTPS
- [ ] Test on mobile devices

---

## 📞 Contact & Social Media

- **YouTube:** @bizz_short (https://youtube.com/@bizz_short)
- **Instagram:** @bizz_short (https://www.instagram.com/bizz_short)
- **Email:** advertising@bizzshort.com
- **Phone:** +91 98765-43210
- **Address:** B-64, Sector 65, Noida, UP

---

**This prompt is production-ready and includes all specifications for a complete, functional business news website with automated news fetching, real-time market data, video integration, and advertisement system.**
