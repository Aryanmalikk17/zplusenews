# ZPluse News - Business News & Market Insights

Welcome to **ZPluse News**, your premier destination for business news, market updates, video content, and industry insights in India.

![ZPluse News Logo](assets/images/logo.png)

## About ZPluse News

ZPluse News is a comprehensive business news platform that delivers real-time market updates, corporate developments, startup news, economic insights, and video news coverage. Based in India, we serve business professionals, entrepreneurs, investors, and anyone interested in India's dynamic business landscape.

**Tagline:** *IN SECONDS, SAY WHAT MATTERS*

## 🚀 Features

### 📰 **Real-Time Business News**
- Breaking news alerts
- Market movements and analysis  
- Corporate announcements
- Economic policy updates

### 🎥 **Video News Coverage**
- YouTube video integration
- Instagram reels and video content
- Category-based video filtering (Markets, Startups, Economy, etc.)
- Dedicated video detail pages with embedded players
- Social media integration
- Video articles with full text content
- Related videos suggestions
- Featured video highlights

### 📊 **Market Intelligence**
- Stock market analysis
- Sector performance reports
- Investment insights
- Financial data visualization
- Analytics dashboard with Chart.js

### 📝 **Article Management**
- Full article CRUD operations
- Article detail pages with social sharing
- Related articles suggestions
- View tracking and analytics
- Tag-based categorization
- Author profiles

### 🎯 **Startup Coverage**
- Funding announcements
- Unicorn tracking
- Entrepreneur interviews
- Emerging business trends

### 📱 **Multi-Platform Presence**
- Website with responsive design
- YouTube news channel
- Instagram news account
- Social media integration
- Mobile-optimized content

### 💰 **Advertising Solutions**
- Banner advertisements with hide functionality
- Sponsored content opportunities
- Newsletter sponsorships
- Video advertising options
- ROI calculator for advertisers
- Comprehensive advertising analytics

### 🔒 **Security & Privacy Features**
- **Advertisement Hide Controls** - Users can hide unwanted ads
- **Ad Preferences Management** - Granular control over ad types
- **Content Security Policy** - XSS protection and content sanitization
- **Rate Limiting** - Protection against excessive ad interactions
- **JWT Authentication** - Secure admin panel access
- **Malicious Ad Detection** - Automated security monitoring
- **Secure URL Validation** - Protection against malicious links

## 🗂️ Project Structure

```
ZPluseNews/
├── index.html                 # Homepage
├── about.html                 # About page
├── contact.html               # Contact page
├── events.html                # Events page
├── advertise.html             # Advertising page
├── article-detail.html        # Article detail page
├── admin.html                 # Admin panel
├── admin-login.html           # Admin login
├── server.js                  # Backend API server
├── assets/
│   ├── css/
│   │   ├── main-style.css    # Main stylesheet
│   │   ├── article-detail.css # Article page styles
│   │   └── additional.css    # Additional styles
│   ├── js/
│   │   ├── config.js         # API configuration
│   │   ├── admin-streamlined.js # Admin panel logic
│   │   ├── article-detail.js # Article detail logic
│   │   └── ad-manager.js     # Advertisement management
│   └── images/
│       ├── logo.png          # ZPluse News logo
│       └── favicon.png       # Favicon
└── models/
    ├── Article.js            # Article model
    ├── Video.js              # Video model
    ├── Event.js              # Event model
    └── Advertisement.js      # Advertisement model
```

## 🎨 Brand Identity

### Logo
The ZPluse News logo features a stylized "Z+" symbol in deep crimson red, representing:
- **Z** - ZPluse brand
- **+** - Adding value, positive news, growth

### Color Palette

```css
Primary Colors:
- Brand Red: #e74c3c
- Dark Red: #c0392b
- Dark Blue: #2c3e50
- Navy: #1a1a2e

Gradients:
- Header: #e74c3c to #c0392b
- Accent: #2c3e50 to #1a1a2e

Text & Background:
- Dark Text: #2c3e50
- Medium Text: #6B7280
- Light Text: #95a5a6
- Background: #f8f9fa
- White: #ffffff
```

### Typography
- **Headers**: Poppins (600-800 weight)
- **Body**: Inter (400-500 weight)

## 🛠️ Technologies Used

### Frontend
- **HTML5** - Semantic markup
- **CSS3** - Modern styling with Flexbox and Grid
- **JavaScript (ES6+)** - Interactive functionality
- **Font Awesome 6** - Icon library
- **Google Fonts** - Typography (Inter, Poppins)
- **Chart.js** - Analytics visualization

### Backend
- **Node.js** - Server runtime
- **Express.js** - Web framework
- **MongoDB** - Database
- **Mongoose** - ODM
- **JWT** - Authentication
- **Helmet** - Security headers
- **express-rate-limit** - Rate limiting

## 🚀 Getting Started

### Prerequisites
- Node.js 18+ installed
- MongoDB Atlas account or local MongoDB

### Installation

1. **Clone the repository**
```bash
git clone https://github.com/yourusername/zplusenews.git
cd zplusenews
```

2. **Install dependencies**
```bash
npm install
```

3. **Configure environment**
```bash
cp .env.example .env
# Edit .env with your MongoDB connection string
```

4. **Start the server**
```bash
npm start
# Or for development:
npm run dev
```

5. **Access the application**
- Homepage: http://localhost:3000
- Admin Panel: http://localhost:3000/admin.html

## 📡 API Endpoints

### Articles
- `GET /api/articles` - Get all articles (admin)
- `GET /api/articles/public/list` - Get published articles
- `GET /api/articles/:id` - Get article by ID
- `GET /api/articles/slug/:slug` - Get article by slug
- `POST /api/articles` - Create article (admin)
- `PUT /api/articles/:id` - Update article (admin)
- `DELETE /api/articles/:id` - Delete article (admin)
- `PUT /api/articles/:id/view` - Increment view count

### Videos
- `GET /api/videos` - Get all videos
- `POST /api/videos` - Create video (admin)
- `PUT /api/videos/:id` - Update video (admin)
- `DELETE /api/videos/:id` - Delete video (admin)

### Events
- `GET /api/events` - Get all events
- `POST /api/events` - Create event (admin)
- `PUT /api/events/:id` - Update event (admin)
- `DELETE /api/events/:id` - Delete event (admin)

### Authentication
- `POST /api/admin/login` - Admin login
- `GET /api/admin/pending-users` - Get pending users
- `POST /api/admin/approve-user/:id` - Approve user
- `POST /api/admin/reject-user/:id` - Reject user

## 📱 Responsive Breakpoints

- **Desktop**: 1200px and above
- **Tablet**: 768px - 1199px
- **Mobile**: 320px - 767px

## 🌐 Browser Support

- Chrome 90+
- Firefox 85+
- Safari 14+
- Edge 90+
- Mobile browsers (iOS Safari, Chrome Mobile)

## 📈 SEO Features

- Semantic HTML structure
- Meta tags optimization
- Open Graph tags
- Twitter Card meta tags
- Schema markup ready
- Sitemap structure
- Fast loading optimization

## 🤝 Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

## 📄 License

This project is proprietary software owned by ZPluse News. All rights reserved.

## 🆘 Support

For technical support or questions:
- Email: info@zplusenews.com
- Website: https://zplusenews.com

---

**Built with ❤️ by ZPluse News Team - IN SECONDS, SAY WHAT MATTERS**