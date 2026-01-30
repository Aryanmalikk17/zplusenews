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
const xss = require('xss-clean');
const validator = require('validator');

// Load env vars
dotenv.config();

// Connect to Database (non-blocking - server will start even if DB fails)
connectDB().then(connected => {
    if (!connected) {
        console.warn('⚠️ Server starting without database connection');
        console.warn('⚠️ Static pages will work, but API calls requiring DB will fail');
    }
});

// Models
const Article = require('./models/Article');
const Event = require('./models/Event');
const Interview = require('./models/Interview');
const News = require('./models/News');
const IndustryUpdate = require('./models/IndustryUpdate');
const Client = require('./models/Client');
const User = require('./models/User');
const Advertisement = require('./models/Advertisement');
const Video = require('./models/Video');


const app = express();
const PORT = process.env.PORT || 3000;

// Trust proxy - Required for Render and other reverse proxies
// This allows express-rate-limit to correctly identify users behind proxies
app.set('trust proxy', 1);

// Security Middleware
// Set security headers
app.use(helmet({
    contentSecurityPolicy: {
        directives: {
            defaultSrc: ["'self'"],
            styleSrc: ["'self'", "'unsafe-inline'", "https://cdnjs.cloudflare.com", "https://fonts.googleapis.com"],
            scriptSrc: ["'self'", "'unsafe-inline'", "'unsafe-eval'", "https://cdnjs.cloudflare.com", "https://www.googletagmanager.com", "https://pagead2.googlesyndication.com"],
            imgSrc: ["'self'", "data:", "https:", "http:"],
            fontSrc: ["'self'", "https://cdnjs.cloudflare.com", "https://fonts.gstatic.com"],
            connectSrc: ["'self'", "https://zplusenews.com"],
            frameSrc: ["'self'", "https://www.youtube.com"],
        }
    },
    crossOriginEmbedderPolicy: false,
    crossOriginResourcePolicy: { policy: "cross-origin" }
}));

// Rate limiting
const limiter = rateLimit({
    windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS) || 15 * 60 * 1000, // 15 minutes
    max: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS) || 100, // limit each IP to 100 requests per windowMs
    message: 'Too many requests from this IP, please try again later.',
    standardHeaders: true,
    legacyHeaders: false,
});

// Apply rate limiting to API routes
app.use('/api/', limiter);

// Stricter rate limit for authentication
const authLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 5, // limit each IP to 5 login requests per windowMs
    message: 'Too many login attempts from this IP, please try again after 15 minutes.'
});

// Data sanitization against NoSQL query injection
app.use(mongoSanitize());

// Data sanitization against XSS
app.use(xss());

// CORS Configuration with whitelist
const allowedOrigins = (process.env.CORS_ORIGIN || '')
    .split(',')
    .map(origin => origin.trim())
    .filter(origin => origin.length > 0);

if (allowedOrigins.length === 0) {
    // Default allowed origins if not configured
    allowedOrigins.push(
        'https://zplusenews.com',
        'https://www.zplusenews.com',
        'https://zplusenews.onrender.com',
        'http://localhost:3000'
    );
}

const corsOptions = {
    origin: function (origin, callback) {
        // Allow requests with no origin (like mobile apps or curl requests)
        if (!origin) return callback(null, true);
        
        if (allowedOrigins.indexOf(origin) !== -1 || process.env.NODE_ENV === 'development') {
            callback(null, true);
        } else {
            callback(new Error('Not allowed by CORS'));
        }
    },
    credentials: true,
    optionsSuccessStatus: 200
};

// Middleware
app.use(cors(corsOptions));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Serve React client build in production
if (process.env.NODE_ENV === 'production') {
    app.use(express.static(path.join(__dirname, 'client', 'dist')));
} else {
    // Development: serve root directory for any legacy static files
    app.use(express.static(path.join(__dirname)));
}

// Configure Multer for File Uploads
const storage = multer.diskStorage({
    destination: (req, file, cb) => cb(null, 'uploads/'),
    filename: (req, file, cb) => cb(null, Date.now() + '-' + file.originalname)
});
const upload = multer({ storage });
const conditionalUpload = (fieldName) => (req, res, next) => {
    if (req.is('json')) return next();
    return upload.single(fieldName)(req, res, next);
};


// ============ Helper Functions ============
const generateToken = (id) => {
    if (!process.env.JWT_SECRET) {
        throw new Error('JWT_SECRET is not defined in environment variables');
    }
    return jwt.sign({ id }, process.env.JWT_SECRET, { expiresIn: process.env.JWT_EXPIRE || '30d' });
};

// ============ Middleware ============
const protect = async (req, res, next) => {
    let token;

    if (!process.env.JWT_SECRET) {
        return res.status(500).json({ success: false, error: 'Server configuration error' });
    }

    if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
        try {
            token = req.headers.authorization.split(' ')[1];
            const decoded = jwt.verify(token, process.env.JWT_SECRET);
            req.user = await User.findById(decoded.id).select('-password');
            
            if (!req.user) {
                return res.status(401).json({ success: false, error: 'User not found' });
            }
            
            next();
        } catch (error) {
            console.error('Token verification error:', error);
            res.status(401).json({ success: false, error: 'Not authorized, token failed' });
        }
    } else if (req.headers['session-id']) {
        // Backward compatibility for existing frontend using session-id header
        try {
            token = req.headers['session-id'];
            const decoded = jwt.verify(token, process.env.JWT_SECRET);
            req.user = await User.findById(decoded.id).select('-password');
            
            if (!req.user) {
                return res.status(401).json({ success: false, error: 'User not found' });
            }
            
            next();
        } catch (error) {
            res.status(401).json({ success: false, error: 'Not authorized, invalid session' });
        }
    } else {
        res.status(401).json({ success: false, error: 'Not authorized, no token' });
    }
};

