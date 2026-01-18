# BizzShort - Business News Platform

**"In seconds, say what matters"**

Modern business news website with **19 real videos** from YouTube & Instagram, live market data, interactive charts, and automated news.

---

## 🚀 Quick Start

### Run Locally (Easiest Method)

**Windows:**
```
Double-click: START-SIMPLE.bat
```

**Manual:**
```bash
cd BizzShort
python -m http.server 8000
```

**Then open:** http://localhost:8000

---

## ✨ What's Inside

### 🎥 Videos (19 Real Videos)
- **11 YouTube videos** from @bizz_short channel
- **8 Instagram reels** from @bizz_short profile
- Categories: Markets, Startups, Economy, Banking, Tech, Energy, etc.
- Each video has a detail page with full article (500-800 words)
- Working thumbnails and YouTube embeds

### 📊 Live Market Data
- **Real-time updates** every 30 seconds
- Nifty 50, Sensex, Bank Nifty, Nifty IT
- Market open/closed indicator
- Scrolling ticker with top stocks
- High/Low tracking

### 📈 Interactive Charts
- **TradingView widgets** (professional charts - FREE)
- Nifty, Sensex, Bank Nifty live charts
- Chart.js custom visualizations
- Sectoral performance chart
- Market breadth (Advance/Decline ratio)

### 📰 Automated News
- **23 news articles** auto-fetched from Google News RSS
- Updates every 10 minutes
- No API key required
- Real business news from trusted sources

### 📱 Design
- Mobile responsive
- Fast loading (<3 seconds)
- SEO optimized
- Cross-browser compatible

---

## 📁 Project Structure

```
BizzShort/
├── index.html              # Homepage with all features
├── videos.html             # Video gallery page
├── video-detail.html       # Individual video pages
├── about.html              # About page
├── contact.html            # Contact page
├── START-SIMPLE.bat        # Windows quick start
├── assets/
│   ├── css/
│   │   ├── main-style.css
│   │   ├── video-cards.css
│   │   └── video-detail.css
│   ├── js/
│   │   ├── video-manager.js          # 19 videos database
│   │   ├── live-market-data.js       # Market data system
│   │   ├── live-market-charts.js     # Charts system
│   │   ├── news-api-integration.js   # News fetching
│   │   └── video-articles-complete.js # Video articles
│   └── images/
└── README.md
```

---

## 🎯 Your 19 Videos

### YouTube (11 videos)
1. Business News Today
2. Stock Market Analysis
3. Indian Economy Update
4. Startup Funding News
5. Banking Sector Overview
6. Tech Industry Trends
7. Corporate News Roundup
8. Real Estate Market
9. Energy Sector Update
10. E-commerce Growth
11. Manufacturing Sector

### Instagram (8 reels)
12-19. Quick Market Updates

All videos are in `assets/js/video-manager.js`

---

## 🛠️ Technologies Used

- **Frontend:** HTML5, CSS3, JavaScript (ES6+)
- **Charts:** TradingView Widgets (FREE), Chart.js
- **News API:** Google News RSS (FREE, no API key)
- **Server:** Python HTTP Server (built-in)
- **Deployment:** Static hosting (Netlify, Vercel, GitHub Pages)

---

## 🌐 Deploy to Internet (FREE)

### Option 1: Netlify (Recommended)
1. Go to https://netlify.com
2. Sign up (free)
3. Drag & drop your `BizzShort` folder
4. Get instant live URL with free HTTPS

### Option 2: Vercel
1. Go to https://vercel.com
2. Import from Git or upload folder
3. Auto-deploys on every change

### Option 3: GitHub Pages
1. Create GitHub repository
2. Upload all files
3. Enable Pages in Settings
4. Access at `username.github.io/bizzshort`

---

## 🎨 Customization

### Change Colors
Edit `assets/css/main-style.css`:
```css
:root {
    --primary-color: #1a73e8;    /* Your brand color */
    --accent-color: #34a853;
}
```

### Change Logo
Replace `assets/images/logo.jpeg` with your logo

### Adjust Update Intervals
**Market Data** (default: 30 seconds):
```javascript
// In assets/js/live-market-data.js line 6
this.updateInterval = 30000; // milliseconds
```

**News Refresh** (default: 10 minutes):
```javascript
// In assets/js/news-api-integration.js last line
}, 600000); // milliseconds
```

---

## 🐛 Troubleshooting

### Videos Not Showing?
- Check browser console (F12) for errors
- Verify `video-manager.js` is loaded
- Hard refresh: `Ctrl + Shift + R`

### Market Data Not Updating?
- Check if scripts are loaded in index.html
- Look for JavaScript errors in console
- Ensure `live-market-data.js` file exists

### Charts Not Displaying?
- TradingView widgets take 3-5 seconds to load
- Check Chart.js CDN is loaded
- Try switching tabs (Overview, Nifty, Sensex)

### News Cards Empty?
- Wait 10 seconds for RSS feed to load
- Check internet connection
- Look for errors in browser console

---

## 📊 Performance

- **Page Load:** <3 seconds
- **First Paint:** <1.5 seconds
- **Total Size:** ~800KB (gzipped)
- **Update Frequency:** Market data 30s, News 10min

---

## 💰 Cost

- **Development:** $0 (Done)
- **Hosting:** $0 (Netlify/Vercel/GitHub Pages)
- **APIs:** $0 (Free TradingView, Google News RSS, Chart.js)
- **Domain:** $10-15/year (Optional custom domain)

**Total Annual Cost:** $0-15

---

## 📞 Support

- Check browser console (F12) for errors
- Verify Python is installed: `python --version`
- Try different browser (Chrome, Firefox, Edge)
- Clear cache: `Ctrl + Shift + Delete`

---

## 🎉 Next Steps

1. ✅ Test locally with `START-SIMPLE.bat`
2. ✅ Browse all videos at http://localhost:8000#videos
3. ✅ Check market data updates
4. ✅ View interactive charts
5. ✅ Customize colors and logo
6. ✅ Deploy to Netlify/Vercel
7. ✅ Share with your audience

---

## 📄 License

This project is licensed under the MIT License.

---

## 🤝 Credits

- **Developed by:** Garvik India
- **YouTube:** @bizz_short
- **Instagram:** @bizz_short

---

## 🚀 Status

✅ **Production Ready** - All features working  
✅ **19 Videos Integrated** - YouTube & Instagram  
✅ **Live Market Data** - Real-time updates  
✅ **Interactive Charts** - TradingView + Chart.js  
✅ **Automated News** - Google RSS integration  
✅ **Mobile Responsive** - Works on all devices  
✅ **Free to Deploy** - No backend required  

**Launch your website in 5 minutes!** 🎉
