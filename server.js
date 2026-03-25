const express = require('express');
const cors = require('cors');
const multer = require('multer');
const path = require('path');
const dotenv = require('dotenv');
const connectDB = require('./config/db');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const helmet = require('helmet');
const mongoSanitize = require('express-mongo-sanitize');
const rateLimit = require('express-rate-limit');
const validator = require('validator');
const cookieParser = require('cookie-parser');
const NodeCache = require('node-cache');
const { body, validationResult } = require('express-validator');

const apiCache = new NodeCache({ stdTTL: 300, checkperiod: 60 });

dotenv.config();

if (!process.env.JWT_SECRET) {
    console.error('❌ FATAL: JWT_SECRET environment variable is not set.');
    process.exit(1);
}

connectDB();

const Article = require('./models/Article');
const User = require('./models/User');
const Video = require('./models/Video');
const Event = require('./models/Event');
const Interview = require('./models/Interview');
const News = require('./models/News');
const IndustryUpdate = require('./models/IndustryUpdate');
const Client = require('./models/Client');
const Advertisement = require('./models/Advertisement');

const app = express();
const PORT = process.env.PORT || 3000;

app.set('trust proxy', 1);

app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

if (process.env.NODE_ENV === 'production') {
    app.use(express.static(path.join(__dirname, 'client', 'dist')));
}

app.use(helmet({ contentSecurityPolicy: false }));
app.use(cookieParser());
app.use(cors({ origin: true, credentials: true }));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

const protect = async (req, res, next) => {
    const token = req.cookies.adminToken || (req.headers.authorization && req.headers.authorization.split(' ')[1]);
    if (!token) return res.status(401).json({ success: false, error: 'Not authorized' });
    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        req.user = await User.findById(decoded.id).select('-password');
        next();
    } catch (e) { res.status(401).json({ success: false }); }
};

const storage = multer.diskStorage({
    destination: 'uploads/',
    filename: (req, file, cb) => cb(null, Date.now() + '-' + file.originalname)
});
const upload = multer({ storage });

// API ROUTES

app.get('/api/articles', async (req, res) => {
    try {
        const { category } = req.query;
        const page = parseInt(req.query.page, 10) || 1;
        const limit = parseInt(req.query.limit, 10) || 10;
        const skip = (page - 1) * limit;
        const cacheKey = `articles:${category || 'all'}:p${page}:l${limit}`;

        const cached = apiCache.get(cacheKey);
        if (cached) return res.json(cached);

        const query = category ? { category: new RegExp(category, 'i') } : {};
        const articles = await Article.find(query).sort({ publishedAt: -1 }).skip(skip).limit(limit).lean();
        const count = await Article.countDocuments(query);

        const result = {
            success: true,
            data: articles.map(a => ({ ...a, id: a._id })),
            pagination: { page, limit, total: count, pages: Math.ceil(count / limit) }
        };
        apiCache.set(cacheKey, result);
        res.json(result);
    } catch (err) { res.status(500).json({ success: false, error: err.message }); }
});

app.post('/api/articles', protect, upload.single('image'), async (req, res) => {
    try {
        const articleData = { ...req.body };
        if (req.file) articleData.image = `/uploads/${req.file.filename}`;
        const article = await Article.create(articleData);
        apiCache.flushAll();
        res.status(201).json({ success: true, data: article });
    } catch (err) { res.status(500).json({ success: false, error: err.message }); }
});

app.put('/api/articles/:id', protect, upload.single('image'), async (req, res) => {
    try {
        const updateData = { ...req.body };
        if (req.file) updateData.image = `/uploads/${req.file.filename}`;
        const article = await Article.findByIdAndUpdate(req.params.id, updateData, { new: true });
        apiCache.flushAll();
        res.json({ success: true, data: article });
    } catch (err) { res.status(500).json({ success: false }); }
});

app.delete('/api/articles/:id', protect, async (req, res) => {
    try {
        await Article.findByIdAndDelete(req.params.id);
        apiCache.flushAll();
        res.json({ success: true });
    } catch (e) { res.status(500).json({ success: false }); }
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
    } catch (err) { res.status(500).json({ success: false, error: err.message }); }
});

app.get('/api/articles/slug/:slug', async (req, res) => {
    try {
        const article = await Article.findOne({ slug: req.params.slug });
        if (!article) return res.status(404).json({ success: false });
        res.json({ success: true, data: article });
    } catch (e) { res.status(500).json({ success: false }); }
});

// Video highlights for row
app.get('/api/articles/videos', async (req, res) => {
    try {
        const videos = await Article.find({ videoUrl: { $exists: true, $ne: '' } })
            .sort({ publishedAt: -1 })
            .limit(8)
            .lean();
        res.json({ success: true, data: videos.map(v => ({ ...v, id: v._id })) });
    } catch (err) { res.status(500).json({ success: false }); }
});

// Admin stats
app.get('/api/stats', async (req, res) => {
    try {
        const stats = {
            articles: await Article.countDocuments(),
            videos: await Article.countDocuments({ videoUrl: { $exists: true, $ne: '' } }),
            categories: (await Article.distinct('category')).length
        };
        res.json({ success: true, data: stats });
    } catch (err) { res.status(500).json({ success: false }); }
});

// Auth
app.post('/api/admin/login', async (req, res) => {
    const { username, password } = req.body;
    try {
        const user = await User.findOne({ email: username });
        if (!user || !(await bcrypt.compare(password, user.password))) {
            return res.status(401).json({ success: false, error: 'Invalid credentials' });
        }
        const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET, { expiresIn: '30d' });
        res.cookie('adminToken', token, { httpOnly: true, secure: true, sameSite: 'strict' });
        res.json({ success: true, sessionId: token, user: { name: user.name, role: user.role } });
    } catch (e) { res.status(500).json({ success: false }); }
});

if (process.env.NODE_ENV === 'production') {
    app.get('*', (req, res) => {
        res.sendFile(path.join(__dirname, 'client', 'dist', 'index.html'));
    });
}

app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});