// ============ CurrentsAPI Routes (News Proxy) ============
const currentsRoutes = require('./routes/currentsRoutes');
app.use('/api/news', currentsRoutes);

// ============ Setup Route (Emergency Seed) ============

// Health Check Endpoint
app.get('/api/health', async (req, res) => {
    try {
        // Check database connection
        const dbStatus = require('mongoose').connection.readyState === 1 ? 'connected' : 'disconnected';
        
        res.json({
            status: 'ok',
            timestamp: new Date().toISOString(),
            database: dbStatus,
            uptime: process.uptime(),
            environment: process.env.NODE_ENV || 'production'
        });
    } catch (error) {
        res.status(500).json({
            status: 'error',
            error: error.message
        });
    }
});

app.get('/api/setup-production', async (req, res) => {
    // Basic protection using query param from environment
    const setupKey = process.env.SETUP_KEY || 'secure_setup_123';
    
    if (req.query.key !== setupKey) {
        return res.status(403).send('Forbidden: Invalid Setup Key. Use ?key=YOUR_SETUP_KEY');
    }

    try {
        // 1. Create OR Update Admin
        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash('admin123', salt);

        // Search by email OR name to find existing admin (case-insensitive)
        let admin = await User.findOne({ 
            $or: [
                { email: 'admin@zplusenews.com' },
                { name: { $regex: /^admin$/i } }
            ]
        });
        
        if (!admin) {
            admin = await User.create({
                name: 'admin',
                email: 'admin@zplusenews.com',
                password: hashedPassword,
                role: 'ADMIN',
                status: 'APPROVED'
            });
            console.log('Setup: Admin Created');
        } else {
            // FORCE RESET PASSWORD, name, and ensure approved status
            admin.name = 'admin';  // Normalize to lowercase
            admin.password = hashedPassword;
            admin.status = 'APPROVED';
            admin.role = 'ADMIN';
            await admin.save();
            console.log('Setup: Admin Password Reset');
        }

        // Helper to slugify
        const slugify = (text) => text.toString().toLowerCase()
            .replace(/\s+/g, '-')           // Replace spaces with -
            .replace(/[^\w\-]+/g, '')       // Remove all non-word chars
            .replace(/\-\-+/g, '-')         // Replace multiple - with single -
            .replace(/^-+/, '')             // Trim - from start of text
            .replace(/-+$/, '');            // Trim - from end of text

        // 2. Data to Seed
        const seedData = {
            articles: [
                {
                    title: "Tata Group and Intel Announce Strategic Alliance for Semiconductor Manufacturing",
                    slug: slugify("Tata Group and Intel Announce Strategic Alliance for Semiconductor Manufacturing"),
                    category: "Technology",
                    author: "Business Desk",
                    content: "Tata Group and Intel Corporation announced a strategic alliance to explore collaboration in consumer and enterprise hardware enablement, and semiconductor and systems manufacturing to support India's domestic semiconductor ecosystem.",
                    date: "2025-12-08"
                },
                {
                    title: "Microsoft Announces $17.5 Billion Investment in India's AI Infrastructure",
                    slug: slugify("Microsoft Announces $17.5 Billion Investment in India's AI Infrastructure"),
                    category: "Technology",
                    author: "Tech Reporter",
                    content: "Microsoft announced its largest investment in Asia, committing US$17.5 billion over four years (CY 2026 to 2029) to advance India's cloud and artificial intelligence (AI) infrastructure.",
                    date: "2025-12-12"
                },
                {
                    title: "Sensex Surges to 85,221 as Markets Break Three-Day Losing Streak",
                    slug: slugify("Sensex Surges to 85,221 as Markets Break Three-Day Losing Streak"),
                    category: "Markets",
                    author: "Market Analyst",
                    content: "Indian equity indices broke a three-day losing streak, with the Nifty closing near 25,900 and the Sensex at 84,818.13, both supported by positive global cues.",
                    date: "2025-12-12"
                },
                {
                    title: "India's Wealth Creation Reaches ₹148 Trillion from 2020-2025",
                    slug: slugify("India's Wealth Creation Reaches ₹148 Trillion from 2020-2025"),
                    category: "Economy",
                    author: "Economic Affairs",
                    content: "India's wealth creation reached ₹148 trillion from 2020-2025, with Bharti Airtel leading the wealth creation charts.",
                    date: "2025-12-10"
                }
            ],
            events: [
                {
                    name: "E-Summit 2025: Asia's Largest Business Conclave",
                    date: "2025-12-11",
                    location: "IIT Bombay, Mumbai",
                    description: "Asia's largest business conclave, focusing on groundbreaking ideas and visionary solutions.",
                },
                {
                    name: "Bengaluru Tech Summit 2025",
                    date: "2025-11-19",
                    location: "Bangalore Palace Grounds",
                    description: "A broad-based technology summit covering IT, innovation, IoT, and digital transformation.",
                }
            ],
            interviews: [
                {
                    intervieweeName: "Roshni Nadar Malhotra",
                    designation: "Chairperson",
                    company: "HCLTech",
                    title: "Discussing India's AI Future and Women's Leadership in Tech",
                    summary: "Discussing India's AI Future and Women's Leadership in Tech at Davos 2024."
                },
                {
                    intervieweeName: "Satya Nadella",
                    designation: "Chairman & CEO",
                    company: "Microsoft",
                    title: "Microsoft's Commitment to India's Digital Transformation",
                    summary: "Microsoft's Commitment to India's Digital Transformation and AI investment."
                }
            ],
            industry: [
                {
                    sector: "Semiconductor",
                    title: "India's Semiconductor Boom",
                    description: "With Tata-Intel alliance and government incentives, India is positioning itself as a major hub."
                }
            ],
            clients: [
                { name: "Tata Group", type: "Corporate" },
                { name: "Reliance Industries", type: "Corporate" }
            ]
        };

        // 3. Clear and Insert Data (Upsert style to avoid dupes or just simple insert?)
        // Let's check counts to be safe, or just insert. For setup, we'll try to insert if empty.

        let logs = [];

        // Articles
        const articleCount = await Article.countDocuments();
        if (articleCount === 0) {
            await Article.insertMany(seedData.articles);
            logs.push(`✅ Added ${seedData.articles.length} Articles`);
        } else {
            logs.push(`ℹ️ Articles already exist (${articleCount})`);
        }

        // Events
        const eventCount = await Event.countDocuments();
        if (eventCount === 0) {
            await Event.insertMany(seedData.events);
            logs.push(`✅ Added ${seedData.events.length} Events`);
        } else {
            logs.push(`ℹ️ Events already exist (${eventCount})`);
        }

        // Interviews
        const interviewCount = await Interview.countDocuments();
        if (interviewCount === 0) {
            await Interview.insertMany(seedData.interviews);
            logs.push(`✅ Added ${seedData.interviews.length} Interviews`);
        }

        // Industry 
        const indCount = await IndustryUpdate.countDocuments();
        if (indCount === 0) {
            await IndustryUpdate.insertMany(seedData.industry);
            logs.push(`✅ Added ${seedData.industry.length} Industry Updates`);
        }

        // Clients
        const clientCount = await Client.countDocuments();
        if (clientCount === 0) {
            await Client.insertMany(seedData.clients);
            logs.push(`✅ Added ${seedData.clients.length} Clients`);
        }

        res.send(`
            <h1>Setup Complete 🚀</h1>
            <p>Admin User: Verified/Created</p>
            <ul>
                ${logs.map(l => `<li>${l}</li>`).join('')}
            </ul>
            <p><a href="/admin-login.html">Login to Admin Panel</a></p>
        `);

    } catch (err) {
        console.error(err);
        res.status(500).send('Setup Failed: ' + err.message);
    }
});


