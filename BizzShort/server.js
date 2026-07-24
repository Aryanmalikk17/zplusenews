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
const fs = require('fs');
const axios = require('axios');

// Load env vars FIRST — must be before any process.env access
dotenv.config();

// In-memory cache: 5-minute TTL for public API responses (shared across modules)
const apiCache = require('./utils/cache');

// ============ Startup guard: crash fast on missing critical env vars ============
if (!process.env.JWT_SECRET) {
    console.error('❌ FATAL: JWT_SECRET environment variable is not set. Server cannot start securely.');
    process.exit(1);
}

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

// Services
const { getLiveTickerPayload } = require('./services/tickerService');



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
    referrerPolicy: { policy: 'strict-origin-when-cross-origin' },
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

// Cloudinary Configuration
const cloudinary = require('cloudinary').v2;
let isCloudinaryConfigured = false;

if (process.env.CLOUDINARY_CLOUD_NAME && process.env.CLOUDINARY_API_KEY && process.env.CLOUDINARY_API_SECRET) {
    cloudinary.config({
        cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
        api_key: process.env.CLOUDINARY_API_KEY,
        api_secret: process.env.CLOUDINARY_API_SECRET
    });
    isCloudinaryConfigured = true;
    console.log("☁️ Cloudinary configured successfully. Images will be stored in Cloudinary.");
} else {
    console.warn("⚠️ Cloudinary credentials missing in .env. Falling back to local disk storage (/uploads).");
}

// Upload a local file to Cloudinary and clean up the local file
async function uploadToCloudinary(localFilePath) {
    if (!isCloudinaryConfigured) {
        return `/uploads/${path.basename(localFilePath)}`;
    }
    try {
        const publicId = path.basename(localFilePath, path.extname(localFilePath));
        const result = await cloudinary.uploader.upload(localFilePath, {
            folder: 'zplusenews',
            public_id: publicId,
            resource_type: 'image'
        });
        
        // Remove local file
        fs.unlink(localFilePath, (err) => {
            if (err) console.error("Error removing local temp file after Cloudinary upload:", err);
        });
        
        return result.secure_url;
    } catch (err) {
        console.error("Cloudinary upload failed, using local fallback URL:", err.message);
        return `/uploads/${path.basename(localFilePath)}`;
    }
}

// Intercept Multer upload results and rename for SEO if title is provided
async function processUploadedFile(reqFile, title) {
    if (!reqFile) return null;
    
    let localFilePath = reqFile.path;
    
    if (title) {
        try {
            const ext = path.extname(reqFile.originalname) || '.jpg';
            // Generate clean SEO slug from title
            let baseSlug = title
                .toLowerCase()
                .replace(/[^a-z0-9\s]/g, '') // Remove special characters
                .trim()
                .replace(/\s+/g, '-');       // Replace spaces with hyphens
            
            // Remove common stop words
            const stopWords = ['a', 'an', 'and', 'are', 'as', 'at', 'be', 'but', 'by', 'for', 'if', 'in', 'into', 'is', 'it', 'no', 'not', 'of', 'on', 'or', 'such', 'that', 'the', 'their', 'then', 'there', 'these', 'they', 'this', 'to', 'was', 'will', 'with'];
            const words = baseSlug.split('-');
            const filteredWords = words.filter(word => !stopWords.includes(word));
            baseSlug = (filteredWords.length > 0 ? filteredWords : words).join('-');

            // Limit slug length to avoid filesystem / URL length issues
            if (baseSlug.length > 70) {
                const lastHyphen = baseSlug.lastIndexOf('-', 70);
                baseSlug = lastHyphen > 30 ? baseSlug.substring(0, lastHyphen) : baseSlug.substring(0, 70);
            }

            const uniqueSuffix = Date.now();
            const seoFilename = `${baseSlug}-${uniqueSuffix}${ext}`;
            const targetDir = path.dirname(localFilePath);
            const targetPath = path.join(targetDir, seoFilename);

            // Rename the file locally
            await fs.promises.rename(localFilePath, targetPath);
            localFilePath = targetPath;
        } catch (renameErr) {
            console.error("Failed to rename file for SEO optimization:", renameErr);
        }
    }
    
    return await uploadToCloudinary(localFilePath);
}

// Download external image and save to Cloudinary or locally
async function downloadAndLocalizeImage(imageUrl) {
    if (!imageUrl || (!imageUrl.startsWith('http://') && !imageUrl.startsWith('https://'))) {
        return imageUrl; // Already local/Cloudinary or empty
    }

    try {
        const parsedUrl = new URL(imageUrl);
        
        // If already on our domain or hosted on Cloudinary, skip
        if (parsedUrl.host === 'zplusenews.com' || parsedUrl.host === 'www.zplusenews.com' || parsedUrl.host.includes('cloudinary.com')) {
            return imageUrl;
        }

        // Fetch image
        const response = await axios({
            url: imageUrl,
            method: 'GET',
            responseType: 'stream',
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
            },
            timeout: 8000
        });

        // Get extension from Content-Type or path
        let ext = '.jpg';
        const contentType = response.headers['content-type'];
        if (contentType) {
            if (contentType.includes('image/png')) ext = '.png';
            else if (contentType.includes('image/webp')) ext = '.webp';
            else if (contentType.includes('image/gif')) ext = '.gif';
            else if (contentType.includes('image/svg+xml')) ext = '.svg';
            else if (contentType.includes('image/avif')) ext = '.avif';
        } else {
            const pathname = parsedUrl.pathname;
            const matchedExt = pathname.match(/\.(png|jpg|jpeg|webp|gif|svg|avif)$/i);
            if (matchedExt) ext = matchedExt[0];
        }

        // Generate clean unique filename
        const filename = `downloaded-${Date.now()}-${Math.random().toString(36).substring(2, 8)}${ext}`;
        const uploadsDir = path.join(__dirname, 'uploads');
        const destPath = path.join(uploadsDir, filename);

        // Ensure uploads directory exists
        if (!fs.existsSync(uploadsDir)) {
            fs.mkdirSync(uploadsDir, { recursive: true });
        }

        // Write stream
        const writer = fs.createWriteStream(destPath);
        response.data.pipe(writer);

        return await new Promise((resolve) => {
            writer.on('finish', async () => {
                const finalUrl = await uploadToCloudinary(destPath);
                resolve(finalUrl);
            });
            writer.on('error', (err) => {
                console.error("Error writing temporary download image file:", err.message);
                resolve(imageUrl);
            });
        });
    } catch (err) {
        console.error(`Failed to download and localize image: ${imageUrl}. Error: ${err.message}`);
        return imageUrl;
    }
}

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

        // Helper to slugify (SEO optimized)
        const slugify = (text) => {
            let slug = text.toString().toLowerCase()
                .replace(/\s+/g, '-')           // Replace spaces with -
                .replace(/[^\w\-]+/g, '')       // Remove all non-word chars
                .replace(/\-\-+/g, '-')         // Replace multiple - with single -
                .replace(/^-+/, '')             // Trim - from start of text
                .replace(/-+$/, '');            // Trim - from end of text
            
            // Remove stop words
            const stopWords = ['a', 'an', 'and', 'are', 'as', 'at', 'be', 'but', 'by', 'for', 'if', 'in', 'into', 'is', 'it', 'no', 'not', 'of', 'on', 'or', 'such', 'that', 'the', 'their', 'then', 'there', 'these', 'they', 'this', 'to', 'was', 'will', 'with'];
            slug = slug.split('-').filter(word => !stopWords.includes(word)).join('-');
            
            // Truncate
            if (slug.length > 70) {
                const lastHyphen = slug.lastIndexOf('-', 70);
                slug = lastHyphen > 30 ? slug.substring(0, lastHyphen) : slug.substring(0, 70);
            }
            return slug || 'article';
        };

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

// Article creation validation rules
const articleValidation = [
    body('title').trim().isLength({ min: 5, max: 200 }).withMessage('Title must be 5–200 characters'),
    body('content')
        .customSanitizer(value => (value || '').replace(/<[^>]*>/g, '').trim())
        .isLength({ min: 20 })
        .withMessage('Content must be at least 20 characters'),
    body('category').trim().notEmpty().withMessage('Category is required'),
];

app.post('/api/articles', protect, conditionalUpload('image'), ...articleValidation, async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(422).json({ success: false, errors: errors.array() });
    }

    try {
        const { title, slug, category, excerpt, content, author, tags, videoUrl, image, isTicker, tickerCategory, calendarDate } = req.body;

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
            category,
            excerpt,
            content,
            author: parsedAuthor,
            tags: parsedTags,
            videoUrl,
            isTicker: isTicker === 'true' || isTicker === true,
            tickerCategory: tickerCategory || 'none',
            calendarDate: calendarDate ? new Date(calendarDate) : undefined
        };

        // Handle image: File upload takes precedence, otherwise use URL from body
        if (req.file) {
            articleData.image = await processUploadedFile(req.file, title);
        } else if (image) {
            articleData.image = await downloadAndLocalizeImage(image);
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
        
        // Normalize booleans and date
        if (updateData.isTicker !== undefined) {
            updateData.isTicker = updateData.isTicker === 'true' || updateData.isTicker === true;
        }
        if (updateData.calendarDate !== undefined) {
            updateData.calendarDate = updateData.calendarDate ? new Date(updateData.calendarDate) : null;
        }
        
        // Parse author and tags if sent as JSON strings via FormData
        if (updateData.author && typeof updateData.author === 'string') {
            try { updateData.author = JSON.parse(updateData.author); } catch (err) { /* ignore */ }
        }
        if (updateData.tags && typeof updateData.tags === 'string') {
            try { updateData.tags = JSON.parse(updateData.tags); } catch (err) { /* ignore */ }
        }
        
        // Handle image: File upload takes precedence
        if (req.file) {
            let articleTitle = updateData.title;
            if (!articleTitle) {
                const existingArticle = await Article.findById(req.params.id);
                if (existingArticle) {
                    articleTitle = existingArticle.title;
                }
            }
            updateData.image = await processUploadedFile(req.file, articleTitle);
        } else if (updateData.image) {
            updateData.image = await downloadAndLocalizeImage(updateData.image);
        }
        // If no file but image URL is provided in body, it stays in updateData
        
        const article = await Article.findByIdAndUpdate(req.params.id, updateData, { new: true });
        if (!article) return res.status(404).json({ success: false, error: 'Article not found' });

        // Invalidate articles list cache on update
        apiCache.flushAll();

        res.json({ success: true, data: { ...article._doc, id: article._id } });
    } catch (err) {
        console.error(err);
        res.status(500).json({ success: false, error: 'Update failed: ' + err.message });
    }
});

