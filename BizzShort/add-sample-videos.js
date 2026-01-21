/**
 * Add Sample Instagram Videos to Database
 * Run this script to populate sample videos
 * 
 * Usage: node add-sample-videos.js
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

// Sample videos with real Instagram post IDs (you can replace these with your own)
const sampleVideos = [
    {
        title: "📈 Stock Market Update: Nifty Closes at Record High",
        category: "Markets",
        source: "instagram",
        videoId: "DDrCiY8y9E4", // Replace with your Instagram post ID
        description: "Today's market analysis and top performing stocks",
        views: "5.2K",
        duration: "0:45",
        featured: true,
        tags: ["markets", "stocks", "nifty"]
    },
    {
        title: "🚀 Startup Spotlight: India's Unicorn Journey",
        category: "Startups",
        source: "instagram",
        videoId: "DDerXYiP-Kq", // Replace with your Instagram post ID
        description: "How Indian startups are disrupting global markets",
        views: "3.8K",
        duration: "1:00",
        featured: false,
        tags: ["startups", "unicorn", "india"]
    },
    {
        title: "💼 Business News: Top Corporate Announcements",
        category: "Business",
        source: "instagram",
        videoId: "DDZYKyNPzVF", // Replace with your Instagram post ID
        description: "Major corporate news and quarterly results",
        views: "4.1K",
        duration: "0:52",
        featured: false,
        tags: ["business", "corporate", "news"]
    },
    {
        title: "🤖 Tech Update: AI Revolution in India",
        category: "Technology",
        source: "instagram",
        videoId: "DDWq-dFvqWY", // Replace with your Instagram post ID
        description: "How AI is transforming Indian businesses",
        views: "6.5K",
        duration: "0:48",
        featured: true,
        tags: ["technology", "ai", "innovation"]
    },
    {
        title: "💰 Economy Watch: RBI Policy Updates",
        category: "Economy",
        source: "instagram",
        videoId: "DDUGD2pPVQS", // Replace with your Instagram post ID
        description: "Latest RBI announcements and rate decisions",
        views: "2.9K",
        duration: "0:55",
        featured: false,
        tags: ["economy", "rbi", "policy"]
    }
];

async function addVideos() {
    try {
        console.log('🔌 Connecting to MongoDB...');
        await mongoose.connect(process.env.MONGO_URI);
        console.log('✅ MongoDB Connected\n');
        
        console.log('🎬 Adding sample videos...\n');
        
        let addedCount = 0;
        let skippedCount = 0;
        
        for (const videoData of sampleVideos) {
            // Check if video already exists
            const exists = await Video.findOne({ videoId: videoData.videoId });
            if (exists) {
                console.log(`⏭️ Already exists: ${videoData.title}`);
                skippedCount++;
                continue;
            }
            
            const video = new Video({
                ...videoData,
                date: new Date().toLocaleDateString('en-IN', { 
                    year: 'numeric', 
                    month: 'short', 
                    day: 'numeric' 
                })
            });
            
            await video.save();
            console.log(`✅ Added: ${videoData.title}`);
            addedCount++;
        }
        
        console.log(`\n📊 Summary:`);
        console.log(`   Added: ${addedCount}`);
        console.log(`   Skipped: ${skippedCount}`);
        
        const total = await Video.countDocuments();
        console.log(`   Total videos in database: ${total}`);
        
        console.log('\n✨ Done! Refresh your website to see the Video News section.\n');
        
    } catch (error) {
        console.error('❌ Error:', error.message);
    } finally {
        await mongoose.disconnect();
        process.exit(0);
    }
}

addVideos();