// ============ API Routes ============

// Auth & Users
app.post('/api/admin/login', authLimiter, async (req, res) => {
    const { username, password } = req.body;
    
    // Input validation
    if (!username || !password) {
        return res.status(400).json({ success: false, error: 'Username and password are required' });
    }
    
    // Trim input - don't escape to preserve email @ symbol
    const trimmedUsername = username.trim();
    
    if (!validator.isLength(trimmedUsername, { min: 3, max: 50 })) {
        return res.status(400).json({ success: false, error: 'Invalid username length' });
    }
    
    try {
        // Search by name OR email (case-insensitive for email)
        let user = await User.findOne({ 
            $or: [
                { name: trimmedUsername }, 
                { email: trimmedUsername.toLowerCase() }
            ] 
        });

        if (user && (await bcrypt.compare(password, user.password))) {
            // Check if user is approved
            if (user.status === 'PENDING') {
                return res.status(403).json({ success: false, error: 'Your account is pending approval. Please wait for admin approval.' });
            }
            if (user.status === 'REJECTED') {
                return res.status(403).json({ success: false, error: 'Your account has been rejected. Please contact support.' });
            }
            
            res.json({
                success: true,
                sessionId: generateToken(user._id),
                user: { id: user._id, name: user.name, role: user.role, status: user.status }
            });
        } else {
            res.status(401).json({ success: false, error: 'Invalid credentials' });
        }
    } catch (err) {
        console.error('Login error:', err);
        res.status(500).json({ success: false, error: 'Server error' });
    }
});

// Admin Registration (First admin auto-approved, others pending)
app.post('/api/admin/register', async (req, res) => {
    const { name, email, password, setupKey } = req.body;
    
    try {
        // Check if any approved admin already exists
        const approvedAdminCount = await User.countDocuments({ role: 'ADMIN', status: 'APPROVED' });
        const isFirstAdmin = approvedAdminCount === 0;
        
        // Validate inputs
        if (!name || !email || !password) {
            return res.status(400).json({ 
                success: false, 
                error: 'Name, email, and password are required' 
            });
        }
        
        if (!validator.isEmail(email)) {
            return res.status(400).json({ 
                success: false, 
                error: 'Invalid email address' 
            });
        }
        
        if (password.length < 8) {
            return res.status(400).json({ 
                success: false, 
                error: 'Password must be at least 8 characters' 
            });
        }
        
        // Check if user already exists
        const existingUser = await User.findOne({ 
            $or: [{ email }, { name }] 
        });
        
        if (existingUser) {
            return res.status(400).json({ 
                success: false, 
                error: 'User with this email or username already exists' 
            });
        }
        
        // Create new admin user
        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(password, salt);
        
        const user = await User.create({
            name: validator.escape(name.trim()),
            email: email.toLowerCase().trim(),
            password: hashedPassword,
            role: 'ADMIN',
            status: isFirstAdmin ? 'APPROVED' : 'PENDING' // First admin auto-approved
        });
        
        if (isFirstAdmin) {
            // First admin - auto-login
            res.status(201).json({
                success: true,
                message: 'Admin account created and approved successfully',
                sessionId: generateToken(user._id),
                user: { id: user._id, name: user.name, role: user.role, status: user.status }
            });
        } else {
            // Additional admin - pending approval
            res.status(201).json({
                success: true,
                message: 'Registration submitted. Awaiting admin approval.',
                requiresApproval: true
            });
        }
        
    } catch (err) {
        console.error('Registration error:', err);
        res.status(500).json({ 
            success: false, 
            error: 'Failed to create admin account' 
        });
    }
});

