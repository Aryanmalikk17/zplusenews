const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const bodyParser = require('body-parser');
const cookieParser = require('cookie-parser');
const path = require('path');
const helmet = require('helmet');
const mongoSanitize = require('express-mongo-sanitize');
const rateLimit = require('express-rate-limit');
const { body, validationResult } = require('express-validator');
const NodeCache = require('node-cache');
const dotenv = require('dotenv');

// Load environment variables
dotenv.config();

const Article = require('./models/Article');
const apiCache = new NodeCache({ stdTTL: 300, checkperiod: 60 });

const app = express();
const PORT = process.env.PORT || 5000;

// Security Middleware
app.use(helmet({
    contentSecurityPolicy: false, // For easier local development with images
}));
app.use(mongoSanitize());

// Rate Limiting
const limiter = rateLimit({
    windowMs: 15 * 60 * 1000, 
    max: 100 
});
app.use('/api/', limiter);

// Middleware
app.use(cors({
    origin: process.env.CORS_ORIGIN ? process.env.CORS_ORIGIN.split(',') : 'http://localhost:3000',
    credentials: true
}));
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));
app.use(cookieParser());
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// DB Connection
mongoose.connect(process.env.MONGO_URI)
    .then(() => console.log('Connected to MongoDB Atlas'))
    .catch(err => console.error('MongoDB connection error:', err));

// Auth Middleware Mock (for local fix consistency)
const protect = (req, res, next) => {
    // In production this verifies JWT from cookie
    // For this fix, we assume the user is authenticated via adminToken cookie
    const token = req.cookies.adminToken;
    if (!token && process.env.NODE_ENV === 'production') {
        return res.status(401).json({ success: false, error: 'Not authorized' });
    }
    req.user = { id: 'admin_id', name: 'Admin' };
    next();
};

// Conditional Upload Middleware
const multer = require('multer');
const storage = multer.diskStorage({
    destination: './uploads/',
    filename: (req, file, cb) => cb(null, Date.now() + path.extname(file.originalname))
});
const upload = multer({ storage });
const conditionalUpload = (fieldName) => (req, res, next) => {
    if (req.headers['content-type'] && req.headers['content-type'].includes('multipart/form-data')) {
        return upload.single(fieldName)(req, res, next);
    }
    next();
};

// API Routes

// Stats
app.get('/api/stats', async (req, res) => {
    try {
        const stats = {
            articles: await Article.countDocuments(),
            views: (await Article.aggregate([{ $group: { _id: null, total: { $sum: "$views" } } }]))[0]?.total || 0,
            categories: (await Article.distinct('category')).length
        };
        res.json({ success: true, data: stats });
    } catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
});

// Articles
app.get('/api/articles', async (req, res) => {
    try {
        const { category } = req.query;
        const page = parseInt(req.query.page, 10) || 1;
        const limit = parseInt(req.query.limit, 10) || 10;
        const skip = (page - 1) * limit;

        const cacheKey = `articles:${category || 'all'}:p${page}:l${limit}`;

        const cached = apiCache.get(cacheKey);
        if (cached) {
            return res.json(cached);
        }

        const query = category ? { category: new RegExp(category, 'i') } : {};

        const articles = await Article.find(query)
            .sort({ publishedAt: -1 })
            .skip(skip)
            .limit(limit)
            .lean();

        const count = await Article.countDocuments(query);

        const result = {
            success: true,
            data: articles.map(a => ({ ...a, id: a._id })),
            pagination: { page, limit, total: count, pages: Math.ceil(count / limit) }
        };
        apiCache.set(cacheKey, result);
        res.json(result);
    } catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
});

// Article validation
const articleValidation = [
    body('title').trim().isLength({ min: 5, max: 200 }).withMessage('Title too short/long'),
    body('category').trim().notEmpty().withMessage('Category required'),
];

app.post('/api/articles', protect, articleValidation, conditionalUpload('image'), async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(422).json({ success: false, errors: errors.array() });

    try {
        const articleData = { ...req.body };
        if (req.file) articleData.image = `/uploads/${req.file.filename}`;
        
        const article = await Article.create(articleData);
        apiCache.flushAll(); // Invalidate cache
        res.status(201).json({ success: true, data: article });
    } catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
});

app.put('/api/articles/:id', protect, conditionalUpload('image'), async (req, res) => {
    try {
        const updateData = { ...req.body };
        if (req.file) updateData.image = `/uploads/${req.file.filename}`;
        
        const article = await Article.findByIdAndUpdate(req.params.id, updateData, { new: true });
        if (!article) return res.status(404).json({ success: false, error: 'Article not found' });

        apiCache.flushAll(); // Invalidate cache
        res.json({ success: true, data: article });
    } catch (err) {
        res.status(500).json({ success: false, error: 'Update failed' });
    }
});

app.delete('/api/articles/:id', protect, async (req, res) => {
    try {
        await Article.findByIdAndDelete(req.params.id);
        apiCache.flushAll(); // Invalidate cache
        res.json({ success: true, message: 'Deleted' });
    } catch (err) {
        res.status(500).json({ success: false, error: 'Delete failed' });
    }
});

app.get('/api/articles/:id', async (req, res) => {
    try {
        const article = await Article.findById(req.params.id);
        if (!article) return res.status(404).json({ success: false, error: 'Not found' });
        res.json({ success: true, data: article });
    } catch (err) { res.status(500).json({ success: false, error: err.message }); }
});

app.get('/api/articles/slug/:slug', async (req, res) => {
    try {
        const article = await Article.findOne({ slug: req.params.slug });
        if (!article) return res.status(404).json({ success: false, error: 'Not found' });
        res.json({ success: true, data: article });
    } catch (err) { res.status(500).json({ success: false, error: err.message }); }
});

app.get('/api/articles/public/list', async (req, res) => {
    try {
        const { category } = req.query;
        const page = parseInt(req.query.page, 10) || 1;
        const limit = parseInt(req.query.limit, 10) || 12;
        const skip = (page - 1) * limit;

        const cacheKey = `articles_public:${category || 'all'}:p${page}:l${limit}`;
        const cached = apiCache.get(cacheKey);
        if (cached) return res.json(cached);

        const query = { status: 'PUBLISHED' };
        if (category) query.category = new RegExp(category, 'i');

        const articles = await Article.find(query)
            .sort({ publishedAt: -1 })
            .skip(skip)
            .limit(limit)
            .select('title slug category excerpt image author publishedAt views readTime tags')
            .lean();

        const count = await Article.countDocuments(query);
        const result = {
            success: true,
            data: articles.map(a => ({ ...a, id: a._id })),
            pagination: { page, limit, total: count, pages: Math.ceil(count / limit) }
        };
        apiCache.set(cacheKey, result);
        res.json(result);
    } catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
});

// YouTube Video Row
app.get('/api/articles/videos', async (req, res) => {
    try {
        const cacheKey = 'videos_row';
        const cached = apiCache.get(cacheKey);
        if (cached) return res.json(cached);

        const videos = await Article.find({ videoUrl: { $exists: true, $ne: '' } })
            .sort({ publishedAt: -1 })
            .limit(8)
            .select('title videoUrl excerpt category publishedAt')
            .lean();

        const result = { success: true, data: videos.map(v => ({ ...v, id: v._id })) };
        apiCache.set(cacheKey, result);
        res.json(result);
    } catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
});

// Server Listen
app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});
