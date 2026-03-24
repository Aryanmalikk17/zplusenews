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

// In-memory cache: 5-minute TTL for public API responses
const apiCache = new NodeCache({ stdTTL: 300, checkperiod: 60 });

// ============ Startup guard: crash fast on missing critical env vars ============
if (!process.env.JWT_SECRET) {
    console.error('❌ FATAL: JWT_SECRET environment variable is not set. Server cannot start securely.');
    process.exit(1);
}

// Load env vars
dotenv.config();

// Connect to Database (non-blocking - server will start even if DB fails)
connectDB().then(async connected => {
    if (!connected) {
        console.warn('⚠️ Server starting without database connection');
        console.warn('⚠️ Static pages will work, but API calls requiring DB will fail');
    } else {
        // Auto-seed admin user if none exists
        try {
            const User = require('./models/User');
            const bcrypt = require('bcryptjs');
            
            const adminExists = await User.findOne({ 
                $or: [
                    { email: 'admin@zplusenews.com' },
                    { role: 'ADMIN', status: 'APPROVED' }
                ]
            });
            
            if (!adminExists) {
                const defaultPassword = process.env.DEFAULT_ADMIN_PASSWORD;
                if (!defaultPassword) {
                    console.warn('⚠️ Skipping admin seed: DEFAULT_ADMIN_PASSWORD env var is not set.');
                } else {
                    const salt = await bcrypt.genSalt(10);
                    const hashedPassword = await bcrypt.hash(defaultPassword, salt);
                    await User.create({
                        name: 'admin',
                        email: 'admin@zplusenews.com',
                        password: hashedPassword,
                        role: 'ADMIN',
                        status: 'APPROVED'
                    });
                    console.log('✅ Default admin user created: admin@zplusenews.com');
                }
            } else {
                console.log('ℹ️ Admin user already exists');
            }
        } catch (seedError) {
            console.error('⚠️ Failed to seed admin user:', seedError.message);
        }
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

// ============ STATIC FILES FIRST (Before any security middleware) ============
// This ensures static assets are served directly without processing
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Serve React client build in production - MUST be before other middleware
if (process.env.NODE_ENV === 'production') {
    // Serve static assets with proper MIME types
    app.use(express.static(path.join(__dirname, 'client', 'dist'), {
        maxAge: '1d',
        etag: true,
        setHeaders: (res, filePath) => {
            // Set correct MIME types for JavaScript and CSS
            if (filePath.endsWith('.js')) {
                res.setHeader('Content-Type', 'application/javascript');
            } else if (filePath.endsWith('.css')) {
                res.setHeader('Content-Type', 'text/css');
            }
        }
    }));
} else {
    // Development: serve root directory for any legacy static files
    app.use(express.static(path.join(__dirname)));
}

// ============ SECURITY MIDDLEWARE (Only for API routes) ============
// Set security headers - Configured to allow Vite-generated assets
const isProd = process.env.NODE_ENV === 'production';
app.use(helmet({
    contentSecurityPolicy: {
        directives: {
            defaultSrc: ["'self'"],
            styleSrc: ["'self'", "'unsafe-inline'", "https://cdnjs.cloudflare.com", "https://fonts.googleapis.com", "https://fonts.gstatic.com"],
            // In production remove unsafe-inline/unsafe-eval; in dev keep them for Vite HMR
            scriptSrc: isProd
                ? ["'self'", "'wasm-unsafe-eval'", "blob:", "https://cdnjs.cloudflare.com", "https://www.googletagmanager.com", "https://pagead2.googlesyndication.com"]
                : ["'self'", "'unsafe-inline'", "'unsafe-eval'", "'wasm-unsafe-eval'", "blob:", "https://cdnjs.cloudflare.com", "https://www.googletagmanager.com"],
            imgSrc: ["'self'", "data:", "blob:", "https:", "http:"],
            fontSrc: ["'self'", "https://cdnjs.cloudflare.com", "https://fonts.gstatic.com", "https://fonts.googleapis.com"],
            connectSrc: ["'self'", "https://zplusenews.com", "https://www.zplusenews.com", "https://zplusenews.onrender.com", "https://fonts.googleapis.com", "https://fonts.gstatic.com"],
            frameSrc: ["'self'", "https://www.youtube.com", "https://www.youtube-nocookie.com"],
            workerSrc: ["'self'", "blob:"],
            mediaSrc: ["'self'", "https:", "blob:"],
        }
    },
    crossOriginEmbedderPolicy: false,
    crossOriginResourcePolicy: false
}));

// Parse cookies (needed for httpOnly auth cookie)
app.use(cookieParser());

// Rate limiting - Relaxed for production use
const limiter = rateLimit({
    windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS) || 15 * 60 * 1000, // 15 minutes
    max: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS) || 500, // Increased from 100 to 500
    message: 'Too many requests from this IP, please try again later.',
    standardHeaders: true,
    legacyHeaders: false,
    skip: (req) => {
        // Skip rate limiting for static assets and health checks
        return req.path === '/api/health' || req.path.startsWith('/assets');
    }
});

// Apply rate limiting to API routes only
app.use('/api/', limiter);

// Stricter rate limit for authentication (but still reasonable)
const authLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 20, // Increased from 5 to 20 login requests per windowMs
    message: 'Too many login attempts from this IP, please try again after 15 minutes.'
});

