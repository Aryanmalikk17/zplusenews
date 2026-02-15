# ZPlusNews Project Context

Last Updated: 2026-02-05

## Project Overview
ZPlusNews is a news aggregation website built with:
- **Frontend**: React + Vite (client folder)
- **Backend**: Express.js + MongoDB (server.js)
- **Deployment**: Render.com
- **Repository**: https://github.com/Aryanmalikk17/zplusenews

## Admin Credentials
- **Username**: admin or Admin
- **Password**: admin123

## Key Files & Architecture

### Backend (server.js)
- Express server on port 5099
- MongoDB connection via mongoose
- JWT authentication with bcryptjs
- Rate limiting configured (500 requests per 15 minutes)
- API routes: `/api/articles`, `/api/videos`, `/api/auth`, `/api/news/*`

### Frontend Structure
```
client/src/
├── components/
│   ├── layout/
│   │   ├── CategoryPageLayout.jsx  # Category pages (sports, tech, etc.)
│   │   ├── Header.jsx
│   │   └── Footer.jsx
│   └── ui/
│       ├── ArticleCard.jsx
│       ├── VideoCard.jsx
│       └── TrendingTicker.jsx
├── pages/
│   ├── Home.jsx
│   ├── Article.jsx
│   ├── Videos.jsx
│   └── AdminPanel.jsx
├── services/
│   └── api.js  # Axios API configuration
└── styles/
```

### Models
- `Article.js` - News articles with category enum
- `Video.js` - Video content (YouTube/Instagram)
- `User.js` - Admin users

## Category System
Valid categories (shared between Article and Video models):
- Special: `positive`, `fake-news`
- Level-based: `international`, `national`, `state`
- Interest-based: `economics`, `polity`, `technology`, `environment`, `sports`
- Legacy: `business`, `innovation`, `tech`, `ai`, `gadgets`, `software`, `startups`, `markets`, `crypto`, `general`

---

## Bug Fixes Completed (Feb 2026)

### 1. Rate Limiting Issues (429 Errors)
**Problem**: Users getting 429 Too Many Requests errors
**Fix**: Increased rate limits from 100 to 500 requests per 15 minutes in `server.js`

### 2. Infinite API Request Loop
**Problem**: `TrendingTicker.jsx` was making 235+ API requests per minute, triggering rate limits
**Root Cause**: `useEffect` dependency was `[items]` where items was a new empty array on each render
**Fix**: Changed to `[items.length]` to prevent infinite re-renders

### 3. React Error #31 (Objects as Children)
**Problem**: React error when rendering author field
**Root Cause**: `author` field was sometimes an object `{name: "..."}` instead of string
**Files Fixed**:
- `AdminPanel.jsx` line 300 & 505
- `Article.jsx` line 119
**Fix**: Use `article.author?.name || article.author` pattern

### 4. Videos Not Displaying on Category Pages
**Problem**: Videos added via admin panel didn't appear on category pages
**Root Cause**: `CategoryPageLayout.jsx` only rendered articles, never videos
**Fix**: 
- Added VideoCard import
- Created `showVideos`/`showArticles` filter logic
- Added "Video News" section with video grid

### 5. YouTube Error 153
**Problem**: YouTube embeds showing "Error 153 - Video player configuration error"
**Root Cause**: Standard youtube.com embed blocked by privacy settings
**Fix**: Changed to `youtube-nocookie.com` with parameters `?rel=0&modestbranding=1&enablejsapi=1`

### 6. Instagram Videos Not Playing
**Problem**: Instagram videos showed document icon instead of playing
**Root Cause**: Instagram doesn't support reliable iframe embedding
**Fix**: Modified `VideoCard.jsx` to open Instagram URL in new tab when clicked, instead of attempting embed

---

## API Endpoints

### Articles
- `GET /api/articles` - List articles (supports ?category, ?page, ?limit)
- `POST /api/articles` - Create article (auth required)
- `PUT /api/articles/:id` - Update article (auth required)
- `DELETE /api/articles/:id` - Delete article (auth required)

### Videos
- `GET /api/videos` - List videos
- `POST /api/videos` - Create video (auth required, auto-parses YouTube/Instagram URLs)
- `PUT /api/videos/:id` - Update video (auth required)
- `DELETE /api/videos/:id` - Delete video (auth required)

### News (External APIs)
- `GET /api/news/trending` - Trending news from CurrentsAPI
- `GET /api/news/category/:category` - Category news from CurrentsAPI

### Auth
- `POST /api/auth/login` - Admin login (returns JWT)
- `GET /api/auth/me` - Get current user (auth required)

---

## Environment Variables
```
MONGODB_URI=mongodb+srv://...
JWT_SECRET=...
JWT_EXPIRE=30d
NODE_ENV=production
PORT=5099
CURRENTS_API_KEY=...
```

---

## Common Issues & Solutions

### Articles not appearing on homepage
1. Check if category matches enum in Article.js model
2. Verify API response structure: `{ success: true, data: [...] }`
3. Check for rate limiting (429 errors)

### Video playback issues
- YouTube: Use youtube-nocookie.com domain
- Instagram: Opens in new tab (embedding not supported)

### Admin login failing
1. Ensure admin user exists (auto-seeded on first run)
2. Check CORS configuration for production domain
3. Verify JWT_SECRET is set

---

## Deployment Notes
- Frontend build: `cd client && npm run build`
- Output goes to `client/dist/`
- Server serves static files from dist folder
- Render auto-deploys from GitHub main branch
