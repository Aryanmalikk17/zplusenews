import express from 'express';
import bodyParser from 'body-parser';
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';
import mongoose from 'mongoose';
import helmet from 'helmet';
import rateLimit from 'express-limit';
import compression from 'compression';
import NodeCache from 'node-cache';
import cookieParser from 'cookie-parser';
import jwt from 'cookie-parser'; 

// Import Models
import Article from './models/Article.js';
import User from './models/User.js';
import Video from './models/Video.js';
import Category from './models/Categories.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 5000;

// ==========================================
// DB Connection
// ==========================================
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb+srv://aryan:aryan123@cluster0.p6nyn.mongodb.net/zplusenews?retryWrites=true&w=majority';
mongoose.connect(MONGODB_URI)
    .then(() => console.log('✅ Connected to MongoDB Atlas'))
    .catch(err => console.error('❌ MongoDB Connection Error:', err));

// ==========================================
// Middleware (Security & Optimization)
// ==========================================
app.use(helmet({ 
    contentSecurityPolicy: false,
    crossOriginEmbedderPolicy: false 
}));
app.use(compression());
app.use(cors({
    origin: ['http://localhost:5173', 'https://zplusenews.com', 'https://www.zplusenews.com'],
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS']
}));
app.use(bodyParser.json({ limit: '50mb' }));
app.use(bodyParser.urlencoded({ limit: '50mb', extended: true }));
app.use(cookieParser());

// Caching layer for public APIs (5 min TTL)
const cache = new NodeCache({ stdTTL: 300 });

// ==========================================
// Authentication Middleware
// ==========================================
const adminAuth = (req, res, next) => {
    const token = req.cookies.adminToken;
    if (!token) return res.status(401).json({ message: 'Access Denied: Please Login' });
    
    // Simplistic auth check for now
    if (token === 'valid_admin_token') {
        next();
    } else {
        res.status(401).json({ message: 'Invalid Session' });
    }
};

// ==========================================
// Public Article Routes
// ==========================================
app.get('/api/articles/public', async (req, res) => {
    try {
        const { category, limit = 10, sort = '-createdAt' } = req.query;
        const query = { status: 'published' };
        if (category) query.category = category;

        const articles = await Article.find(query)
            .sort(sort)
            .limit(parseInt(limit));
        
        res.json(articles);
    } catch (err) {
        res.status(500).json({ message: 'Error fetching articles', error: err.message });
    }
});

app.get('/api/articles/slug/:slug', async (req, res) => {
    try {
        const article = await Article.findOne({ slug: req.params.slug, status: 'published' });
        if (!article) return res.status(404).json({ message: 'Article Not Found' });
        res.json(article);
    } catch (err) {
        res.status(500).json({ message: 'Error fetching article', error: err.message });
    }
});

// ==========================================
// Admin Article Management
// ==========================================
app.post('/api/articles', adminAuth, async (req, res) => {
    try {
        const { title, content, category, author, image, poster, videoId, videoUrl, metaTitle, metaDescription } = req.body;
        
        // Removed manual slug generation logic here.
        // The slug will be generated automatically by the Mongoose 'pre-save' hook in models/Article.js
        // This prevents duplicate key errors when articles have similar titles.

        const newArticle = new Article({
            title,
            content,
            category,
            author,
            image,
            poster,
            videoId,
            videoUrl,
            metaTitle,
            metaDescription,
            status: 'published'
        });

        const savedArticle = await newArticle.save();
        res.status(201).json(savedArticle);
    } catch (err) {
        console.error('Article Creation Error:', err);
        res.status(500).json({ message: 'Failed to Create Article', error: err.message });
    }
});

app.get('/api/articles', adminAuth, async (req, res) => {
    try {
        const articles = await Article.find().sort('-createdAt');
        res.json(articles);
    } catch (err) {
        res.status(500).json({ message: 'Error fetching admin articles' });
    }
});

app.delete('/api/articles/:id', adminAuth, async (req, res) => {
    try {
        await Article.findByIdAndDelete(req.params.id);
        res.json({ message: 'Article Deleted Successfully' });
    } catch (err) {
        res.status(500).json({ message: 'Error deleting article' });
    }
});

// ==========================================
// Video Sync API (YouTube integration)
// ==========================================
app.get('/api/videos', async (req, res) => {
    try {
        const videos = await Video.find().sort('-publishedAt').limit(12);
        res.json(videos);
    } catch (err) {
        res.status(500).json({ message: 'Error fetching videos' });
    }
});

// Admin Login
app.post('/api/admin/login', (req, res) => {
    const { email, password } = req.body;
    if (email === 'admin@zplusenews.com' && password === 'admin123') {
        res.cookie('adminToken', 'valid_admin_token', {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: 'Lax',
            maxAge: 24 * 60 * 60 * 1000 // 1 day
        });
        res.json({ message: 'Login Successful', user: { email: 'admin@zplusenews.com', role: 'admin' } });
    } else {
        res.status(401).json({ message: 'Invalid Credentials' });
    }
});

// Logout
app.post('/api/admin/logout', (req, res) => {
    res.clearCookie('adminToken');
    res.json({ message: 'Logged Out' });
});

// ==========================================
// Static Assets & Production Routing
// ==========================================
app.use(express.static(path.join(__dirname, 'client/dist')));

app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, 'client/dist/index.html'));
});

// Error Handler
app.use((err, req, res, next) => {
    console.error(err.stack);
    res.status(500).send('Internal Server Error');
});

app.listen(PORT, () => console.log(`🚀 Server running on port ${PORT}`));