// Check if first admin exists
app.get('/api/admin/check-first-setup', async (req, res) => {
    try {
        const adminExists = await User.findOne({ role: 'ADMIN', status: 'APPROVED' });
        res.json({ 
            success: true, 
            requiresSetup: !adminExists 
        });
    } catch (err) {
        res.status(500).json({ 
            success: false, 
            error: 'Server error' 
        });
    }
});

// Get pending user registrations (admin only)
app.get('/api/admin/pending-users', protect, async (req, res) => {
    try {
        if (req.user.role !== 'ADMIN' || req.user.status !== 'APPROVED') {
            return res.status(403).json({ success: false, error: 'Access denied' });
        }
        
        const pendingUsers = await User.find({ status: 'PENDING' })
            .select('-password')
            .sort({ joinedAt: -1 });
        
        res.json({
            success: true,
            users: pendingUsers
        });
    } catch (err) {
        console.error('Error fetching pending users:', err);
        res.status(500).json({ success: false, error: 'Server error' });
    }
});

// Approve user registration (admin only)
app.post('/api/admin/approve-user/:userId', protect, async (req, res) => {
    try {
        if (req.user.role !== 'ADMIN' || req.user.status !== 'APPROVED') {
            return res.status(403).json({ success: false, error: 'Access denied' });
        }
        
        const user = await User.findById(req.params.userId);
        if (!user) {
            return res.status(404).json({ success: false, error: 'User not found' });
        }
        
        if (user.status !== 'PENDING') {
            return res.status(400).json({ success: false, error: 'User is not pending approval' });
        }
        
        user.status = 'APPROVED';
        user.approvedBy = req.user._id;
        user.approvedAt = new Date();
        await user.save();
        
        res.json({
            success: true,
            message: 'User approved successfully',
            user: {
                id: user._id,
                name: user.name,
                email: user.email,
                status: user.status
            }
        });
    } catch (err) {
        console.error('Error approving user:', err);
        res.status(500).json({ success: false, error: 'Server error' });
    }
});

// Reject user registration (admin only)
app.post('/api/admin/reject-user/:userId', protect, async (req, res) => {
    try {
        if (req.user.role !== 'ADMIN' || req.user.status !== 'APPROVED') {
            return res.status(403).json({ success: false, error: 'Access denied' });
        }
        
        const { reason } = req.body;
        const user = await User.findById(req.params.userId);
        
        if (!user) {
            return res.status(404).json({ success: false, error: 'User not found' });
        }
        
        if (user.status !== 'PENDING') {
            return res.status(400).json({ success: false, error: 'User is not pending approval' });
        }
        
        user.status = 'REJECTED';
        user.rejectionReason = reason || 'No reason provided';
        await user.save();
        
        res.json({
            success: true,
            message: 'User rejected successfully'
        });
    } catch (err) {
        console.error('Error rejecting user:', err);
        res.status(500).json({ success: false, error: 'Server error' });
    }
});

// Get employee statistics (for employee panel)
app.get('/api/employee/my-stats', protect, async (req, res) => {
    try {
        const userId = req.user._id;
        
        const videos = await Video.countDocuments({ createdBy: userId });
        const events = await Event.countDocuments({ createdBy: userId });
        const advertisements = await Advertisement.countDocuments({ createdBy: userId });
        
        res.json({
            success: true,
            stats: {
                videos,
                events,
                advertisements
            }
        });
    } catch (err) {
        console.error('Error fetching employee stats:', err);
        res.status(500).json({ success: false, error: 'Server error' });
    }
});

// Get all employees with their activity stats (admin only)
app.get('/api/admin/employees-progress', protect, async (req, res) => {
    try {
        if (req.user.role !== 'ADMIN' || req.user.status !== 'APPROVED') {
            return res.status(403).json({ success: false, error: 'Access denied' });
        }
        
        const employees = await User.find({ status: 'APPROVED' }).select('-password');
        
        const employeesWithStats = await Promise.all(employees.map(async (employee) => {
            const videos = await Video.countDocuments({ createdBy: employee._id });
            const events = await Event.countDocuments({ createdBy: employee._id });
            const advertisements = await Advertisement.countDocuments({ createdBy: employee._id });
            
            // Get recent activity
            const recentVideos = await Video.find({ createdBy: employee._id })
                .sort({ createdAt: -1 })
                .limit(5)
                .select('title createdAt');
            const recentEvents = await Event.find({ createdBy: employee._id })
                .sort({ createdAt: -1 })
                .limit(5)
                .select('name createdAt');
            const recentAds = await Advertisement.find({ createdBy: employee._id })
                .sort({ createdAt: -1 })
                .limit(5)
                .select('title createdAt');
            
            return {
                id: employee._id,
                name: employee.name,
                email: employee.email,
                role: employee.role,
                avatar: employee.avatar,
                joinedAt: employee.joinedAt,
                stats: {
                    videos,
                    events,
                    advertisements,
                    total: videos + events + advertisements
                },
                recentActivity: [
                    ...recentVideos.map(v => ({ type: 'video', title: v.title, date: v.createdAt })),
                    ...recentEvents.map(e => ({ type: 'event', title: e.name, date: e.createdAt })),
                    ...recentAds.map(a => ({ type: 'ad', title: a.title, date: a.createdAt }))
                ].sort((a, b) => new Date(b.date) - new Date(a.date)).slice(0, 10)
            };
        }));
        
        res.json({
            success: true,
            employees: employeesWithStats
        });
    } catch (err) {
        console.error('Error fetching employee progress:', err);
        res.status(500).json({ success: false, error: 'Server error' });
    }
});