// Data sanitization against NoSQL query injection (API routes only)
app.use('/api/', mongoSanitize());

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
        'http://zplusenews.com',
        'http://www.zplusenews.com',
        'https://zplusenews.onrender.com',
        'http://localhost:3000',
        'http://localhost:5173'
    );
}

console.log('CORS allowed origins:', allowedOrigins);

const corsOptions = {
    origin: function (origin, callback) {
        // Allow requests with no origin (like mobile apps, curl, or same-origin)
        if (!origin) return callback(null, true);
        
        // Check if origin matches any allowed origin
        const isAllowed = allowedOrigins.some(allowed => {
            // Exact match or wildcard subdomain matching
            return origin === allowed || 
                   origin.endsWith('.zplusenews.com') ||
                   origin.endsWith('.zplusenews.onrender.com');
        });
        
        if (isAllowed || process.env.NODE_ENV === 'development') {
            callback(null, true);
        } else {
            console.warn('CORS blocked origin:', origin);
            // In production, allow anyway but log for debugging
            // This prevents CORS from breaking the app
            callback(null, true);
        }
    },
    credentials: true,
    optionsSuccessStatus: 200,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'PATCH'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With']
};

// Body parsing middleware
app.use(cors(corsOptions));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

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
    // JWT_SECRET is guaranteed by the startup guard above
    return jwt.sign({ id }, process.env.JWT_SECRET, { expiresIn: process.env.JWT_EXPIRE || '30d' });
};

// Cookie options for the auth session
const AUTH_COOKIE_OPTIONS = {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
    maxAge: 30 * 24 * 60 * 60 * 1000 // 30 days
};

// ============ Middleware ============
const protect = async (req, res, next) => {
    let token;

    // 1. Check Authorization header (Bearer token)
    if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
        token = req.headers.authorization.split(' ')[1];
    }
    // 2. Check httpOnly cookie (preferred for admin sessions)
    else if (req.cookies && req.cookies.adminToken) {
        token = req.cookies.adminToken;
    }
    // 3. Backward compatibility: session-id header
    else if (req.headers['session-id']) {
        token = req.headers['session-id'];
    }

    if (!token) {
        return res.status(401).json({ success: false, error: 'Not authorized, no token' });
    }

    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        req.user = await User.findById(decoded.id).select('-password');
        if (!req.user) {
            return res.status(401).json({ success: false, error: 'User not found' });
        }
        next();
    } catch (error) {
        console.error('Token verification error:', error.message);
        res.status(401).json({ success: false, error: 'Not authorized, token failed' });
    }
};