app.delete('/api/articles/:id', protect, async (req, res) => {
    try {
        await Article.findByIdAndDelete(req.params.id);
        
        // Invalidate articles list cache on deletion
        apiCache.flushAll();

        res.json({ success: true, message: 'Deleted' });
    } catch (err) {
        res.status(500).json({ success: false, error: 'Delete failed' });
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

// Get author details and articles by author
app.get('/api/authors/:authorSlug', async (req, res) => {
    try {
        const { authorSlug } = req.params;
        
        // Fetch all published articles to find matching slugified author name in memory
        const articles = await Article.find({ status: 'PUBLISHED' }).select('author').lean();
        
        const matchingArticle = articles.find(a => slugify(a.author?.name) === authorSlug);
        if (!matchingArticle || !matchingArticle.author?.name) {
            return res.status(404).json({ success: false, error: 'Author not found' });
        }
        
        const authorName = matchingArticle.author.name;
        
        // Retrieve articles written by this author
        const authorArticles = await Article.find({ status: 'PUBLISHED', 'author.name': authorName })
            .sort({ publishedAt: -1 })
            .select('title slug category excerpt image author publishedAt views readTime tags')
            .lean();
            
        // Get the author's details from the first matching article
        const firstArticle = await Article.findOne({ status: 'PUBLISHED', 'author.name': authorName }).lean();
        const authorDetails = firstArticle.author;
        
        res.json({
            success: true,
            author: authorDetails,
            articles: authorArticles.map(a => ({ ...a, id: a._id }))
        });
    } catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
});

// Get published articles (public - for frontend)
app.get('/api/articles/public/list', async (req, res) => {
    try {
        const { category } = req.query;
        const page = parseInt(req.query.page, 10) || 1;
        const limit = parseInt(req.query.limit, 10) || 12;
        const skip = (page - 1) * limit;

        const cacheKey = `articles_public:${category || 'all'}:p${page}:l${limit}`;
        const cached = apiCache.get(cacheKey);
        if (cached) {
            return res.json(cached);
        }

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

// Alias for old public API
app.get('/api/articles/public', async (req, res) => {
    try {
        const { category } = req.query;
        const query = { status: 'PUBLISHED' };
        if (category) query.category = new RegExp(category, 'i');

        const articles = await Article.find(query)
            .sort({ publishedAt: -1 })
            .limit(10)
            .lean();
        
        res.json(articles);
    } catch (err) {
        res.status(500).json({ success: false, error: err.message });
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
    try {
        const events = await Event.find().sort({ date: 1 });
        res.json({ success: true, data: events.map(e => ({ ...e._doc, id: e._id })) });
    } catch (err) { res.status(500).json({ success: false, error: err.message }); }
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
        const image = req.file ? await processUploadedFile(req.file) : undefined;
        const event = await Event.create({ ...req.body, image, createdBy: req.user._id });
        res.status(201).json({ success: true, data: { ...event._doc, id: event._id } });
    } catch (err) { res.status(500).json({ success: false, error: err.message }); }
});

app.put('/api/events/:id', protect, conditionalUpload('image'), async (req, res) => {
    try {
        const updateData = { ...req.body };
        if (req.file) updateData.image = await processUploadedFile(req.file);

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
        const image = req.file ? await processUploadedFile(req.file) : undefined;
        const item = await Interview.create({ ...req.body, image });
        res.status(201).json({ success: true, data: { ...item._doc, id: item._id } });
    } catch (err) { res.status(500).json({ success: false, error: err.message }); }
});

app.put('/api/interviews/:id', protect, conditionalUpload('image'), async (req, res) => {
    try {
        const updateData = { ...req.body };
        if (req.file) updateData.image = await processUploadedFile(req.file);

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
    try {
        const items = await News.find().sort({ publishedAt: -1 });
        res.json({ success: true, data: items.map(n => ({ ...n._doc, id: n._id })) });
    } catch (err) { res.status(500).json({ success: false, error: err.message }); }
});
app.post('/api/news', protect, async (req, res) => {
    try {
        const item = await News.create(req.body);
        res.status(201).json({ success: true, data: { ...item._doc, id: item._id } });
    } catch (err) { res.status(500).json({ success: false, error: err.message }); }
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
    try {
        const items = await IndustryUpdate.find().sort({ updatedAt: -1 });
        res.json({ success: true, data: items.map(i => ({ ...i._doc, id: i._id })) });
    } catch (err) { res.status(500).json({ success: false, error: err.message }); }
});

app.post('/api/industry', protect, async (req, res) => {
    try {
        const item = await IndustryUpdate.create(req.body);
        res.status(201).json({ success: true, data: { ...item._doc, id: item._id } });
    } catch (err) { res.status(500).json({ success: false, error: err.message }); }
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
    try {
        const items = await Client.find({});
        res.json({ success: true, data: items.map(c => ({ ...c._doc, id: c._id })) });
    } catch (err) { res.status(500).json({ success: false, error: err.message }); }
});

app.post('/api/clients', protect, conditionalUpload('logo'), async (req, res) => {
    try {
        const logo = req.file ? await processUploadedFile(req.file) : undefined;
        const item = await Client.create({ ...req.body, logo });
        res.status(201).json({ success: true, data: { ...item._doc, id: item._id } });
    } catch (err) { res.status(500).json({ success: false, error: err.message }); }
});


app.put('/api/clients/:id', protect, conditionalUpload('logo'), async (req, res) => {
    try {
        const updateData = { ...req.body };
        if (req.file) updateData.logo = await processUploadedFile(req.file);

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
    try {
        const users = await User.find({}, '-password');
        res.json({ success: true, data: users.map(u => ({ ...u._doc, id: u._id })) });
    } catch (err) { res.status(500).json({ success: false, error: err.message }); }
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
app.get('/api/advertisements/inject', async (req, res) => {
    try {
        const { pageType, category, device } = req.query;
        const now = new Date();
        
        // Auto-detect device context from User-Agent if not explicitly supplied
        let detectedDevice = device;
        if (!detectedDevice && req.headers['user-agent']) {
            const ua = req.headers['user-agent'].toLowerCase();
            if (/(tablet|ipad|playbook|silk)|(android(?!.*mobi))/i.test(ua)) {
                detectedDevice = 'tablet';
            } else if (/mobile|iphone|ipod|android|blackberry|iemobile|kindle|silk-accelerated|(hpw|web)os|opera m(obi|ini)/i.test(ua)) {
                detectedDevice = 'mobile';
            } else {
                detectedDevice = 'desktop';
            }
        }
        
        // Safely normalize params
        const searchCategory = category ? String(category).toLowerCase().trim() : '';
        const searchDevice = detectedDevice ? String(detectedDevice).toLowerCase().trim() : '';
        const searchPageType = pageType ? String(pageType).toLowerCase().trim() : '';
        
        // Find all active ads matching date constraints using $and to prevent duplicate keys overwriting
        const query = {
            status: 'active',
            $and: [
                {
                    $or: [
                        { startDate: { $exists: false } },
                        { startDate: { $lte: now } }
                    ]
                },
                {
                    $or: [
                        { endDate: { $exists: false } },
                        { endDate: { $gte: now } }
                    ]
                }
            ]
        };
        
        const ads = await Advertisement.find(query);
        
        // Group and filter by matching targeting logic
        const resolvedAds = {};
        const slots = ['H1', 'H2', 'C1', 'C2', 'V1', 'V2', 'legacy-banner', 'legacy-sidebar'];
        
        for (const slot of slots) {
            // Filter candidate ads for this slot
            let candidates = ads.filter(ad => ad.slotId === slot);
            
            // Apply targeting criteria (pageType, category, device)
            candidates = candidates.filter(ad => {
                // 1. PageType Targeting: if ad targets pageTypes, request must match
                if (ad.targeting && ad.targeting.pageTypes && ad.targeting.pageTypes.length > 0) {
                    if (searchPageType && !ad.targeting.pageTypes.includes(searchPageType)) {
                        return false;
                    }
                }
                
                // 2. Category Targeting: if ad targets categories, request must match
                if (ad.targeting && ad.targeting.categories && ad.targeting.categories.length > 0) {
                    if (searchCategory && !ad.targeting.categories.includes(searchCategory)) {
                        return false;
                    }
                }
                
                // 3. Device Targeting: if ad targets deviceTypes, request must match
                if (ad.targeting && ad.targeting.deviceTypes && ad.targeting.deviceTypes.length > 0) {
                    if (searchDevice && !ad.targeting.deviceTypes.includes(searchDevice)) {
                        return false;
                    }
                }
                
                return true;
            });
            
            if (candidates.length > 0) {
                // Specificity-Based Selection:
                // Category specificity: +100
                // PageType specificity: +10
                // Device specificity: +5
                const getSpecificityScore = (ad) => {
                    let score = 0;
                    
                    if (ad.targeting && ad.targeting.categories && ad.targeting.categories.length > 0) {
                        if (searchCategory && ad.targeting.categories.includes(searchCategory)) {
                            score += 100;
                        }
                    }
                    if (ad.targeting && ad.targeting.pageTypes && ad.targeting.pageTypes.length > 0) {
                        if (searchPageType && ad.targeting.pageTypes.includes(searchPageType)) {
                            score += 10;
                        }
                    }
                    if (ad.targeting && ad.targeting.deviceTypes && ad.targeting.deviceTypes.length > 0) {
                        if (searchDevice && ad.targeting.deviceTypes.includes(searchDevice)) {
                            score += 5;
                        }
                    }
                    
                    return score;
                };

                // Sort candidates by match specificity score, then priority, then date
                candidates.sort((a, b) => {
                    const scoreA = getSpecificityScore(a);
                    const scoreB = getSpecificityScore(b);
                    
                    if (scoreA !== scoreB) {
                        return scoreB - scoreA; // Highest specificity score wins
                    }
                    if (a.priority !== b.priority) {
                        return (b.priority || 0) - (a.priority || 0); // Tie-breaker 1: Priority
                    }
                    return b.createdAt - a.createdAt; // Tie-breaker 2: Age
                });
                
                resolvedAds[slot] = { ...candidates[0]._doc, id: candidates[0]._id };
            } else {
                resolvedAds[slot] = null;
            }
        }
        
        res.json({ success: true, data: resolvedAds });
    } catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
});

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
        const imageUrl = req.file ? await processUploadedFile(req.file) : req.body.imageUrl;
        let adData = { 
            ...req.body, 
            imageUrl,
            createdBy: req.user._id 
        };
        
        // Parse targeting and size JSON strings
        if (typeof adData.targeting === 'string') {
            try { adData.targeting = JSON.parse(adData.targeting); } 
            catch (e) { adData.targeting = { categories: [], deviceTypes: [], pageTypes: [] }; }
        }
        if (typeof adData.size === 'string') {
            try { adData.size = JSON.parse(adData.size); } catch (e) {}
        }
        
        // Map legacy position to slotId if missing
        if (!adData.slotId) {
            const posToSlotMap = {
                'horizontal-banner': 'H1',
                'inline': 'H1',
                'header': 'H1',
                'sidebar-rectangle': 'H2',
                'sidebar': 'H2',
                'vertical-sidebar': 'C1',
                'footer': 'H1'
            };
            adData.slotId = posToSlotMap[adData.position] || 'H1';
        }
        
        // Sync position field for legacy components
        if (adData.slotId && !adData.position) {
            const slotToPosMap = {
                'H1': 'horizontal-banner',
                'H2': 'sidebar-rectangle',
                'C1': 'vertical-sidebar',
                'C2': 'vertical-sidebar',
                'V1': 'sidebar-rectangle',
                'V2': 'sidebar-rectangle'
            };
            adData.position = slotToPosMap[adData.slotId] || 'inline';
        }
        
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
        let updateData = { ...req.body, updatedAt: new Date() };
        if (req.file) updateData.imageUrl = await processUploadedFile(req.file);

        // Parse targeting and size JSON strings
        if (typeof updateData.targeting === 'string') {
            try { updateData.targeting = JSON.parse(updateData.targeting); } catch (e) {}
        }
        if (typeof updateData.size === 'string') {
            try { updateData.size = JSON.parse(updateData.size); } catch (e) {}
        }

        // Sync legacy fields
        if (updateData.slotId && !updateData.position) {
            const slotToPosMap = {
                'H1': 'horizontal-banner',
                'H2': 'sidebar-rectangle',
                'C1': 'vertical-sidebar',
                'C2': 'vertical-sidebar',
                'V1': 'sidebar-rectangle',
                'V2': 'sidebar-rectangle'
            };
            updateData.position = slotToPosMap[updateData.slotId] || 'inline';
        }

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
        
        // Normalize booleans and date
        videoData.isTicker = videoData.isTicker === 'true' || videoData.isTicker === true;
        if (videoData.calendarDate) {
            videoData.calendarDate = new Date(videoData.calendarDate);
        }

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
        apiCache.flushAll(); // Flush cache on video creation
        res.status(201).json({ success: true, data: { ...video._doc, id: video._id } });
    } catch (err) { res.status(500).json({ success: false, error: err.message }); }
});

app.put('/api/videos/:id', protect, async (req, res) => {
    try {
        const updateData = { ...req.body };
        
        // Normalize booleans and date
        if (updateData.isTicker !== undefined) {
            updateData.isTicker = updateData.isTicker === 'true' || updateData.isTicker === true;
        }
        if (updateData.calendarDate !== undefined) {
            updateData.calendarDate = updateData.calendarDate ? new Date(updateData.calendarDate) : null;
        }

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
        apiCache.flushAll(); // Flush cache on video update
        res.json({ success: true, data: { ...video._doc, id: video._id } });
    } catch (err) { res.status(500).json({ success: false, error: err.message }); }
});

app.delete('/api/videos/:id', protect, async (req, res) => {
    try {
        await Video.findByIdAndDelete(req.params.id);
        apiCache.flushAll(); // Flush cache on video deletion
        res.json({ success: true, message: 'Video deleted' });
    } catch (err) { res.status(500).json({ success: false, error: err.message }); }
});

// ============ Live Ticker & Calendar Routes ============
app.get('/api/ticker/live', async (req, res) => {
    try {
        const payload = await getLiveTickerPayload();
        res.json(payload);
    } catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
});

// =========================================================================
// Prokerala ASTROLOGY API OAUTH HANDSHAKE & PROXY
// =========================================================================
let prokeralaToken = null;
let prokeralaTokenExpiry = 0;

async function getProkeralaToken() {
    const clientId = process.env.PROKERALA_CLIENT_ID;
    const clientSecret = process.env.PROKERALA_CLIENT_SECRET;

    if (!clientId || !clientSecret) {
        throw new Error("Prokerala API credentials not set in environment variables (PROKERALA_CLIENT_ID, PROKERALA_CLIENT_SECRET).");
    }

    // Return cached token if valid (with 1-minute buffer)
    if (prokeralaToken && Date.now() < prokeralaTokenExpiry - 60000) {
        return prokeralaToken;
    }

    try {
        const response = await axios.post('https://api.prokerala.com/v2/oauth/token', 
            new URLSearchParams({
                grant_type: 'client_credentials',
                client_id: clientId,
                client_secret: clientSecret
            }), {
                headers: { 'Content-Type': 'application/x-www-form-urlencoded' }
            }
        );

        if (response.data && response.data.access_token) {
            prokeralaToken = response.data.access_token;
            const expiresIn = response.data.expires_in || 3600;
            prokeralaTokenExpiry = Date.now() + (expiresIn * 1000);
            return prokeralaToken;
        }
        throw new Error("Invalid OAuth response from Prokerala token endpoint.");
    } catch (err) {
        console.error("Error securing Prokerala OAuth token:", err.response?.data || err.message);
        throw new Error("Failed to authenticate with Prokerala API server.");
    }
}

app.get('/api/prokerala', async (req, res) => {
    try {
        const { year, month, region } = req.query;
        if (!year || !month) {
            return res.status(400).json({ success: false, error: 'Year and month query parameters are required' });
        }

        // Try to secure access token (will throw if credentials aren't set)
        const token = await getProkeralaToken();

        // proxy panchang & holidays requests from the developer portal
        const targetUrl = 'https://api.prokerala.com/v2/astrology/panchang/advanced';
        const response = await axios.get(targetUrl, {
            params: {
                datetime: `${year}-${String(month).padStart(2, '0')}-01T06:00:00+05:30`,
                location: '12.9716,77.5946' // default to Bengaluru/India coordinates
            },
            headers: {
                'Authorization': `Bearer ${token}`,
                'Accept': 'application/json'
            }
        });

        res.json({
            success: true,
            events: response.data
        });
    } catch (err) {
        const isCredError = err.message.includes("credentials not set");
        console.warn(`[Prokerala Proxy] Shifting to local fallback cache. Reason: ${err.message}`);
        
        res.status(isCredError ? 501 : 502).json({
            success: false,
            error: err.message
        });
    }
});

app.get('/api/calendar/content', async (req, res) => {
    try {
        const { date } = req.query; // Format: YYYY-MM-DD
        if (!date) {
            return res.status(400).json({ success: false, error: 'Date query parameter (YYYY-MM-DD) is required' });
        }
        
        const start = new Date(`${date}T00:00:00.000Z`);
        const end = new Date(`${date}T23:59:59.999Z`);

        if (isNaN(start.getTime())) {
            return res.status(400).json({ success: false, error: 'Invalid date format. Use YYYY-MM-DD.' });
        }

        const [articles, videos, events] = await Promise.all([
            Article.find({
                calendarDate: { $gte: start, $lte: end },
                status: 'PUBLISHED'
            }).lean(),
            Video.find({
                calendarDate: { $gte: start, $lte: end }
            }).lean(),
            Event.find({
                date: { $gte: start, $lte: end }
            }).lean()
        ]);

        res.json({
            success: true,
            data: {
                articles: articles.map(a => ({ ...a, id: a._id })),
                videos: videos.map(v => ({ ...v, id: v._id })),
                events: events.map(e => ({ ...e, id: e._id }))
            }
        });
    } catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
});

app.get('/api/calendar/highlights', async (req, res) => {
    try {
        const { year, month } = req.query;
        if (!year || !month) {
            return res.status(400).json({ success: false, error: 'Year and month are required' });
        }
        
        const start = new Date(Date.UTC(parseInt(year), parseInt(month) - 1, 1, 0, 0, 0));
        const end = new Date(Date.UTC(parseInt(year), parseInt(month), 0, 23, 59, 59, 999));

        const [articles, videos, events] = await Promise.all([
            Article.find({ calendarDate: { $gte: start, $lte: end }, status: 'PUBLISHED' }, 'calendarDate').lean(),
            Video.find({ calendarDate: { $gte: start, $lte: end } }, 'calendarDate').lean(),
            Event.find({ date: { $gte: start, $lte: end } }, 'date').lean()
        ]);

        const dates = new Set();
        articles.forEach(a => { if (a.calendarDate) dates.add(a.calendarDate.toISOString().split('T')[0]); });
        videos.forEach(v => { if (v.calendarDate) dates.add(v.calendarDate.toISOString().split('T')[0]); });
        events.forEach(e => { if (e.date) dates.add(e.date.toISOString().split('T')[0]); });

        res.json({
            success: true,
            data: Array.from(dates)
        });
    } catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
});

// --- Sitemap Index (root entry point for all sitemaps) ---
app.get('/sitemap-index.xml', async (req, res) => {
    try {
        const baseUrl = process.env.SITE_URL || `${req.protocol}://${req.get('host')}`;
        const today = new Date().toISOString().split('T')[0];
        const xml = `<?xml version="1.0" encoding="UTF-8"?>
<sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <sitemap>
    <loc>${baseUrl}/sitemap-pages.xml</loc>
    <lastmod>${today}</lastmod>
  </sitemap>
  <sitemap>
    <loc>${baseUrl}/sitemap-articles.xml</loc>
    <lastmod>${today}</lastmod>
  </sitemap>
  <sitemap>
    <loc>${baseUrl}/sitemap-videos.xml</loc>
    <lastmod>${today}</lastmod>
  </sitemap>
</sitemapindex>`;
        res.header('Content-Type', 'application/xml');
        res.send(xml);
    } catch (err) {
        console.error('Sitemap index error:', err.message);
        res.status(500).send('');
    }
});

// --- Sitemap: Static & Category Pages ---
app.get('/sitemap-pages.xml', (req, res) => {
    try {
        const baseUrl = process.env.SITE_URL || `${req.protocol}://${req.get('host')}`;
        const today = new Date().toISOString().split('T')[0];
        // ALL valid routes from App.jsx — these were missing from the old sitemap
        const pages = [
            { path: '/',                    changefreq: 'daily',   priority: '1.0' },
            { path: '/latest',              changefreq: 'hourly',  priority: '0.9' },
            { path: '/national-news',       changefreq: 'hourly',  priority: '0.9' },
            { path: '/international-news',  changefreq: 'hourly',  priority: '0.9' },
            { path: '/state-news',          changefreq: 'hourly',  priority: '0.9' },
            { path: '/polity',              changefreq: 'daily',   priority: '0.8' },
            { path: '/economics',           changefreq: 'daily',   priority: '0.8' },
            { path: '/technology',          changefreq: 'daily',   priority: '0.8' },
            { path: '/sports',              changefreq: 'daily',   priority: '0.8' },
            { path: '/health',              changefreq: 'daily',   priority: '0.8' },
            { path: '/defence',             changefreq: 'daily',   priority: '0.8' },
            { path: '/environment',         changefreq: 'daily',   priority: '0.7' },
            { path: '/culture',             changefreq: 'daily',   priority: '0.7' },
            { path: '/spirituality',        changefreq: 'daily',   priority: '0.7' },
            { path: '/agriculture',         changefreq: 'daily',   priority: '0.7' },
            { path: '/geography',           changefreq: 'weekly',  priority: '0.7' },
            { path: '/religion',            changefreq: 'daily',   priority: '0.7' },
            { path: '/ai',                  changefreq: 'daily',   priority: '0.7' },
            { path: '/science',             changefreq: 'daily',   priority: '0.7' },
            { path: '/tourism',             changefreq: 'weekly',  priority: '0.6' },
            { path: '/others',              changefreq: 'daily',   priority: '0.6' },
            { path: '/fake-news',           changefreq: 'daily',   priority: '0.6' },
            { path: '/positive-news',       changefreq: 'daily',   priority: '0.6' },
            { path: '/astrology',           changefreq: 'daily',   priority: '0.6' },
            { path: '/videos',              changefreq: 'daily',   priority: '0.8' },
            { path: '/events',              changefreq: 'weekly',  priority: '0.7' },
            { path: '/contests',            changefreq: 'weekly',  priority: '0.6' },
            { path: '/about',               changefreq: 'monthly', priority: '0.5' },
            { path: '/contact',             changefreq: 'monthly', priority: '0.5' },
            { path: '/privacy',             changefreq: 'monthly', priority: '0.3' },
            { path: '/terms',               changefreq: 'monthly', priority: '0.3' },
        ];
        const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${pages.map(p => `  <url>
    <loc>${baseUrl}${p.path}</loc>
    <lastmod>${today}</lastmod>
    <changefreq>${p.changefreq}</changefreq>
    <priority>${p.priority}</priority>
  </url>`).join('\n')}
</urlset>`;
        res.header('Content-Type', 'application/xml');
        res.send(xml);
    } catch (err) {
        console.error('Sitemap pages error:', err.message);
        res.status(500).send('');
    }
});

// --- Sitemap: Articles ---
app.get('/sitemap-articles.xml', async (req, res) => {
    try {
        const baseUrl = process.env.SITE_URL || `${req.protocol}://${req.get('host')}`;
        const articles = await Article.find(
            { status: 'PUBLISHED', slug: { $exists: true, $ne: '' } },
            'slug publishedAt updatedAt'
        ).lean();
        const articleUrls = articles.map(a => ({
            loc: `${baseUrl}/article/${a.slug}`,
            lastmod: (a.updatedAt || a.publishedAt) ? new Date(a.updatedAt || a.publishedAt).toISOString().split('T')[0] : undefined,
        }));
        const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${articleUrls.map(u => `  <url>
    <loc>${u.loc}</loc>${u.lastmod ? `\n    <lastmod>${u.lastmod}</lastmod>` : ''}
    <changefreq>weekly</changefreq>
    <priority>0.8</priority>
  </url>`).join('\n')}
</urlset>`;
        res.header('Content-Type', 'application/xml');
        res.send(xml);
    } catch (err) {
        console.error('Sitemap articles error:', err.message);
        res.status(500).send('<?xml version="1.0"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"></urlset>');
    }
});

// --- Sitemap: Videos ---
app.get('/sitemap-videos.xml', async (req, res) => {
    try {
        const baseUrl = process.env.SITE_URL || `${req.protocol}://${req.get('host')}`;
        const videos = await Video.find(
            { videoId: { $exists: true, $ne: '' } },
            'videoId slug createdAt updatedAt'
        ).lean();
        const videoUrls = videos.map(v => ({
            loc: `${baseUrl}/video/${v.slug || v.videoId}`,
            lastmod: (v.updatedAt || v.createdAt) ? new Date(v.updatedAt || v.createdAt).toISOString().split('T')[0] : undefined,
        }));
        const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${videoUrls.map(u => `  <url>
    <loc>${u.loc}</loc>${u.lastmod ? `\n    <lastmod>${u.lastmod}</lastmod>` : ''}
    <changefreq>weekly</changefreq>
    <priority>0.7</priority>
  </url>`).join('\n')}
</urlset>`;
        res.header('Content-Type', 'application/xml');
        res.send(xml);
    } catch (err) {
        console.error('Sitemap videos error:', err.message);
        res.status(500).send('<?xml version="1.0"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"></urlset>');
    }
});

// --- Sitemap: Google News (Published in the last 48 hours) ---
app.get('/news-sitemap.xml', async (req, res) => {
    try {
        const baseUrl = process.env.SITE_URL || 'https://www.zplusenews.com';
        const twoDaysAgo = new Date();
        twoDaysAgo.setHours(twoDaysAgo.getHours() - 48);

        const articles = await Article.find({
            status: 'PUBLISHED',
            publishedAt: { $gte: twoDaysAgo }
        }).sort({ publishedAt: -1 }).lean();

        const xmlItems = articles.map(article => {
            const pubDate = article.publishedAt || article.createdAt || new Date();
            const isoPubDate = new Date(pubDate).toISOString();
            const escapeXml = (str) => {
                return (str || '')
                    .replace(/&/g, '&amp;')
                    .replace(/</g, '&lt;')
                    .replace(/>/g, '&gt;')
                    .replace(/"/g, '&quot;')
                    .replace(/'/g, '&apos;');
            };
            return `  <url>
    <loc>${baseUrl}/article/${article.slug}</loc>
    <news:news>
      <news:publication>
        <news:name>ZPlus News</news:name>
        <news:language>en</news:language>
      </news:publication>
      <news:publication_date>${isoPubDate}</news:publication_date>
      <news:title>${escapeXml(article.title)}</news:title>
    </news:news>
  </url>`;
        }).join('\n');

        const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"
        xmlns:news="http://www.google.com/schemas/sitemap-news/0.9">
${xmlItems}
</urlset>`;

        res.header('Content-Type', 'application/xml');
        res.send(xml);
    } catch (err) {
        console.error('News sitemap error:', err.message);
        res.status(500).send('<?xml version="1.0"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:news="http://www.google.com/schemas/sitemap-news/0.9"></urlset>');
    }
});

// --- Legacy /sitemap.xml: redirect to sitemap-index for backward compatibility ---
app.get('/sitemap.xml', (req, res) => {
    res.redirect(301, '/sitemap-index.xml');
});

// Robots.txt fallback handler (before static/catch-all files to bypass SPA catch-all)
app.get('/robots.txt', (req, res) => {
    res.type('text/plain');
    const isProd = process.env.NODE_ENV === 'production';
    const filePath = isProd
        ? path.join(__dirname, 'client', 'dist', 'robots.txt')
        : path.join(__dirname, 'client', 'public', 'robots.txt');
        
    if (fs.existsSync(filePath)) {
        res.sendFile(filePath);
    } else {
        const rootPath = path.join(__dirname, 'robots.txt');
        if (fs.existsSync(rootPath)) {
            res.sendFile(rootPath);
        } else {
            res.status(404).send('Not Found');
        }
    }
});

// LLMs.txt fallback handler
app.get('/llms.txt', (req, res) => {
    res.type('text/plain');
    const isProd = process.env.NODE_ENV === 'production';
    const filePath = isProd
        ? path.join(__dirname, 'client', 'dist', 'llms.txt')
        : path.join(__dirname, 'client', 'public', 'llms.txt');
        
    if (fs.existsSync(filePath)) {
        res.sendFile(filePath);
    } else {
        res.status(404).send('Not Found');
    }
});

// Google Search Console Site Verification handler
app.get('/googled586bf8a07121b46.html', (req, res) => {
    const filePath = path.join(__dirname, 'googled586bf8a07121b46.html');
    if (fs.existsSync(filePath)) {
        res.sendFile(filePath);
    } else {
        res.status(404).send('Not Found');
    }
});

function slugify(text) {
    return (text || '')
        .toString()
        .toLowerCase()
        .trim()
        .replace(/\s+/g, '-')
        .replace(/[^\w\-]+/g, '')
        .replace(/\-\-+/g, '-');
}

function getCategoryInfo(categoryValue) {
    const mapping = {
        'national': { path: '/national-news', name: 'National News' },
        'international': { path: '/international-news', name: 'International News' },
        'state': { path: '/state-news', name: 'State News' },
        'positive': { path: '/positive-news', name: 'Positive News' },
        'fake-news': { path: '/fake-news', name: 'Fake News' },
        'polity': { path: '/polity', name: 'Polity' },
        'economics': { path: '/economics', name: 'Economics' },
        'technology': { path: '/technology', name: 'Technology' },
        'sports': { path: '/sports', name: 'Sports' },
        'health': { path: '/health', name: 'Health' },
        'defence': { path: '/defence', name: 'Defence' },
        'environment': { path: '/environment', name: 'Environment' },
        'culture': { path: '/culture', name: 'Culture' },
        'spirituality': { path: '/spirituality', name: 'Spirituality' },
        'agriculture': { path: '/agriculture', name: 'Agriculture' },
        'geography': { path: '/geography', name: 'Geography' },
        'religion': { path: '/religion', name: 'Religion' },
        'ai': { path: '/ai', name: 'AI' },
        'science': { path: '/science', name: 'Science' },
        'tourism': { path: '/tourism', name: 'Tourism' },
        'astrology': { path: '/astrology', name: 'Astrology' },
        'others': { path: '/others', name: 'Others' }
    };
    const key = (categoryValue || '').toLowerCase().trim();
    return mapping[key] || { path: `/${key}`, name: categoryValue || 'News' };
}

// SPA Fallback - Serve React app for any non-API routes (must be after all API routes)
// In-memory HTML shell cache
let htmlShellCache = null;

function getHtmlShell() {
    if (htmlShellCache && process.env.NODE_ENV === 'production') {
        return htmlShellCache;
    }
    
    try {
        const isProd = process.env.NODE_ENV === 'production';
        const htmlPath = isProd 
            ? path.join(__dirname, 'client', 'dist', 'index.html')
            : path.join(__dirname, 'client', 'index.html');
            
        if (fs.existsSync(htmlPath)) {
            htmlShellCache = fs.readFileSync(htmlPath, 'utf8');
            return htmlShellCache;
        }
    } catch (err) {
        console.error('Error reading index.html shell:', err.message);
    }
    
    return '<!DOCTYPE html><html><head><!-- Google tag (gtag.js) --><script async src="https://www.googletagmanager.com/gtag/js?id=G-6FC6CNDT51"></script><script>window.dataLayer = window.dataLayer || [];function gtag(){dataLayer.push(arguments);}gtag(\'js\', new Date());gtag(\'config\', \'G-6FC6CNDT51\');</script><title>ZPluse News</title></head><body><div id="root"></div></body></html>';
}

// GET /rss.xml - RSS Feed for Google News and search crawlers
app.get('/rss.xml', async (req, res) => {
    try {
        const siteUrl = process.env.SITE_URL || 'https://www.zplusenews.com';
        
        // Fetch 20 latest published articles
        const articles = await Article.find({ status: 'PUBLISHED' })
            .sort({ publishedAt: -1, createdAt: -1 })
            .limit(20);
            
        let rssItems = '';
        articles.forEach(article => {
            const articleUrl = `${siteUrl}/article/${article.slug}`;
            const pubDate = new Date(article.publishedAt || article.createdAt).toUTCString();
            const cleanDescription = (article.excerpt || article.content || '')
                .replace(/<[^>]*>/g, '') // strip HTML tags
                .replace(/&/g, '&amp;')
                .replace(/</g, '&lt;')
                .replace(/>/g, '&gt;')
                .trim()
                .substring(0, 250);
                
            const articleTitle = article.title
                .replace(/&/g, '&amp;')
                .replace(/</g, '&lt;')
                .replace(/>/g, '&gt;');

            rssItems += `
        <item>
            <title>${articleTitle}</title>
            <link>${articleUrl}</link>
            <guid isPermaLink="true">${articleUrl}</guid>
            <pubDate>${pubDate}</pubDate>
            <description>${cleanDescription}...</description>
            <author>${article.author?.name || 'Editorial Team'}</author>
            <category>${article.category || 'General'}</category>
        </item>`;
        });

        const rssFeed = `<?xml version="1.0" encoding="UTF-8" ?>
<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom">
<channel>
    <title>ZPluse News</title>
    <link>${siteUrl}</link>
    <description>ZPluse News delivers breaking news, latest national updates, politics, business trends, defense, technology and state news from India.</description>
    <language>en-in</language>
    <copyright>Copyright ${new Date().getFullYear()} ZPluse News</copyright>
    <lastBuildDate>${new Date().toUTCString()}</lastBuildDate>
    <atom:link href="${siteUrl}/rss.xml" rel="self" type="application/rss+xml" />
    ${rssItems}
</channel>
</rss>`;

        res.header('Content-Type', 'application/xml');
        return res.status(200).send(rssFeed);
    } catch (err) {
        console.error('Error generating RSS feed:', err.message);
        res.status(500).send('Internal Server Error');
    }
});

// All valid SPA routes — must match App.jsx Routes exactly.
// Any path NOT in this list returns a real 404 (fixes "Soft 404" in GSC).
const VALID_SPA_PATHS = new Set([
    '/', '/latest',
    '/national-news', '/international-news', '/state-news',
    '/polity', '/economics', '/technology', '/sports', '/health',
    '/defence', '/environment', '/culture', '/spirituality',
    '/agriculture', '/geography', '/religion', '/ai',
    '/science', '/tourism', '/others',
    '/fake-news', '/positive-news', '/astrology',
    '/videos', '/events', '/contests',
    '/about', '/contact', '/privacy', '/terms',
    '/about-us', '/contact-us', '/privacy-policy', '/terms-of-service',
    '/editorial-policy',
]);

// Catch-all route to serve the SPA app with dynamic pre-rendering
app.get('*', async (req, res) => {
    // Don't serve index.html for API routes, uploads, or static asset requests with extensions
    if (req.path.startsWith('/api/') || req.path.startsWith('/uploads/') || req.path.match(/\.(js|css|png|jpg|jpeg|gif|svg|ico|wasm|txt|xml|json)$/)) {
        return res.status(404).json({ success: false, error: 'Not found' });
    }

    // 301 Redirect legacy paths to standard SEO paths
    const legacyRedirects = {
        '/about': '/about-us',
        '/contact': '/contact-us',
        '/privacy': '/privacy-policy',
        '/terms': '/terms-of-service'
    };
    const reqPathNormalized = req.path.replace(/\/$/, '');
    if (legacyRedirects[reqPathNormalized]) {
        return res.redirect(301, legacyRedirects[reqPathNormalized]);
    }

    // Dynamic routes with prefixes are always valid
    const isDynamicRoute = req.path.startsWith('/article/') || req.path.startsWith('/video/') || req.path.startsWith('/author/') || req.path.startsWith('/admin');
    // Static routes must be in the valid set
    if (!isDynamicRoute && !VALID_SPA_PATHS.has(req.path) && !VALID_SPA_PATHS.has(req.path.replace(/\/$/, ''))) {
        // Unknown path — return true 404 (fixes Soft 404 in Google Search Console)
        let html = getHtmlShell();
        const notFoundHtml = html.replace(
            /(<title>).*?(<\/title>)/i,
            '$1404 - Page Not Found | ZPluse News$2'
        ).replace(
            '<div id="root"></div>',
            '<div id="root" style="text-align:center;padding:100px 20px;font-family:sans-serif;"><h1 style="font-size:72px;margin:0;color:#aa2123;">404</h1><h2>Page Not Found</h2><p>The page you are looking for does not exist.</p><a href="/" style="color:#aa2123;font-weight:bold;">← Back to Homepage</a></div>'
        );
        res.header('Content-Type', 'text/html');
        return res.status(404).send(notFoundHtml);
    }

    try {
        console.log('DEBUG: Catch-all route hit for path:', req.path);
        const siteUrl = process.env.SITE_URL || 'https://www.zplusenews.com';
        const reqPath = req.path.replace(/\/$/, ''); // Remove trailing slash
        const currentUrl = `${siteUrl}${reqPath}`;
        
        let html = getHtmlShell();
        
        // 0. Handle Homepage Route Dynamic Pre-rendering
        if (req.path === '/' || req.path === '') {
            try {
                // Fetch latest published articles
                const articles = await Article.find({ status: 'PUBLISHED' })
                    .sort({ publishedAt: -1, createdAt: -1 })
                    .limit(10);
                
                if (articles && articles.length > 0) {
                    // Generate ItemList Schema Markup
                    const itemListElement = articles.map((article, idx) => {
                        const articleImage = article.image 
                            ? (article.image.startsWith('http') || article.image.startsWith('data:') ? article.image : `${siteUrl}${article.image}`)
                            : `${siteUrl}/assets/images/og-image.png`;
                        
                        return {
                            "@type": "ListItem",
                            "position": idx + 1,
                            "url": `${siteUrl}/article/${article.slug}`,
                            "name": article.title,
                            "image": articleImage
                        };
                    });

                    const schema = {
                        "@context": "https://schema.org",
                        "@type": "ItemList",
                        "itemListElement": itemListElement
                    };

                    const schemaScript = `<script type="application/ld+json" id="homepage-item-list">${JSON.stringify(schema)}</script>`;
                    
                    // Pre-render content inside <div id="root"></div> for SEO bots
                    let articlesHtml = articles.map(article => {
                        const articleImage = article.image 
                            ? (article.image.startsWith('http') || article.image.startsWith('data:') ? article.image : `${siteUrl}${article.image}`)
                            : `${siteUrl}/assets/images/og-image.png`;
                        const cleanExcerpt = (article.excerpt || article.content || '')
                            .replace(/<[^>]*>/g, '') // strip html
                            .replace(/\s+/g, ' ')
                            .trim()
                            .substring(0, 150);
                        
                        return `
                        <div style="margin-bottom: 30px; padding: 20px; border-bottom: 1px solid #eee;">
                            <span style="background: #aa2123; color: #fff; padding: 2px 8px; font-size: 11px; font-weight: bold; border-radius: 4px; text-transform: uppercase;">${article.category}</span>
                            <h2 style="font-size: 24px; margin: 10px 0;"><a href="/article/${article.slug}" style="color: #111; text-decoration: none;">${article.title}</a></h2>
                            <p style="color: #666; font-size: 14px;">By ${article.author?.name || 'Editorial Team'} • ${article.publishedAt ? new Date(article.publishedAt).toLocaleDateString() : 'Recent'}</p>
                            ${article.image ? `<div style="margin: 15px 0;"><img src="${articleImage}" alt="${article.title}" style="max-width: 100%; max-height: 250px; object-fit: cover; border-radius: 8px;" /></div>` : ''}
                            <p style="font-size: 16px; line-height: 1.6;">${cleanExcerpt}...</p>
                            <a href="/article/${article.slug}" style="color: #aa2123; font-weight: bold; text-decoration: none;">Read Full Article →</a>
                        </div>`;
                    }).join('');

                    const bodyPreRender = `
                    <div id="root">
                        <div style="max-width: 900px; margin: 0 auto; padding: 20px; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">
                            <header style="text-align: center; margin-bottom: 40px; padding-bottom: 20px; border-bottom: 2px solid #aa2123;">
                                <h1 style="font-size: 42px; font-family: 'Playfair Display', Georgia, serif; margin: 10px 0;">ZPluse News</h1>
                                <p style="font-size: 18px; color: #555;">Breaking News, Latest India News, National & International Updates</p>
                            </header>
                            <main>
                                <section>
                                    <h2 style="font-size: 28px; border-bottom: 1px solid #333; padding-bottom: 10px; margin-bottom: 20px;">Top Stories</h2>
                                    ${articlesHtml}
                                </section>
                            </main>
                        </div>
                    </div>`;

                    html = html.replace('<div id="root"></div>', bodyPreRender);
                    html = html.replace('</head>', `${schemaScript}\n</head>`);
                }
            } catch (dbErr) {
                console.error('Error serving dynamic homepage pre-render:', dbErr.message);
            }
        }

        // 0.2 Handle Privacy Policy Route Pre-rendering
        if (reqPath === '/privacy-policy') {
            const pageTitle = `Privacy Policy | ZPlus News`;
            const pageDesc = `Read the Privacy Policy of ZPlus News. Understand how we collect, process, and safeguard your personal data in accordance with GDPR, CCPA, and DPDP laws.`;
            
            html = html
                .replace(/<title>.*?<\/title>/i, `<title>${pageTitle}</title>`)
                .replace(/<link\s+rel="canonical"\s+href=".*?"\s*\/?>/is, `<link rel="canonical" href="${currentUrl}" />`)
                .replace(/<meta\s+name="description"\s+content=".*?"\s*\/?>/is, `<meta name="description" content="${pageDesc}" />`)
                .replace(/<meta\s+property="og:title"\s+content=".*?"\s*\/?>/is, `<meta property="og:title" content="${pageTitle}" />`)
                .replace(/<meta\s+property="og:description"\s+content=".*?"\s*\/?>/is, `<meta property="og:description" content="${pageDesc}" />`)
                .replace(/<meta\s+property="og:url"\s+content=".*?"\s*\/?>/is, `<meta property="og:url" content="${currentUrl}" />`)
                .replace(/<meta\s+name="twitter:title"\s+content=".*?"\s*\/?>/is, `<meta name="twitter:title" content="${pageTitle}" />`)
                .replace(/<meta\s+name="twitter:description"\s+content=".*?"\s*\/?>/is, `<meta name="twitter:description" content="${pageDesc}" />`);

            const bodyPreRender = `
            <div id="root">
                <div style="max-width: 800px; margin: 0 auto; padding: 40px 20px; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; color: #111; line-height: 1.8;">
                    <h1 style="font-size: 36px; border-bottom: 2px solid #aa2123; padding-bottom: 10px; margin-bottom: 30px;">Privacy Policy</h1>
                    <p style="font-size: 14px; color: #666; margin-bottom: 20px;">Last Updated: May 27, 2026</p>
                    
                    <h2>1. Introduction</h2>
                    <p>Welcome to ZPlus News. We are committed to protecting your personal data and respecting your privacy. This policy outlines how we handle data collected via https://www.zplusenews.com.</p>
                    
                    <h2>2. Information We Collect</h2>
                    <p>We collect log/usage data automatically, cookies, and any personal information you provide when subscribing to newsletters or commenting (e.g. name, email).</p>
                    
                    <h2>3. How We Use Your Information</h2>
                    <p>We process information to operate our news services, analyze usage activity, prevent fraud, and send editorial newsletters in compliance with GDPR, CCPA, and India's DPDP Act.</p>
                    
                    <h2>4. Your Rights</h2>
                    <p>Depending on your location, you have rights to access, rectify, delete, or restrict the processing of your data. Contact us at privacy@zplusenews.com to exercise these rights.</p>
                </div>
            </div>`;

            html = html.replace('<div id="root"></div>', bodyPreRender);
            res.header('Content-Type', 'text/html');
            return res.status(200).send(html);
        }

        // 0.3 Handle Terms of Service Route Pre-rendering
        if (reqPath === '/terms-of-service') {
            const pageTitle = `Terms of Service | ZPlus News`;
            const pageDesc = `Read the Terms of Service of ZPlus News. Review user conduct guidelines, intellectual property rights, and terms governing our news publication platforms.`;
            
            html = html
                .replace(/<title>.*?<\/title>/i, `<title>${pageTitle}</title>`)
                .replace(/<link\s+rel="canonical"\s+href=".*?"\s*\/?>/is, `<link rel="canonical" href="${currentUrl}" />`)
                .replace(/<meta\s+name="description"\s+content=".*?"\s*\/?>/is, `<meta name="description" content="${pageDesc}" />`)
                .replace(/<meta\s+property="og:title"\s+content=".*?"\s*\/?>/is, `<meta property="og:title" content="${pageTitle}" />`)
                .replace(/<meta\s+property="og:description"\s+content=".*?"\s*\/?>/is, `<meta property="og:description" content="${pageDesc}" />`)
                .replace(/<meta\s+property="og:url"\s+content=".*?"\s*\/?>/is, `<meta property="og:url" content="${currentUrl}" />`)
                .replace(/<meta\s+name="twitter:title"\s+content=".*?"\s*\/?>/is, `<meta name="twitter:title" content="${pageTitle}" />`)
                .replace(/<meta\s+name="twitter:description"\s+content=".*?"\s*\/?>/is, `<meta name="twitter:description" content="${pageDesc}" />`);

            const bodyPreRender = `
            <div id="root">
                <div style="max-width: 800px; margin: 0 auto; padding: 40px 20px; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; color: #111; line-height: 1.8;">
                    <h1 style="font-size: 36px; border-bottom: 2px solid #aa2123; padding-bottom: 10px; margin-bottom: 30px;">Terms of Service</h1>
                    <p style="font-size: 14px; color: #666; margin-bottom: 20px;">Last Updated: May 27, 2026</p>
                    
                    <h2>1. Agreement to Terms</h2>
                    <p>By accessing or using the services of ZPlus News, you agree to comply with and be bound by these terms.</p>
                    
                    <h2>2. Intellectual Property</h2>
                    <p>All content published by ZPlus News is protected by copyright laws. You may not reproduce or distribute our content without explicit permission.</p>
                    
                    <h2>3. User Conduct</h2>
                    <p>Users must not engage in harmful behavior, post spam, or violate laws while using our website or comment sections.</p>
                </div>
            </div>`;

            html = html.replace('<div id="root"></div>', bodyPreRender);
            res.header('Content-Type', 'text/html');
            return res.status(200).send(html);
        }

        // 0.3b Handle Editorial Policy Route Pre-rendering
        if (reqPath === '/editorial-policy') {
            const pageTitle = `Editorial & Corrections Policy | ZPlus News`;
            const pageDesc = `Read the Editorial and Corrections Policy of ZPlus News. Learn about our verification standards, fact-checking processes, and correction guidelines.`;
            
            html = html
                .replace(/<title>.*?<\/title>/i, `<title>${pageTitle}</title>`)
                .replace(/<link\s+rel="canonical"\s+href=".*?"\s*\/?>/is, `<link rel="canonical" href="${currentUrl}" />`)
                .replace(/<meta\s+name="description"\s+content=".*?"\s*\/?>/is, `<meta name="description" content="${pageDesc}" />`)
                .replace(/<meta\s+property="og:title"\s+content=".*?"\s*\/?>/is, `<meta property="og:title" content="${pageTitle}" />`)
                .replace(/<meta\s+property="og:description"\s+content=".*?"\s*\/?>/is, `<meta property="og:description" content="${pageDesc}" />`)
                .replace(/<meta\s+property="og:url"\s+content=".*?"\s*\/?>/is, `<meta property="og:url" content="${currentUrl}" />`)
                .replace(/<meta\s+name="twitter:title"\s+content=".*?"\s*\/?>/is, `<meta name="twitter:title" content="${pageTitle}" />`)
                .replace(/<meta\s+name="twitter:description"\s+content=".*?"\s*\/?>/is, `<meta name="twitter:description" content="${pageDesc}" />`);

            const bodyPreRender = `
            <div id="root">
                <div style="max-width: 800px; margin: 0 auto; padding: 40px 20px; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; color: #111; line-height: 1.8;">
                    <h1 style="font-size: 36px; border-bottom: 2px solid #aa2123; padding-bottom: 10px; margin-bottom: 30px;">Editorial & Corrections Policy</h1>
                    <p style="font-size: 14px; color: #666; margin-bottom: 20px;">Last Updated: May 27, 2026</p>
                    
                    <h2>1. Editorial Integrity</h2>
                    <p>ZPlus News is dedicated to reporting news with accuracy, fairness, independence, and integrity.</p>
                    
                    <h2>2. Fact-Checking</h2>
                    <p>Every claim of fact in our articles is cross-referenced with multiple reputable sources or official statements.</p>
                    
                    <h2>3. Corrections</h2>
                    <p>When errors occur, ZPlus News is committed to correcting them promptly and transparently.</p>
                </div>
            </div>`;

            html = html.replace('<div id="root"></div>', bodyPreRender);
            res.header('Content-Type', 'text/html');
            return res.status(200).send(html);
        }

        // 0.3c Handle About Us Route Pre-rendering
        if (reqPath === '/about-us') {
            const pageTitle = `About Us | ZPlus News`;
            const pageDesc = `Learn about ZPlus News, our mission, editorial board, and company overview. Your trusted source for tech news and business insights.`;
            
            html = html
                .replace(/<title>.*?<\/title>/i, `<title>${pageTitle}</title>`)
                .replace(/<link\s+rel="canonical"\s+href=".*?"\s*\/?>/is, `<link rel="canonical" href="${currentUrl}" />`)
                .replace(/<meta\s+name="description"\s+content=".*?"\s*\/?>/is, `<meta name="description" content="${pageDesc}" />`)
                .replace(/<meta\s+property="og:title"\s+content=".*?"\s*\/?>/is, `<meta property="og:title" content="${pageTitle}" />`)
                .replace(/<meta\s+property="og:description"\s+content=".*?"\s*\/?>/is, `<meta property="og:description" content="${pageDesc}" />`)
                .replace(/<meta\s+property="og:url"\s+content=".*?"\s*\/?>/is, `<meta property="og:url" content="${currentUrl}" />`)
                .replace(/<meta\s+name="twitter:title"\s+content=".*?"\s*\/?>/is, `<meta name="twitter:title" content="${pageTitle}" />`)
                .replace(/<meta\s+name="twitter:description"\s+content=".*?"\s*\/?>/is, `<meta name="twitter:description" content="${pageDesc}" />`);

            const bodyPreRender = `
            <div id="root">
                <div style="max-width: 800px; margin: 0 auto; padding: 40px 20px; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; color: #111; line-height: 1.8;">
                    <h1 style="font-size: 36px; border-bottom: 2px solid #aa2123; padding-bottom: 10px; margin-bottom: 30px;">About ZPlus News</h1>
                    <p>ZPlus News is a premium news platform delivering breaking news, national updates, and deep analysis of polity, technology, and economics from India and around the globe.</p>
                    <p>Founded in 2020, we have grown to serve a diverse global audience of forward-thinking professionals and general readers.</p>
                </div>
            </div>`;

            html = html.replace('<div id="root"></div>', bodyPreRender);
            res.header('Content-Type', 'text/html');
            return res.status(200).send(html);
        }

        // 0.3d Handle Contact Us Route Pre-rendering
        if (reqPath === '/contact-us') {
            const pageTitle = `Contact Us | ZPlus News`;
            const pageDesc = `Get in touch with the editorial team, advertising, or support desks of ZPlus News. Contact phone, email, and address info.`;
            
            html = html
                .replace(/<title>.*?<\/title>/i, `<title>${pageTitle}</title>`)
                .replace(/<link\s+rel="canonical"\s+href=".*?"\s*\/?>/is, `<link rel="canonical" href="${currentUrl}" />`)
                .replace(/<meta\s+name="description"\s+content=".*?"\s*\/?>/is, `<meta name="description" content="${pageDesc}" />`)
                .replace(/<meta\s+property="og:title"\s+content=".*?"\s*\/?>/is, `<meta property="og:title" content="${pageTitle}" />`)
                .replace(/<meta\s+property="og:description"\s+content=".*?"\s*\/?>/is, `<meta property="og:description" content="${pageDesc}" />`)
                .replace(/<meta\s+property="og:url"\s+content=".*?"\s*\/?>/is, `<meta property="og:url" content="${currentUrl}" />`)
                .replace(/<meta\s+name="twitter:title"\s+content=".*?"\s*\/?>/is, `<meta name="twitter:title" content="${pageTitle}" />`)
                .replace(/<meta\s+name="twitter:description"\s+content=".*?"\s*\/?>/is, `<meta name="twitter:description" content="${pageDesc}" />`);

            const bodyPreRender = `
            <div id="root">
                <div style="max-width: 800px; margin: 0 auto; padding: 40px 20px; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; color: #111; line-height: 1.8;">
                    <h1 style="font-size: 36px; border-bottom: 2px solid #aa2123; padding-bottom: 10px; margin-bottom: 30px;">Contact ZPlus News</h1>
                    <p>If you have a news tip, suggestion, feedback, or business query, contact us using the details below:</p>
                    <p><strong>Email:</strong> support@zplusenews.com or editor@zplusenews.com</p>
                    <p><strong>Support:</strong> ZPlus News Media Desk</p>
                </div>
            </div>`;

            html = html.replace('<div id="root"></div>', bodyPreRender);
            res.header('Content-Type', 'text/html');
            return res.status(200).send(html);
        }

        // 0.3e Handle Author Route Pre-rendering
        if (reqPath.startsWith('/author/')) {
            const authorSlug = reqPath.split('/author/')[1];
            if (authorSlug) {
                try {
                    const articles = await Article.find({ status: 'PUBLISHED' }).select('author').lean();
                    const matchingArticle = articles.find(a => slugify(a.author?.name) === authorSlug);
                    
                    if (matchingArticle && matchingArticle.author?.name) {
                        const authorName = matchingArticle.author.name;
                        // Get complete author profile details from the database
                        const firstArticle = await Article.findOne({ status: 'PUBLISHED', 'author.name': authorName }).lean();
                        const authorDetails = firstArticle.author;
                        
                        // Fetch articles by this author
                        const authorArticles = await Article.find({ status: 'PUBLISHED', 'author.name': authorName })
                            .sort({ publishedAt: -1 })
                            .limit(10)
                            .lean();
                            
                        const pageTitle = `${authorDetails.name} Profile and Articles | ZPlus News`;
                        const pageDesc = authorDetails.bio || `Read articles published by ${authorDetails.name} on ZPlus News.`;
                        const authorAvatar = authorDetails.avatar || `${siteUrl}/assets/images/og-image.png`;
                        
                        // Generate Person Schema Markup
                        const schema = {
                            "@context": "https://schema.org",
                            "@type": "Person",
                            "name": authorDetails.name,
                            "image": authorAvatar,
                            "jobTitle": "Journalist",
                            "worksFor": {
                                "@type": "NewsMediaOrganization",
                                "name": "ZPlus News",
                                "url": siteUrl
                            },
                            "sameAs": [
                                authorDetails.linkedin || '',
                                authorDetails.twitter || ''
                            ].filter(Boolean)
                        };
                        
                        const schemaScript = `<script type="application/ld+json" id="author-json-ld">${JSON.stringify(schema)}</script>`;
                        
                        html = html
                            .replace(/<title>.*?<\/title>/i, `<title>${pageTitle}</title>`)
                            .replace(/<link\s+rel="canonical"\s+href=".*?"\s*\/?>/is, `<link rel="canonical" href="${currentUrl}" />`)
                            .replace(/<meta\s+name="description"\s+content=".*?"\s*\/?>/is, `<meta name="description" content="${pageDesc}" />`)
                            .replace(/<meta\s+property="og:title"\s+content=".*?"\s*\/?>/is, `<meta property="og:title" content="${pageTitle}" />`)
                            .replace(/<meta\s+property="og:description"\s+content=".*?"\s*\/?>/is, `<meta property="og:description" content="${pageDesc}" />`)
                            .replace(/<meta\s+property="og:image"\s+content=".*?"\s*\/?>/is, `<meta property="og:image" content="${authorAvatar}" />`)
                            .replace(/<meta\s+property="og:url"\s+content=".*?"\s*\/?>/is, `<meta property="og:url" content="${currentUrl}" />`)
                            .replace(/<meta\s+name="twitter:title"\s+content=".*?"\s*\/?>/is, `<meta name="twitter:title" content="${pageTitle}" />`)
                            .replace(/<meta\s+name="twitter:description"\s+content=".*?"\s*\/?>/is, `<meta name="twitter:description" content="${pageDesc}" />`);

                        html = html.replace('</head>', `${schemaScript}\n</head>`);
                        
                        // Generate articles list HTML
                        const articlesHtml = authorArticles.map(a => {
                            const cleanExcerpt = (a.excerpt || a.content || '')
                                .replace(/<[^>]*>/g, '')
                                .replace(/\s+/g, ' ')
                                .trim()
                                .substring(0, 160);
                            return `
                            <div style="border: 1px solid #eee; border-radius: 8px; padding: 20px; margin-bottom: 20px;">
                                <h3><a href="/article/${a.slug}">${a.title}</a></h3>
                                <p style="font-size: 14px; color: #666;">Published: ${a.publishedAt ? new Date(a.publishedAt).toLocaleDateString() : 'Recent'}</p>
                                <p>${cleanExcerpt}...</p>
                            </div>`;
                        }).join('');
                        
                        const bodyPreRender = `
                        <div id="root">
                            <div style="max-width: 800px; margin: 0 auto; padding: 40px 20px; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">
                                <div style="text-align: center; margin-bottom: 40px;">
                                    <img src="${authorAvatar}" alt="${authorDetails.name}" style="width: 120px; height: 120px; border-radius: 50%; object-fit: cover;" />
                                    <h1 style="margin: 15px 0 5px 0;">${authorDetails.name}</h1>
                                    <p style="color: #666; font-size: 16px; max-width: 600px; margin: 0 auto;">${authorDetails.bio || 'Journalist'}</p>
                                </div>
                                <hr style="border: 0; border-top: 1px solid #eee; margin: 40px 0;" />
                                <h2>Recent Articles</h2>
                                ${articlesHtml || '<p>No articles found.</p>'}
                            </div>
                        </div>`;
                        
                        html = html.replace('<div id="root"></div>', bodyPreRender);
                        res.header('Content-Type', 'text/html');
                        return res.status(200).send(html);
                    }
                } catch (dbErr) {
                    console.error('Error serving dynamic author profile pre-render:', dbErr.message);
                }
            }
        }

        // 0.4 Handle Category Pages Pre-rendering
        // Map URL paths to DB category/field values
        const CATEGORY_META = {
            '/national-news':      { cat: 'national',      title: 'National News',       desc: 'Latest national news from India. Breaking stories, government policies, politics and more.' },
            '/international-news': { cat: 'international', title: 'International News',  desc: 'Top international news from around the world. Global politics, conflicts, diplomacy and more.' },
            '/state-news':         { cat: 'state',         title: 'State News',          desc: 'Latest news from Indian states. Regional updates, state politics, governance and local stories.' },
            '/polity':             { cat: 'polity',             title: 'Polity News',          desc: 'Indian polity and political science news. Parliament, elections, democracy and governance updates.' },
            '/economics':          { cat: 'economics',          title: 'Economics News',       desc: 'Business and economics news from India. Market updates, economy trends, finance and trade news.' },
            '/technology':         { cat: 'technology',         title: 'Technology News',      desc: 'Latest technology news. AI, gadgets, startups, digital India and tech innovation updates.' },
            '/sports':             { cat: 'sports',             title: 'Sports News',          desc: 'Latest sports news from India. Cricket, football, Olympics, and all sports updates.' },
            '/health':             { cat: 'health',             title: 'Health News',          desc: 'Health news and wellness tips. Medical research, diseases, fitness and healthcare updates from India.' },
            '/defence':            { cat: 'defence',            title: 'Defence News',         desc: 'Indian defence and military news. Army, Navy, Air Force, weapons and border security updates.' },
            '/environment':        { cat: 'environment',        title: 'Environment News',     desc: 'Environment and climate change news from India. Nature, pollution, sustainability and green energy.' },
            '/culture':            { cat: 'culture',            title: 'Culture News',         desc: 'Indian culture and heritage news. Art, music, cinema, literature and cultural events.' },
            '/spirituality':       { cat: 'spirituality',       title: 'Spirituality News',    desc: 'Spirituality and religion news from India. Yoga, meditation, temples and spiritual events.' },
            '/agriculture':        { cat: 'agriculture',        title: 'Agriculture News',     desc: 'Agriculture news from India. Farming, crops, MSP, rural economy and agri-technology updates.' },
            '/geography':          { cat: 'geography',          title: 'Geography News',       desc: 'Geography and geopolitics news. Indian regions, borders, natural resources and geographic events.' },
            '/religion':           { cat: 'religion',           title: 'Religion News',        desc: 'Religion news from India. Hindu, Muslim, Sikh, Christian, Buddhist news and religious events.' },
            '/ai':                 { cat: 'ai',                 title: 'AI & Technology News', desc: 'Artificial intelligence news from India. AI research, machine learning, ChatGPT and AI policy.' },
            '/science':            { cat: 'science',            title: 'Science News',         desc: 'Science news from India. ISRO, research, discoveries, space exploration and scientific innovations.' },
            '/tourism':            { cat: 'tourism',            title: 'Tourism News',         desc: 'Tourism news from India. Travel destinations, heritage sites, tourism policies and travel tips.' },
            '/others':             { cat: 'others',             title: 'Other News',           desc: 'Latest news and updates from ZPluse News covering various topics and categories.' },
            '/fake-news':          { cat: 'fake-news',          title: 'Fact Check & Fake News', desc: 'Fact-check and fake news busting. Verify viral news, misinformation and rumours from India.' },
            '/positive-news':      { cat: 'positive',           title: 'Positive News',        desc: 'Positive and inspiring news from India. Good news stories, achievements, and uplifting updates.' },
            '/astrology':          { cat: 'astrology',          title: 'Astrology News',       desc: 'Daily horoscope, astrology predictions and spiritual news. Kundali, rashifal and jyotish updates.' },
            '/latest':             { cat: null,                 title: 'Latest News',          desc: 'Latest breaking news from India. Most recent news updates, top stories and current affairs.' },
        };

        const catMeta = CATEGORY_META[reqPath];
        if (catMeta) {
            try {
                const query = catMeta.cat
                    ? { status: 'PUBLISHED', category: catMeta.cat }
                    : { status: 'PUBLISHED' };
                const catArticles = await Article.find(query, 'slug title excerpt category publishedAt image author')
                    .sort({ publishedAt: -1, createdAt: -1 })
                    .limit(15)
                    .lean();

                // Enforce pattern: "{Category Name} News - Latest {Category} Updates | ZPlus News"
                let catCleanName = catMeta.title;
                if (catCleanName.endsWith(' News')) {
                    catCleanName = catCleanName.replace(' News', '');
                }
                const pageTitle = `${catCleanName} News - Latest ${catCleanName} Updates | ZPlus News`;
                const pageDesc = catMeta.desc;

                html = html
                    .replace(/(<title>).*?(<\/title>)/i, `$1${pageTitle}$2`)
                    .replace(/<link\s+rel="canonical"\s+href=".*?"\s*\/?>/is, `<link rel="canonical" href="${currentUrl}" />`)
                    .replace(/<meta\s+name="description"\s+content=".*?"\s*\/?>/is, `<meta name="description" content="${pageDesc}" />`)
                    .replace(/<meta\s+property="og:title"\s+content=".*?"\s*\/?>/is, `<meta property="og:title" content="${pageTitle}" />`)
                    .replace(/<meta\s+property="og:description"\s+content=".*?"\s*\/?>/is, `<meta property="og:description" content="${pageDesc}" />`)
                    .replace(/<meta\s+property="og:url"\s+content=".*?"\s*\/?>/is, `<meta property="og:url" content="${currentUrl}" />`)
                    .replace(/<meta\s+name="twitter:title"\s+content=".*?"\s*\/?>/is, `<meta name="twitter:title" content="${pageTitle}" />`)
                    .replace(/<meta\s+name="twitter:description"\s+content=".*?"\s*\/?>/is, `<meta name="twitter:description" content="${pageDesc}" />`);

                // Generate BreadcrumbList Schema Script
                const breadcrumbSchema = {
                    "@context": "https://schema.org",
                    "@type": "BreadcrumbList",
                    "itemListElement": [
                        {
                            "@type": "ListItem",
                            "position": 1,
                            "name": "Home",
                            "item": siteUrl
                        },
                        {
                            "@type": "ListItem",
                            "position": 2,
                            "name": catMeta.title,
                            "item": currentUrl
                        }
                    ]
                };
                const breadcrumbScript = `<script type="application/ld+json" id="breadcrumb-json-ld">${JSON.stringify(breadcrumbSchema)}</script>`;
                html = html.replace('</head>', `${breadcrumbScript}\n</head>`);

                let articlesHtml = '';
                if (catArticles && catArticles.length > 0) {
                    articlesHtml = catArticles.map(article => {
                        const articleImage = article.image
                            ? (article.image.startsWith('http') || article.image.startsWith('data:') ? article.image : `${siteUrl}${article.image}`)
                            : `${siteUrl}/assets/images/og-image.png`;
                        const cleanExcerpt = (article.excerpt || '')
                            .replace(/<[^>]*>/g, '').replace(/\s+/g, ' ').trim().substring(0, 140);
                        return `
                        <div style="margin-bottom:28px;padding-bottom:20px;border-bottom:1px solid #eee;">
                            <span style="background:#aa2123;color:#fff;padding:2px 8px;font-size:11px;font-weight:700;border-radius:4px;text-transform:uppercase;">${article.category || catMeta.title}</span>
                            <h2 style="font-size:22px;margin:10px 0 6px;font-family:'Playfair Display',Georgia,serif;line-height:1.35;">
                                <a href="/article/${article.slug}" style="color:#111;text-decoration:none;">${article.title}</a>
                            </h2>
                            <p style="color:#555;font-size:14px;margin:0 0 8px;">By ${article.author?.name || 'Editorial Team'} &bull; ${article.publishedAt ? new Date(article.publishedAt).toLocaleDateString('en-IN') : ''}</p>
                            ${article.image ? `<img src="${articleImage}" alt="${article.title}" style="max-width:100%;max-height:220px;object-fit:cover;border-radius:8px;margin-bottom:8px;" loading="lazy"/>` : ''}
                            <p style="font-size:15px;line-height:1.6;color:#333;">${cleanExcerpt}${cleanExcerpt ? '...' : ''}</p>
                            <a href="/article/${article.slug}" style="color:#aa2123;font-weight:600;font-size:14px;text-decoration:none;">Read Full Story &rarr;</a>
                        </div>`;
                    }).join('');
                } else {
                    articlesHtml = '<p style="color:#666;">No articles found in this category yet. Check back soon!</p>';
                }

                const bodyPreRender = `
                <div id="root">
                    <div style="max-width:900px;margin:0 auto;padding:30px 20px;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
                        <header style="margin-bottom:30px;padding-bottom:15px;border-bottom:3px solid #aa2123;">
                            <h1 style="font-size:36px;font-family:'Playfair Display',Georgia,serif;margin:0;">${catMeta.title}</h1>
                            <p style="color:#555;font-size:16px;margin:8px 0 0;">${pageDesc}</p>
                        </header>
                        <main>${articlesHtml}</main>
                        <footer style="margin-top:40px;text-align:center;">
                            <a href="/" style="color:#aa2123;font-weight:600;">&larr; Back to ZPluse News Home</a>
                        </footer>
                    </div>
                </div>`;

                html = html.replace('<div id="root"></div>', bodyPreRender);
                res.header('Content-Type', 'text/html');
                return res.status(200).send(html);
            } catch (catErr) {
                console.error('Error pre-rendering category page:', catErr.message);
                // Fall through to serve plain shell
            }
        }

        // 1. Handle Article Route
        if (req.path.startsWith('/article/')) {
            const slug = req.path.split('/article/')[1];
            if (slug) {
                try {
                    const article = await Article.findOne({ slug });
                    if (article) {
                    // Extract a clean excerpt for description
                    const cleanExcerpt = (article.excerpt || article.content || '')
                        .replace(/<[^>]*>/g, '') // strip html
                        .replace(/\s+/g, ' ')
                        .trim()
                        .substring(0, 160);
                        
                    const articleTitle = `${article.title} | ZPlus News`;
                    const articleImage = article.image 
                        ? (article.image.startsWith('http') || article.image.startsWith('data:') ? article.image : `${siteUrl}${article.image}`)
                        : `${siteUrl}/assets/images/og-image.png`;
                        
                    // Generate Schema Markup
                    const schema = {
                        "@context": "https://schema.org",
                        "@type": "NewsArticle",
                        "headline": article.title,
                        "image": [articleImage],
                        "datePublished": article.publishedAt || article.createdAt || new Date().toISOString(),
                        "dateModified": article.updatedAt || article.publishedAt || article.createdAt || new Date().toISOString(),
                        "author": [{
                            "@type": "Person",
                            "name": article.author?.name || 'Editorial Team',
                            "url": `${siteUrl}/author/${slugify(article.author?.name || 'Editorial Team')}`
                        }],
                        "publisher": {
                            "@type": "NewsMediaOrganization",
                            "name": "ZPlus News",
                            "logo": {
                                "@type": "ImageObject",
                                "url": `${siteUrl}/assets/images/logo.png`
                            }
                        },
                        "description": cleanExcerpt
                    };
                    
                    const schemaScript = `<script type="application/ld+json" id="article-json-ld">${JSON.stringify(schema)}</script>`;
                    
                    // Generate BreadcrumbList Schema Script
                    const catInfo = getCategoryInfo(article.category);
                    const breadcrumbSchema = {
                        "@context": "https://schema.org",
                        "@type": "BreadcrumbList",
                        "itemListElement": [
                            {
                                "@type": "ListItem",
                                "position": 1,
                                "name": "Home",
                                "item": siteUrl
                            },
                            {
                                "@type": "ListItem",
                                "position": 2,
                                "name": catInfo.name,
                                "item": `${siteUrl}${catInfo.path}`
                            },
                            {
                                "@type": "ListItem",
                                "position": 3,
                                "name": article.title,
                                "item": currentUrl
                            }
                        ]
                    };
                    const breadcrumbScript = `<script type="application/ld+json" id="breadcrumb-json-ld">${JSON.stringify(breadcrumbSchema)}</script>`;

                    // Replace Metadata dynamically
                    html = html
                        .replace(/<title>.*?<\/title>/i, `<title>${articleTitle}</title>`)
                        .replace(/<link\s+rel="canonical"\s+href=".*?"\s*\/?>/is, `<link rel="canonical" href="${currentUrl}" />`)
                        .replace(/<meta\s+name="description"\s+content=".*?"\s*\/?>/is, `<meta name="description" content="${cleanExcerpt}" />`)
                        // Open Graph
                        .replace(/<meta\s+property="og:title"\s+content=".*?"\s*\/?>/is, `<meta property="og:title" content="${article.title}" />`)
                        .replace(/<meta\s+property="og:description"\s+content=".*?"\s*\/?>/is, `<meta property="og:description" content="${cleanExcerpt}" />`)
                        .replace(/<meta\s+property="og:image"\s+content=".*?"\s*\/?>/is, `<meta property="og:image" content="${articleImage}" />`)
                        .replace(/<meta\s+property="og:url"\s+content=".*?"\s*\/?>/is, `<meta property="og:url" content="${currentUrl}" />`)
                        .replace(/<meta\s+property="og:type"\s+content=".*?"\s*\/?>/is, `<meta property="og:type" content="article" />`)
                        // Twitter
                        .replace(/<meta\s+name="twitter:title"\s+content=".*?"\s*\/?>/is, `<meta name="twitter:title" content="${article.title}" />`)
                        .replace(/<meta\s+name="twitter:description"\s+content=".*?"\s*\/?>/is, `<meta name="twitter:description" content="${cleanExcerpt}" />`)
                        .replace(/<meta\s+name="twitter:image"\s+content=".*?"\s*\/?>/is, `<meta name="twitter:image" content="${articleImage}" />`);
                        
                    // Inject schema scripts before </head>
                    html = html.replace('</head>', `${schemaScript}\n${breadcrumbScript}\n</head>`);
                    
                    // Pre-render content inside <div id="root"></div> for AI crawlers
                    const formattedDate = article.publishedAt
                        ? new Date(article.publishedAt).toLocaleDateString('en-US', {
                            weekday: 'long', month: 'long', day: 'numeric', year: 'numeric'
                           })
                        : 'Today';
                        
                    const bodyPreRender = `
<div id="root">
    <article style="max-width: 800px; margin: 0 auto; padding: 40px 20px; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; color: #111; line-height: 1.8;">
        <header style="margin-bottom: 30px; border-bottom: 1px solid #eee; padding-bottom: 20px;">
            <span style="background: #aa2123; color: #fff; padding: 4px 10px; font-size: 12px; font-weight: 700; border-radius: 4px; text-transform: uppercase;">${article.category}</span>
            <h1 style="font-size: 36px; margin: 15px 0 10px 0; font-family: 'Playfair Display', Georgia, serif; line-height: 1.3; font-weight: 800;">${article.title}</h1>
            <div style="font-size: 14px; color: #666;">
                <span>By <strong><a href="/author/${slugify(article.author?.name || 'Editorial Team')}">${article.author?.name || 'Editorial Team'}</a></strong></span>
                <span style="margin: 0 8px;">•</span>
                <span>${formattedDate}</span>
            </div>
        </header>
        ${article.image ? `<div style="margin-bottom: 30px;"><img src="${articleImage}" alt="${article.title}" style="width: 100%; max-height: 450px; object-fit: cover; border-radius: 12px;" /></div>` : ''}
        <div class="content" style="font-size: 18px;">
            ${article.content || '<p>Article content is loading...</p>'}
        </div>
        ${article.author && article.author.name && (article.author.bio || article.author.avatar) ? `
        <footer style="margin-top: 50px; padding: 30px; background: #f9f9f9; border-radius: 12px; display: flex; gap: 20px; align-items: center; border: 1px solid #eee;">
            ${article.author.avatar ? `<img src="${article.author.avatar}" alt="${article.author.name}" style="width: 70px; height: 70px; border-radius: 50%; object-fit: cover;" />` : ''}
            <div>
                <h3 style="margin: 0 0 5px 0; font-size: 18px;"><a href="/author/${slugify(article.author.name)}" style="color: inherit; text-decoration: none;">${article.author.name}</a></h3>
                <p style="margin: 0; font-size: 14px; color: #555; line-height: 1.5;">${article.author.bio}</p>
                <div style="margin-top: 10px; font-size: 14px;">
                    ${article.author.linkedin ? `<a href="${article.author.linkedin}" target="_blank" style="color: #0077b5; text-decoration: none; margin-right: 15px;">LinkedIn</a>` : ''}
                    ${article.author.twitter ? `<a href="${article.author.twitter}" target="_blank" style="color: #1da1f2; text-decoration: none;">Twitter</a>` : ''}
                </div>
            </div>
        </footer>
        ` : ''}
    </article>
</div>`;
                    
                    html = html.replace('<div id="root"></div>', bodyPreRender);
                    
                    res.header('Content-Type', 'text/html');
                    return res.status(200).send(html);
                } else {
                    // Article not found - send index shell with 404
                    res.header('Content-Type', 'text/html');
                    return res.status(404).send(html.replace('<div id="root"></div>', '<div id="root" style="text-align:center;padding:100px 0;"><h1>404 Article Not Found</h1><p>The requested article does not exist.</p><a href="/">Go to Homepage</a></div>'));
                }
            } catch (dbErr) {
                console.error('Error serving dynamic article page:', dbErr.message);
            }
        }
        }

        // 1b. Handle Video Route
        if (req.path.startsWith('/video/')) {
            const videoIdentifier = req.path.split('/video/')[1];
            if (videoIdentifier) {
                try {
                    const video = await Video.findOne({
                        $or: [
                            { videoId: videoIdentifier },
                            { slug: videoIdentifier }
                        ]
                    });
                    if (video) {
                        if (video.slug && videoIdentifier === video.videoId) {
                            return res.redirect(301, `/video/${video.slug}`);
                        }
                        const cleanExcerpt = (video.articleContent || video.description || '')
                            .replace(/<[^>]*>/g, '')
                            .replace(/\s+/g, ' ')
                            .trim()
                            .substring(0, 160) || 'Watch video news on ZPlus News.';
                        
                        const videoTitle = `${video.title} | ZPlus News`;
                        const videoImage = video.thumbnail || `${siteUrl}/assets/images/og-image.png`;
                        
                        // Generate VideoObject Schema Markup
                        const schema = {
                            "@context": "https://schema.org",
                            "@type": "VideoObject",
                            "name": video.title,
                            "description": cleanExcerpt,
                            "thumbnailUrl": [videoImage],
                            "uploadDate": video.createdAt || new Date().toISOString(),
                            "contentUrl": `https://www.youtube.com/watch?v=${video.videoId}`,
                            "embedUrl": `https://www.youtube.com/embed/${video.videoId}`,
                            "publisher": {
                                "@type": "NewsMediaOrganization",
                                "name": "ZPlus News",
                                "logo": {
                                    "@type": "ImageObject",
                                    "url": `${siteUrl}/assets/images/logo.png`
                                }
                            }
                        };
                        
                        const schemaScript = `<script type="application/ld+json" id="video-json-ld">${JSON.stringify(schema)}</script>`;
                        
                        // Generate BreadcrumbList Schema Script
                        const catInfo = getCategoryInfo(video.category);
                        const breadcrumbSchema = {
                            "@context": "https://schema.org",
                            "@type": "BreadcrumbList",
                            "itemListElement": [
                                {
                                    "@type": "ListItem",
                                    "position": 1,
                                    "name": "Home",
                                    "item": siteUrl
                                },
                                {
                                    "@type": "ListItem",
                                    "position": 2,
                                    "name": catInfo.name,
                                    "item": `${siteUrl}${catInfo.path}`
                                },
                                {
                                    "@type": "ListItem",
                                    "position": 3,
                                    "name": video.title,
                                    "item": currentUrl
                                }
                            ]
                        };
                        const breadcrumbScript = `<script type="application/ld+json" id="breadcrumb-json-ld">${JSON.stringify(breadcrumbSchema)}</script>`;

                        // Replace Metadata dynamically
                        html = html
                            .replace(/<title>.*?<\/title>/i, `<title>${videoTitle}</title>`)
                            .replace(/<link\s+rel="canonical"\s+href=".*?"\s*\/?>/is, `<link rel="canonical" href="${currentUrl}" />`)
                            .replace(/<meta\s+name="description"\s+content=".*?"\s*\/?>/is, `<meta name="description" content="${cleanExcerpt}" />`)
                            // Open Graph
                            .replace(/<meta\s+property="og:title"\s+content=".*?"\s*\/?>/is, `<meta property="og:title" content="${video.title}" />`)
                            .replace(/<meta\s+property="og:description"\s+content=".*?"\s*\/?>/is, `<meta property="og:description" content="${cleanExcerpt}" />`)
                            .replace(/<meta\s+property="og:image"\s+content=".*?"\s*\/?>/is, `<meta property="og:image" content="${videoImage}" />`)
                            .replace(/<meta\s+property="og:url"\s+content=".*?"\s*\/?>/is, `<meta property="og:url" content="${currentUrl}" />`)
                            .replace(/<meta\s+property="og:type"\s+content=".*?"\s*\/?>/is, `<meta property="og:type" content="video" />`)
                            // Twitter
                            .replace(/<meta\s+name="twitter:title"\s+content=".*?"\s*\/?>/is, `<meta name="twitter:title" content="${video.title}" />`)
                            .replace(/<meta\s+name="twitter:description"\s+content=".*?"\s*\/?>/is, `<meta name="twitter:description" content="${cleanExcerpt}" />`)
                            .replace(/<meta\s+name="twitter:image"\s+content=".*?"\s*\/?>/is, `<meta name="twitter:image" content="${videoImage}" />`);
                            
                        // Inject schema scripts before </head>
                        html = html.replace('</head>', `${schemaScript}\n${breadcrumbScript}\n</head>`);
                        
                        // Pre-render content inside <div id="root"></div> for AI crawlers
                        const formattedDate = video.createdAt
                            ? new Date(video.createdAt).toLocaleDateString('en-US', {
                                weekday: 'long', month: 'long', day: 'numeric', year: 'numeric'
                              })
                            : 'Today';
                            
                        const bodyPreRender = `
<div id="root">
    <article style="max-width: 800px; margin: 0 auto; padding: 40px 20px; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; color: #111; line-height: 1.8;">
        <header style="margin-bottom: 30px; border-bottom: 1px solid #eee; padding-bottom: 20px;">
            <span style="background: #aa2123; color: #fff; padding: 4px 10px; font-size: 12px; font-weight: 700; border-radius: 4px; text-transform: uppercase;">${video.category}</span>
            <h1 style="font-size: 36px; margin: 15px 0 10px 0; font-family: 'Playfair Display', Georgia, serif; line-height: 1.3; font-weight: 800;">${video.title}</h1>
            <div style="font-size: 14px; color: #666;">
                <span>By <strong>${video.youtubeChannelTitle || 'ZPluse News'}</strong></span>
                <span style="margin: 0 8px;">•</span>
                <span>${formattedDate}</span>
            </div>
        </header>
        <div style="margin-bottom: 30px; position: relative; padding-bottom: 56.25%; height: 0; overflow: hidden; max-width: 100%; border-radius: 12px;">
            <iframe src="https://www.youtube.com/embed/${video.videoId}" style="position: absolute; top: 0; left: 0; width: 100%; height: 100%; border: 0;" allowfullscreen></iframe>
        </div>
        <div class="content" style="font-size: 18px;">
            ${video.articleContent || video.description || '<p>Video details loading...</p>'}
        </div>
    </article>
</div>`;
                        
                        html = html.replace('<div id="root"></div>', bodyPreRender);
                        
                        res.header('Content-Type', 'text/html');
                        return res.status(200).send(html);
                    } else {
                        // Video not found - send index shell with 404
                        res.header('Content-Type', 'text/html');
                        return res.status(404).send(html.replace('<div id="root"></div>', '<div id="root" style="text-align:center;padding:100px 0;"><h1>404 Video Not Found</h1><p>The requested video does not exist.</p><a href="/">Go to Homepage</a></div>'));
                    }
                } catch (dbErr) {
                    console.error('Error serving dynamic video page:', dbErr.message);
                }
            }
        }

    // 2. Handle Canonical URL for static / category pages (break canonical trap)
        if (html.includes('<link rel="canonical" href="https://www.zplusenews.com/" />')) {
            html = html.replace(
                '<link rel="canonical" href="https://www.zplusenews.com/" />',
                `<link rel="canonical" href="${currentUrl}" />`
            );
        } else {
            // fallback generic replace
            html = html.replace(
                /<link\s+rel="canonical"\s+href=".*?"\s*\/?>/is,
                `<link rel="canonical" href="${currentUrl}" />`
            );
        }
        
        res.header('Content-Type', 'text/html');
        res.status(200).send(html);
    } catch (err) {
        console.error('Catch-all handler error:', err.message);
        res.status(500).send('Internal Server Error');
    }
});

// Start Server
app.listen(PORT, () => {
    console.log(`Server running on port ${PORT} (MongoDB Mode)`);
});