// Get advertisement analytics (admin only)
app.get('/api/admin/advertisement-analytics', protect, async (req, res) => {
    try {
        if (req.user.role !== 'ADMIN' || req.user.status !== 'APPROVED') {
            return res.status(403).json({ success: false, error: 'Access denied' });
        }
        
        const ads = await Advertisement.find().populate('createdBy', 'name email');
        
        const totalImpressions = ads.reduce((sum, ad) => sum + (ad.metrics?.impressions || 0), 0);
        const totalClicks = ads.reduce((sum, ad) => sum + (ad.metrics?.clicks || 0), 0);
        const avgCTR = totalImpressions > 0 ? ((totalClicks / totalImpressions) * 100).toFixed(2) : 0;
        
        const adsByPosition = {};
        ads.forEach(ad => {
            if (!adsByPosition[ad.position]) {
                adsByPosition[ad.position] = { count: 0, impressions: 0, clicks: 0 };
            }
            adsByPosition[ad.position].count++;
            adsByPosition[ad.position].impressions += ad.metrics?.impressions || 0;
            adsByPosition[ad.position].clicks += ad.metrics?.clicks || 0;
        });
        
        res.json({
            success: true,
            analytics: {
                totalAds: ads.length,
                activeAds: ads.filter(ad => ad.status === 'active').length,
                totalImpressions,
                totalClicks,
                avgCTR,
                adsByPosition,
                topPerformers: ads
                    .map(ad => ({
                        id: ad._id,
                        title: ad.title,
                        impressions: ad.metrics?.impressions || 0,
                        clicks: ad.metrics?.clicks || 0,
                        ctr: ad.ctr,
                        createdBy: ad.createdBy?.name || 'Unknown'
                    }))
                    .sort((a, b) => parseFloat(b.ctr) - parseFloat(a.ctr))
                    .slice(0, 10)
            }
        });
    } catch (err) {
        console.error('Error fetching ad analytics:', err);
        res.status(500).json({ success: false, error: 'Server error' });
    }
});

// Get website analytics (admin only)
app.get('/api/admin/website-analytics', protect, async (req, res) => {
    try {
        if (req.user.role !== 'ADMIN' || req.user.status !== 'APPROVED') {
            return res.status(403).json({ success: false, error: 'Access denied' });
        }
        
        const totalVideos = await Video.countDocuments();
        const totalEvents = await Event.countDocuments();
        const totalAds = await Advertisement.countDocuments();
        const totalUsers = await User.countDocuments({ status: 'APPROVED' });
        
        // Content by category
        const videosByCategory = await Video.aggregate([
            { $group: { _id: '$category', count: { $sum: 1 } } }
        ]);
        
        // Recent content
        const recentVideos = await Video.find().sort({ createdAt: -1 }).limit(10).populate('createdBy', 'name');
        const recentEvents = await Event.find().sort({ createdAt: -1 }).limit(10).populate('createdBy', 'name');
        
        // Monthly stats
        const thirtyDaysAgo = new Date();
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
        
        const videosThisMonth = await Video.countDocuments({ createdAt: { $gte: thirtyDaysAgo } });
        const eventsThisMonth = await Event.countDocuments({ createdAt: { $gte: thirtyDaysAgo } });
        const adsThisMonth = await Advertisement.countDocuments({ createdAt: { $gte: thirtyDaysAgo } });
        
        res.json({
            success: true,
            analytics: {
                totals: {
                    videos: totalVideos,
                    events: totalEvents,
                    advertisements: totalAds,
                    users: totalUsers
                },
                thisMonth: {
                    videos: videosThisMonth,
                    events: eventsThisMonth,
                    advertisements: adsThisMonth
                },
                videosByCategory,
                recentContent: {
                    videos: recentVideos,
                    events: recentEvents
                }
            }
        });
    } catch (err) {
        console.error('Error fetching website analytics:', err);
        res.status(500).json({ success: false, error: 'Server error' });
    }
});

app.get('/api/admin/verify-session', async (req, res) => {
    const token = req.headers['session-id'];
    if (!token) return res.json({ valid: false });

    if (!process.env.JWT_SECRET) {
        return res.status(500).json({ valid: false, error: 'Server configuration error' });
    }

    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        const user = await User.findById(decoded.id);
        if (user) {
            res.json({ valid: true, user: { id: user._id, name: user.name } });
        } else {
            res.json({ valid: false });
        }
    } catch (error) {
        res.json({ valid: false });
    }
});

// Admin Stats
app.get('/api/stats', protect, async (req, res) => {
    try {
        const stats = {
            articles: await Article.countDocuments(),
            events: await Event.countDocuments(),
            interviews: await Interview.countDocuments(),
            users: await User.countDocuments(),
            videos: await Video.countDocuments(),
            advertisements: await Advertisement.countDocuments(),
            totalViews: 0 // Could be calculated from video views if needed
        };
        res.json({ success: true, data: stats });
    } catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
});

// Articles
app.get('/api/articles', async (req, res) => {
    try {
        const { category, page = 1, limit = 10 } = req.query;
        const query = category ? { category: new RegExp(category, 'i') } : {};

        const articles = await Article.find(query)
            .sort({ publishedAt: -1 })
            .limit(limit * 1)
            .skip((page - 1) * limit);

        const count = await Article.countDocuments(query);

        res.json({
            success: true,
            data: articles.map(a => ({ ...a._doc, id: a._id })),
            pagination: { page: +page, limit: +limit, total: count, pages: Math.ceil(count / limit) }
        });
    } catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
});