// ============ Video Routes (YouTube Integration) ============
const videoRoutes = require('./routes/videoRoutes');
app.use('/api/videos', videoRoutes);

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
        const defaultPassword = process.env.DEFAULT_ADMIN_PASSWORD;
        if (!defaultPassword) {
            return res.status(400).send('Setup Error: DEFAULT_ADMIN_PASSWORD env var is not set. Refusing to create admin with a known default password.');
        }
        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(defaultPassword, salt);

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
    console.log('Login attempt received:', { username: req.body?.username, hasPassword: !!req.body?.password });
    
    const { username, password } = req.body;
    
    // Input validation
    if (!username || !password) {
        console.log('Login failed: Missing credentials');
        return res.status(400).json({ success: false, error: 'Username and password are required' });
    }
    
    // Trim input - don't escape to preserve email @ symbol
    const trimmedUsername = username.trim();
    
    if (!validator.isLength(trimmedUsername, { min: 3, max: 50 })) {
        console.log('Login failed: Invalid username length');
        return res.status(400).json({ success: false, error: 'Invalid username length' });
    }
    
    try {
        // Check database connection first
        const dbState = require('mongoose').connection.readyState;
        if (dbState !== 1) {
            console.error('Login failed: Database not connected. State:', dbState);
            return res.status(503).json({ success: false, error: 'Database not connected. Please try again later.' });
        }
        
        // Search by name OR email (case-insensitive for email)
        console.log('Searching for user:', trimmedUsername);
        let user = await User.findOne({ 
            $or: [
                { name: trimmedUsername }, 
                { email: trimmedUsername.toLowerCase() }
            ] 
        });
        
        console.log('User found:', user ? { id: user._id, name: user.name, status: user.status } : 'NOT FOUND');

        if (!user) {
            console.log('Login failed: User not found');
            return res.status(401).json({ success: false, error: 'Invalid credentials' });
        }
        
        const passwordMatch = await bcrypt.compare(password, user.password);
        console.log('Password match:', passwordMatch);
        
        if (passwordMatch) {
            // Check if user is approved
            if (user.status === 'PENDING') {
                return res.status(403).json({ success: false, error: 'Your account is pending approval. Please wait for admin approval.' });
            }
            if (user.status === 'REJECTED') {
                return res.status(403).json({ success: false, error: 'Your account has been rejected. Please contact support.' });
            }
            
            const token = generateToken(user._id);
            console.log('Login successful for:', user.name);

            // Set httpOnly cookie for secure session management
            res.cookie('adminToken', token, AUTH_COOKIE_OPTIONS);

            res.json({
                success: true,
                // sessionId kept for backward compat with clients still reading it
                sessionId: token,
                user: { id: user._id, name: user.name, role: user.role, status: user.status }
            });
        } else {
            console.log('Login failed: Wrong password');
            res.status(401).json({ success: false, error: 'Invalid credentials' });
        }
    } catch (err) {
        console.error('Login error:', err.message, err.stack);
        res.status(500).json({ success: false, error: 'Server error: ' + err.message });
    }
});

// Admin: Logout - clear the auth cookie
app.post('/api/admin/logout', (req, res) => {
    res.clearCookie('adminToken', {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'strict'
    });
    res.json({ success: true, message: 'Logged out successfully' });
});

// Admin: Change Password
app.put('/api/admin/change-password', protect, async (req, res) => {
    try {
        const { currentPassword, newPassword } = req.body;
        
        if (!currentPassword || !newPassword) {
            return res.status(400).json({ success: false, error: 'Please, provide current and new password' });
        }
        
        if (newPassword.length < 8) {
            return res.status(400).json({ success: false, error: 'New password must be at least 8 characters' });
        }

        const user = await User.findById(req.user._id);

        if (!user) {
            return res.status(404).json({ success: false, error: 'User not found' });
        }

        // Verify current password
        const isMatch = await bcrypt.compare(currentPassword, user.password);
        if (!isMatch) {
            return res.status(400).json({ success: false, error: 'Current password is incorrect' });
        }

        // Hash new password
        const salt = await bcrypt.genSalt(10);
        user.password = await bcrypt.hash(newPassword, salt);
        await user.save();

        res.json({
            success: true,
            message: 'Password updated successfully'
        });

    } catch (err) {
        console.error('Password change error:', err);
        res.status(500).json({ success: false, error: 'Server error: ' + err.message });
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
        const cacheKey = `articles:${category || 'all'}:p${page}:l${limit}`;

        const cached = apiCache.get(cacheKey);
        if (cached) {
            return res.json(cached);
        }

        const query = category ? { category: new RegExp(category, 'i') } : {};

        const articles = await Article.find(query)
            .sort({ publishedAt: -1 })
            .limit(limit * 1)
            .skip((page - 1) * limit);

        const count = await Article.countDocuments(query);

        const result = {
            success: true,
            data: articles.map(a => ({ ...a._doc, id: a._id })),
            pagination: { page: +page, limit: +limit, total: count, pages: Math.ceil(count / limit) }
        };
        apiCache.set(cacheKey, result);
        res.json(result);
    } catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
});

