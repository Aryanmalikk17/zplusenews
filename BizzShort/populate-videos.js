/**
 * Populate Real YouTube Videos from @bizz_short channel
 * Run this script after creating your first admin account
 * 
 * Usage: node populate-videos.js
 */

const mongoose = require('mongoose');
require('dotenv').config();

// Video Schema (matching server model)
const videoSchema = new mongoose.Schema({
    title: { type: String, required: true },
    category: { type: String, required: true },
    source: { type: String, enum: ['youtube', 'instagram'], required: true },
    videoId: { type: String, required: true },
    thumbnail: { type: String },
    description: { type: String },
    views: { type: String, default: '0' },
    date: { type: String },
    duration: { type: String },
    featured: { type: Boolean, default: false },
    tags: [String],
    createdAt: { type: Date, default: Date.now }
});

const Video = mongoose.model('Video', videoSchema);

// Real videos from @bizz_short YouTube channel - Add your actual video IDs here
const realVideos = [
    // Featured/Breaking News Videos
    {
        title: "Stock Market Analysis Today - Live Updates",
        category: "Markets",
        source: "youtube",
        videoId: "YOUR_VIDEO_ID_1", // Replace with real video ID from your channel
        description: "Daily stock market analysis with live updates on Nifty, Sensex and top stocks",
        views: "5.2K",
        duration: "8:45",
        featured: true,
        tags: ["markets", "stocks", "nifty", "sensex"]
    },
    {
        title: "Business News Headlines Today",
        category: "Business",
        source: "youtube",
        videoId: "YOUR_VIDEO_ID_2", // Replace with real video ID
        description: "Top business news and corporate updates",
        views: "3.8K",
        duration: "10:20",
        featured: true,
        tags: ["business", "news", "corporate"]
    },
    {
        title: "Startup Funding Updates - Weekly Roundup",
        category: "Startups",
        source: "youtube",
        videoId: "YOUR_VIDEO_ID_3", // Replace with real video ID
        description: "This week's biggest startup funding rounds and acquisitions",
        views: "4.5K",
        duration: "12:30",
        featured: false,
        tags: ["startups", "funding", "investment"]
    },
    {
        title: "Tech Industry News & Updates",
        category: "Technology",
        source: "youtube",
        videoId: "YOUR_VIDEO_ID_4", // Replace with real video ID
        description: "Latest technology news affecting businesses",
        views: "6.1K",
        duration: "9:15",
        featured: false,
        tags: ["technology", "tech", "innovation"]
    },
    {
        title: "Banking Sector Analysis",
        category: "Banking",
        source: "youtube",
        videoId: "YOUR_VIDEO_ID_5", // Replace with real video ID
        description: "Deep dive into banking sector performance and RBI updates",
        views: "2.9K",
        duration: "15:00",
        featured: false,
        tags: ["banking", "finance", "rbi"]
    },
    {
        title: "Economy Update - GDP & Inflation",
        category: "Economy",
        source: "youtube",
        videoId: "YOUR_VIDEO_ID_6", // Replace with real video ID
        description: "Economic indicators, GDP growth and inflation analysis",
        views: "4.2K",
        duration: "11:45",
        featured: false,
        tags: ["economy", "gdp", "inflation"]
    }
];

// Instagram Reels (if you have them)
const instagramReels = [
    {
        title: "Market Update in 60 Seconds",
        category: "Markets",
        source: "instagram",
        videoId: "YOUR_INSTAGRAM_REEL_ID", // Replace with real Instagram reel ID
        description: "Quick market update",
        views: "10K",
        duration: "0:60",
        featured: false,
        tags: ["shorts", "quick", "markets"]
    }
];

async function connectDB() {
    try {
        await mongoose.connect(process.env.MONGO_URI, {
            useNewUrlParser: true,
            useUnifiedTopology: true
        });
        console.log('✅ MongoDB Connected');
    } catch (err) {
        console.error('❌ MongoDB Connection Error:', err.message);
        process.exit(1);
    }
}

async function populateVideos() {
    await connectDB();
    
    console.log('\n🎬 Populating Videos...\n');
    
    // Clear existing videos (optional - comment out if you want to keep existing)
    // await Video.deleteMany({});
    // console.log('🗑️ Cleared existing videos');
    
    let addedCount = 0;
    let skippedCount = 0;
    
    const allVideos = [...realVideos, ...instagramReels];
    
    for (const videoData of allVideos) {
        try {
            // Skip placeholder IDs
            if (videoData.videoId.startsWith('YOUR_')) {
                console.log(`⚠️ Skipping placeholder: ${videoData.title}`);
                skippedCount++;
                continue;
            }
            
            // Check if video already exists
            const exists = await Video.findOne({ videoId: videoData.videoId });
            if (exists) {
                console.log(`⏭️ Already exists: ${videoData.title}`);
                skippedCount++;
                continue;
            }
            
            // Generate thumbnail URL
            const thumbnail = videoData.source === 'youtube' 
                ? `https://img.youtube.com/vi/${videoData.videoId}/maxresdefault.jpg`
                : `https://www.instagram.com/p/${videoData.videoId}/media/?size=l`;
            
            const video = new Video({
                ...videoData,
                thumbnail,
                date: new Date().toLocaleDateString('en-IN', { 
                    year: 'numeric', 
                    month: 'short', 
                    day: 'numeric' 
                })
            });
            
            await video.save();
            console.log(`✅ Added: ${videoData.title}`);
            addedCount++;
            
        } catch (error) {
            console.error(`❌ Error adding ${videoData.title}:`, error.message);
        }
    }
    
    console.log(`\n📊 Summary:`);
    console.log(`   Added: ${addedCount}`);
    console.log(`   Skipped: ${skippedCount}`);
    console.log(`\n✨ Done! Videos populated successfully.\n`);
    
    // Show how to get video IDs
    console.log('📝 HOW TO ADD YOUR REAL VIDEOS:');
    console.log('================================');
    console.log('1. Go to your YouTube video');
    console.log('2. Copy the video ID from the URL:');
    console.log('   https://youtube.com/watch?v=VIDEO_ID_HERE');
    console.log('3. Replace YOUR_VIDEO_ID_X with the actual ID');
    console.log('4. Run this script again\n');
    
    process.exit(0);
}

populateVideos();