app.post('/api/articles', protect, conditionalUpload('image'), async (req, res) => {
    try {
        const { title, slug, category, excerpt, content, author, tags, videoUrl } = req.body;

        let parsedAuthor = author;
        if (typeof author === 'string') {
            try { parsedAuthor = JSON.parse(author); } catch { parsedAuthor = { name: author, avatar: '' }; }
        }
        if (!parsedAuthor) parsedAuthor = { name: req.user.name || 'ZPluse News Team' };

        let parsedTags = tags;
        if (typeof tags === 'string') {
            try { parsedTags = JSON.parse(tags); } catch { parsedTags = []; }
        }

        const article = await Article.create({
            title,
            slug: slug || (title ? title.toLowerCase().replace(/[^a-z0-9]+/g, '-') : undefined),
            category,
            excerpt,
            content,
            image: req.file ? `/uploads/${req.file.filename}` : undefined,
            author: parsedAuthor,
            tags: parsedTags,
            videoUrl
        });

        res.status(201).json({ success: true, data: { ...article._doc, id: article._id } });
    } catch (err) {
        console.error(err);
        res.status(500).json({ success: false, error: 'Failed to create article: ' + err.message });
    }
});

app.put('/api/articles/:id', protect, upload.single('image'), async (req, res) => {
    try {
        const updateData = { ...req.body };
        if (req.file) updateData.image = `/uploads/${req.file.filename}`;

        const article = await Article.findByIdAndUpdate(req.params.id, updateData, { new: true });
        if (!article) return res.status(404).json({ success: false, error: 'Article not found' });

        res.json({ success: true, data: { ...article._doc, id: article._id } });
    } catch (err) {
        res.status(500).json({ success: false, error: 'Update failed' });
    }
});

app.delete('/api/articles/:id', protect, async (req, res) => {
    try {
        await Article.findByIdAndDelete(req.params.id);
        res.json({ success: true, message: 'Deleted' });
    } catch (err) {
        res.status(500).json({ success: false, error: 'Delete failed' });
    }
});

// Get single article by ID (public)
app.get('/api/articles/:id', async (req, res) => {
    try {
        const article = await Article.findById(req.params.id);
        if (!article) {
            return res.status(404).json({ success: false, error: 'Article not found' });
        }
        res.json({ success: true, data: { ...article._doc, id: article._id } });
    } catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
});

// Get article by slug (public)
app.get('/api/articles/slug/:slug', async (req, res) => {
    try {
        const article = await Article.findOne({ slug: req.params.slug });
        if (!article) {
            return res.status(404).json({ success: false, error: 'Article not found' });
        }
        res.json({ success: true, data: { ...article._doc, id: article._id } });
    } catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
});

// Get published articles (public - for frontend)
app.get('/api/articles/public/list', async (req, res) => {
    try {
        const { category, page = 1, limit = 12 } = req.query;
        const query = { status: 'PUBLISHED' };
        if (category) query.category = new RegExp(category, 'i');

        const articles = await Article.find(query)
            .sort({ publishedAt: -1 })
            .limit(limit * 1)
            .skip((page - 1) * limit)
            .select('title slug category excerpt image author publishedAt views readTime tags');

        const count = await Article.countDocuments(query);

        res.json({
            success: true,
            data: articles.map(a => ({ ...a._doc, id: a._id })),
            pagination: { page: +page, limit: +limit, total: count, pages: Math.ceil(count / limit) }
        });
    } catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
});

// Increment article view count
app.put('/api/articles/:id/view', async (req, res) => {
    try {
        const article = await Article.findByIdAndUpdate(
            req.params.id,
            { $inc: { views: 1 } },
            { new: true }
        );
        if (!article) {
            return res.status(404).json({ success: false, error: 'Article not found' });
        }
        res.json({ success: true, views: article.views });
    } catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
});

// Events
app.get('/api/events', async (req, res) => {
    const events = await Event.find().sort({ date: 1 });
    res.json({ success: true, data: events.map(e => ({ ...e._doc, id: e._id })) });
});

app.get('/api/events/:id', async (req, res) => {
    try {
        const event = await Event.findById(req.params.id);
        if (!event) return res.status(404).json({ success: false, error: 'Event not found' });
        res.json({ success: true, data: { ...event._doc, id: event._id } });
    } catch (err) { res.status(500).json({ success: false, error: err.message }); }
});

app.post('/api/events', protect, conditionalUpload('image'), async (req, res) => {
    try {
        const event = await Event.create({ ...req.body, image: req.file ? `/uploads/${req.file.filename}` : undefined, createdBy: req.user._id });
        res.status(201).json({ success: true, data: { ...event._doc, id: event._id } });
    } catch (err) { res.status(500).json({ success: false, error: err.message }); }
});

app.put('/api/events/:id', protect, conditionalUpload('image'), async (req, res) => {
    try {
        const updateData = { ...req.body };
        if (req.file) updateData.image = `/uploads/${req.file.filename}`;

        const event = await Event.findByIdAndUpdate(req.params.id, updateData, { new: true });
        if (!event) return res.status(404).json({ success: false, error: 'Event not found' });

        res.json({ success: true, data: { ...event._doc, id: event._id } });
    } catch (err) { res.status(500).json({ success: false, error: err.message }); }
});

app.delete('/api/events/:id', protect, async (req, res) => {
    try { await Event.findByIdAndDelete(req.params.id); res.json({ success: true }); }
    catch (e) { res.status(500).json({ success: false }); }
});