// Article creation validation rules
const articleValidation = [
    body('title').trim().isLength({ min: 5, max: 200 }).withMessage('Title must be 5–200 characters'),
    body('content').trim().isLength({ min: 20 }).withMessage('Content must be at least 20 characters'),
    body('category').trim().notEmpty().withMessage('Category is required'),
];

app.post('/api/articles', protect, articleValidation, conditionalUpload('image'), async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(422).json({ success: false, errors: errors.array() });
    }

    try {
        const { title, slug, category, excerpt, content, author, tags, videoUrl, image } = req.body;

        let parsedAuthor = author;
        if (typeof author === 'string') {
            try { parsedAuthor = JSON.parse(author); } catch { parsedAuthor = { name: author, avatar: '' }; }
        }
        if (!parsedAuthor) parsedAuthor = { name: req.user.name || 'ZPluse News Team' };

        let parsedTags = tags;
        if (typeof tags === 'string') {
            try { parsedTags = JSON.parse(tags); } catch { parsedTags = []; }
        }

        const articleData = {
            title,
            slug: slug || (title ? title.toLowerCase().replace(/[^a-z0-9]+/g, '-') : undefined),
            category,
            excerpt,
            content,
            author: parsedAuthor,
            tags: parsedTags,
            videoUrl
        };

        // Handle image: File upload takes precedence, otherwise use URL from body
        if (req.file) {
            articleData.image = `/uploads/${req.file.filename}`;
        } else if (image) {
            articleData.image = image;
        }

        const article = await Article.create(articleData);
        // Invalidate articles list cache on new content
        apiCache.flushAll();

        res.status(201).json({ success: true, data: { ...article._doc, id: article._id } });
    } catch (err) {
        console.error(err);
        res.status(500).json({ success: false, error: 'Failed to create article: ' + err.message });
    }
});