// Interviews
app.get('/api/interviews', async (req, res) => {
    try {
        const items = await Interview.find().sort({ publishedAt: -1 });
        res.json({ success: true, data: items.map(i => ({ ...i._doc, id: i._id })) });
    } catch (e) { res.status(500).json({ success: false }); }
});
app.post('/api/interviews', protect, conditionalUpload('image'), async (req, res) => {
    try {
        const item = await Interview.create({ ...req.body, image: req.file ? `/uploads/${req.file.filename}` : undefined });
        res.status(201).json({ success: true, data: { ...item._doc, id: item._id } });
    } catch (err) { res.status(500).json({ success: false, error: err.message }); }
});

app.put('/api/interviews/:id', protect, conditionalUpload('image'), async (req, res) => {
    try {
        const updateData = { ...req.body };
        if (req.file) updateData.image = `/uploads/${req.file.filename}`;

        const item = await Interview.findByIdAndUpdate(req.params.id, updateData, { new: true });
        res.json({ success: true, data: { ...item._doc, id: item._id } });
    } catch (err) { res.status(500).json({ success: false, error: err.message }); }
});

app.delete('/api/interviews/:id', protect, async (req, res) => {
    try { await Interview.findByIdAndDelete(req.params.id); res.json({ success: true }); }
    catch (e) { res.status(500).json({ success: false }); }
});

// News
app.get('/api/news', async (req, res) => {
    const items = await News.find().sort({ publishedAt: -1 });
    res.json({ success: true, data: items.map(n => ({ ...n._doc, id: n._id })) });
});
app.post('/api/news', protect, async (req, res) => {
    const item = await News.create(req.body);
    res.status(201).json({ success: true, data: { ...item._doc, id: item._id } });
});

app.put('/api/news/:id', protect, async (req, res) => {
    try {
        const item = await News.findByIdAndUpdate(req.params.id, req.body, { new: true });
        res.json({ success: true, data: { ...item._doc, id: item._id } });
    } catch (err) { res.status(500).json({ success: false, error: err.message }); }
});

app.delete('/api/news/:id', protect, async (req, res) => {
    try { await News.findByIdAndDelete(req.params.id); res.json({ success: true }); }
    catch (e) { res.status(500).json({ success: false }); }
});
// Industry
app.get('/api/industry', async (req, res) => {
    const items = await IndustryUpdate.find().sort({ updatedAt: -1 });
    res.json({ success: true, data: items.map(i => ({ ...i._doc, id: i._id })) });
});

app.post('/api/industry', protect, async (req, res) => {
    const item = await IndustryUpdate.create(req.body);
    res.status(201).json({ success: true, data: { ...item._doc, id: item._id } });
});

app.put('/api/industry/:id', protect, async (req, res) => {
    try {
        const item = await IndustryUpdate.findByIdAndUpdate(req.params.id, req.body, { new: true });
        res.json({ success: true, data: { ...item._doc, id: item._id } });
    } catch (err) { res.status(500).json({ success: false, error: err.message }); }
});

app.delete('/api/industry/:id', protect, async (req, res) => {
    try { await IndustryUpdate.findByIdAndDelete(req.params.id); res.json({ success: true }); }
    catch (e) { res.status(500).json({ success: false }); }
});

// Clients
app.get('/api/clients', async (req, res) => {
    const items = await Client.find({});
    res.json({ success: true, data: items.map(c => ({ ...c._doc, id: c._id })) });
});

app.post('/api/clients', protect, conditionalUpload('logo'), async (req, res) => {
    const item = await Client.create({ ...req.body, logo: req.file ? `/uploads/${req.file.filename}` : undefined });
    res.status(201).json({ success: true, data: { ...item._doc, id: item._id } });
});


app.put('/api/clients/:id', protect, conditionalUpload('logo'), async (req, res) => {
    try {
        const updateData = { ...req.body };
        if (req.file) updateData.logo = `/uploads/${req.file.filename}`;

        const item = await Client.findByIdAndUpdate(req.params.id, updateData, { new: true });
        res.json({ success: true, data: { ...item._doc, id: item._id } });
    } catch (err) { res.status(500).json({ success: false, error: err.message }); }
});

app.delete('/api/clients/:id', protect, async (req, res) => {
    try { await Client.findByIdAndDelete(req.params.id); res.json({ success: true }); }
    catch (e) { res.status(500).json({ success: false }); }
});

// Users
app.get('/api/users', protect, async (req, res) => {
    const users = await User.find({}, '-password'); // Exclude password
    res.json({ success: true, data: users.map(u => ({ ...u._doc, id: u._id })) });
});

app.post('/api/users', protect, async (req, res) => {
    try {
        const user = await User.create(req.body); // Password hash hook handles encryption
        res.status(201).json({ success: true, data: { ...user._doc, id: user._id } });
    } catch (err) {
        res.status(500).json({ success: false, error: 'User creation failed' });
    }
});

app.put('/api/users/:id', protect, async (req, res) => {
    try {
        const updateData = { ...req.body };

        if (updateData.password) {
            const salt = await bcrypt.genSalt(10);
            updateData.password = await bcrypt.hash(updateData.password, salt);
        }

        const user = await User.findByIdAndUpdate(req.params.id, updateData, { new: true });
        res.json({ success: true, data: { ...user._doc, id: user._id } });
    } catch (err) { res.status(500).json({ success: false, error: err.message }); }
});

app.delete('/api/users/:id', protect, async (req, res) => {
    try { await User.findByIdAndDelete(req.params.id); res.json({ success: true }); }
    catch (e) { res.status(500).json({ success: false }); }
});