app.put('/api/articles/:id', protect, upload.single('image'), async (req, res) => {
    try {
        const updateData = { ...req.body };
        
        // Handle image: File upload takes precedence
        if (req.file) {
            updateData.image = `/uploads/${req.file.filename}`;
        }
        // If no file but image URL is provided in body, it stays in updateData
        
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

// Increment article view count (protected to prevent unauthenticated view-spamming)
app.put('/api/articles/:id/view', protect, async (req, res) => {
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
        const { category, page = 1, limit = 20 } = req.query;
        const cacheKey = `videos:${category || 'all'}:p${page}:l${limit}`;

        const cached = apiCache.get(cacheKey);
        if (cached) return res.json(cached);

        const query = category ? { category: new RegExp(category, 'i') } : {};
        const videos = await Video.find(query)
            .sort({ createdAt: -1 })
            .limit(limit * 1)
            .skip((page - 1) * limit);
        const count = await Video.countDocuments(query);

        const result = {
            success: true,
            data: videos.map(v => ({ ...v._doc, id: v._id })),
            pagination: { page: +page, limit: +limit, total: count, pages: Math.ceil(count / limit) }
        };
        apiCache.set(cacheKey, result);
        res.json(result);
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
        const videoData = { ...req.body, createdBy: req.user._id };
        
        // Map frontend 'image' to 'thumbnail'
        if (videoData.image && !videoData.thumbnail) {
            videoData.thumbnail = videoData.image;
        }

        // Helper to extract video ID and source
        const extractVideoDetails = (url) => {
            if (!url) return { source: 'youtube', videoId: '' };
            
            if (url.includes('instagram.com')) {
                const match = url.match(/\/(p|reel|tv)\/([a-zA-Z0-9_-]+)/);
                return {
                    source: 'instagram',
                    videoId: match ? match[2] : url
                };
            }
            
            // YouTube
            const match = url.match(/(?:youtu\.be\/|youtube\.com\/.*v=|embed\/)([^#&?]*)/);
            return {
                source: 'youtube',
                videoId: match ? match[1] : url
            };
        };

        // If videoUrl is provided but videoId/source are missing or need update
        if (videoData.videoUrl) {
            const { source, videoId } = extractVideoDetails(videoData.videoUrl);
            videoData.source = source;
            videoData.videoId = videoId;
        }
        
        const video = await Video.create(videoData);
        res.status(201).json({ success: true, data: { ...video._doc, id: video._id } });
    } catch (err) { res.status(500).json({ success: false, error: err.message }); }
});

app.put('/api/videos/:id', protect, async (req, res) => {
    try {
        const updateData = { ...req.body };
        // Map frontend 'image' to 'thumbnail'
        if (updateData.image && !updateData.thumbnail) {
            updateData.thumbnail = updateData.image;
        }

        // Helper to extract (duplicate for now, could be shared function)
        const extractVideoDetails = (url) => {
            if (!url) return { source: 'youtube', videoId: '' };
            if (url.includes('instagram.com')) {
                const match = url.match(/\/(p|reel|tv)\/([a-zA-Z0-9_-]+)/);
                return { source: 'instagram', videoId: match ? match[2] : url };
            }
            const match = url.match(/(?:youtu\.be\/|youtube\.com\/.*v=|embed\/)([^#&?]*)/);
            return { source: 'youtube', videoId: match ? match[1] : url };
        };

        if (updateData.videoUrl) {
            const { source, videoId } = extractVideoDetails(updateData.videoUrl);
            updateData.source = source;
            updateData.videoId = videoId;
        }

        const video = await Video.findByIdAndUpdate(req.params.id, updateData, { new: true });
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

// --- Dynamic Sitemap ---
app.get('/sitemap.xml', async (req, res) => {
    try {
        const baseUrl = process.env.SITE_URL || 'https://zplusenews.com';
        const articles = await Article.find(
            { status: 'PUBLISHED', slug: { $exists: true, $ne: '' } },
            'slug publishedAt'
        ).lean();

        const staticUrls = [
            { loc: baseUrl, changefreq: 'daily', priority: '1.0' },
            { loc: `${baseUrl}/latest`, changefreq: 'hourly', priority: '0.9' },
            { loc: `${baseUrl}/videos`, changefreq: 'daily', priority: '0.8' },
            { loc: `${baseUrl}/events`, changefreq: 'weekly', priority: '0.7' },
            { loc: `${baseUrl}/about`, changefreq: 'monthly', priority: '0.5' },
        ];

        const articleUrls = articles.map(a => ({
            loc: `${baseUrl}/article/${a.slug}`,
            lastmod: a.publishedAt ? new Date(a.publishedAt).toISOString().split('T')[0] : undefined,
            changefreq: 'weekly',
            priority: '0.8'
        }));

        const allUrls = [...staticUrls, ...articleUrls];

        const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${allUrls.map(u => `  <url>
    <loc>${u.loc}</loc>${u.lastmod ? `\n    <lastmod>${u.lastmod}</lastmod>` : ''}
    <changefreq>${u.changefreq}</changefreq>
    <priority>${u.priority}</priority>
  </url>`).join('\n')}
</urlset>`;

        res.header('Content-Type', 'application/xml');
        res.send(xml);
    } catch (err) {
        console.error('Sitemap generation error:', err.message);
        res.status(500).send('<?xml version="1.0"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"></urlset>');
    }
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