// Advertisements
app.get('/api/advertisements', async (req, res) => {
    try {
        const { position, status } = req.query;
        const query = {};
        
        // Filter by position if specified
        if (position) query.position = position;
        
        // Filter by status (default to active if not specified for public requests)
        if (status) query.status = status;
        
        const ads = await Advertisement.find(query).sort({ priority: -1, createdAt: -1 });
        
        // Return array directly for frontend compatibility
        res.json(ads.map(a => ({ ...a._doc, id: a._id })));
    } catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
});

app.get('/api/advertisements/:id', async (req, res) => {
    try {
        const ad = await Advertisement.findById(req.params.id);
        if (!ad) return res.status(404).json({ success: false, error: 'Advertisement not found' });
        res.json({ success: true, data: { ...ad._doc, id: ad._id } });
    } catch (err) { res.status(500).json({ success: false, error: err.message }); }
});

// Track ad impression
app.post('/api/advertisements/:id/impression', async (req, res) => {
    try {
        const ad = await Advertisement.findByIdAndUpdate(
            req.params.id,
            { $inc: { 'metrics.impressions': 1 } },
            { new: true }
        );
        if (!ad) return res.status(404).json({ success: false, error: 'Ad not found' });
        res.json({ success: true, impressions: ad.metrics.impressions });
    } catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
});

// Track ad click
app.post('/api/advertisements/:id/click', async (req, res) => {
    try {
        const ad = await Advertisement.findByIdAndUpdate(
            req.params.id,
            { $inc: { 'metrics.clicks': 1 } },
            { new: true }
        );
        if (!ad) return res.status(404).json({ success: false, error: 'Ad not found' });
        res.json({ success: true, clicks: ad.metrics.clicks });
    } catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
});

app.post('/api/advertisements', protect, conditionalUpload('image'), async (req, res) => {
    try {
        const adData = { 
            ...req.body, 
            imageUrl: req.file ? `/uploads/${req.file.filename}` : req.body.imageUrl,
            createdBy: req.user._id 
        };
        
        // Set default size based on position
        if (!adData.size && adData.position) {
            const sizeMap = {
                'horizontal-banner': { width: 970, height: 90 },
                'vertical-sidebar': { width: 300, height: 600 },
                'sidebar-rectangle': { width: 300, height: 250 },
                'inline': { width: 728, height: 90 }
            };
            adData.size = sizeMap[adData.position] || { width: 300, height: 250 };
        }
        
        const ad = await Advertisement.create(adData);
        res.status(201).json({ success: true, data: { ...ad._doc, id: ad._id } });
    } catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
});

app.put('/api/advertisements/:id', protect, conditionalUpload('image'), async (req, res) => {
    try {
        const updateData = { ...req.body, updatedAt: new Date() };
        if (req.file) updateData.imageUrl = `/uploads/${req.file.filename}`;

        const ad = await Advertisement.findByIdAndUpdate(req.params.id, updateData, { new: true });
        if (!ad) return res.status(404).json({ success: false, error: 'Advertisement not found' });

        res.json({ success: true, data: { ...ad._doc, id: ad._id } });
    } catch (err) { res.status(500).json({ success: false, error: err.message }); }
});

app.delete('/api/advertisements/:id', protect, async (req, res) => {
    try { await Advertisement.findByIdAndDelete(req.params.id); res.json({ success: true }); }
    catch (e) { res.status(500).json({ success: false }); }
});

// Videos
app.get('/api/videos', async (req, res) => {
    try {
        const videos = await Video.find().sort({ createdAt: -1 });
        res.json({ success: true, data: videos.map(v => ({ ...v._doc, id: v._id })) });
    } catch (err) { res.status(500).json({ success: false, error: err.message }); }
});

app.get('/api/videos/:id', async (req, res) => {
    try {
        const video = await Video.findById(req.params.id);
        if (!video) return res.status(404).json({ success: false, error: 'Video not found' });
        res.json({ success: true, data: { ...video._doc, id: video._id } });
    } catch (err) { res.status(500).json({ success: false, error: err.message }); }
});

app.post('/api/videos', protect, async (req, res) => {
    try {
        const video = await Video.create({ ...req.body, createdBy: req.user._id });
        res.status(201).json({ success: true, data: { ...video._doc, id: video._id } });
    } catch (err) { res.status(500).json({ success: false, error: err.message }); }
});

app.put('/api/videos/:id', protect, async (req, res) => {
    try {
        const video = await Video.findByIdAndUpdate(req.params.id, req.body, { new: true });
        if (!video) return res.status(404).json({ success: false, error: 'Video not found' });
        res.json({ success: true, data: { ...video._doc, id: video._id } });
    } catch (err) { res.status(500).json({ success: false, error: err.message }); }
});

app.delete('/api/videos/:id', protect, async (req, res) => {
    try {
        await Video.findByIdAndDelete(req.params.id);
        res.json({ success: true, message: 'Video deleted' });
    } catch (err) { res.status(500).json({ success: false, error: err.message }); }
});

// SPA Fallback - Serve React app for any non-API routes (must be after all API routes)
if (process.env.NODE_ENV === 'production') {
    app.get('*', (req, res) => {
        // Don't serve index.html for API routes or file requests
        if (req.path.startsWith('/api/') || req.path.startsWith('/uploads/')) {
            return res.status(404).json({ success: false, error: 'Not found' });
        }
        res.sendFile(path.join(__dirname, 'client', 'dist', 'index.html'));
    });
}

// Start Server
app.listen(PORT, () => {
    console.log(`Server running on port ${PORT} (MongoDB Mode)`);
});
