const mongoose = require('mongoose');
const path = require('path');
const dotenv = require('dotenv');

// Load environment variables
dotenv.config({ path: path.join(__dirname, '..', '.env') });
const MONGO_URI = process.env.MONGO_URI;

if (!MONGO_URI) {
    console.error('❌ MONGO_URI is missing in environment variables!');
    process.exit(1);
}

const Video = require('../models/Video');

async function run() {
    try {
        console.log('🔌 Connecting to database...');
        await mongoose.connect(MONGO_URI);
        console.log('✅ Connected to MongoDB.');

        const videos = await Video.find({ $or: [{ slug: { $exists: false } }, { slug: '' }] });
        console.log(`📚 Found ${videos.length} videos requiring slugs.`);

        let count = 0;
        for (let i = 0; i < videos.length; i++) {
            const video = videos[i];
            console.log(`[${i + 1}/${videos.length}] Processing video: "${video.title}"`);
            
            // Re-saving the video triggers the pre-save hook which generates a slug
            try {
                // Manually trigger pre-save slug generation to be safe
                if (!video.slug) {
                    // Let's print out what the hook will do
                    await video.save();
                    count++;
                    console.log(`  ✅ Slug generated: "${video.slug}"`);
                }
            } catch (err) {
                console.error(`  ❌ Failed to save video:`, err.message);
            }
        }

        console.log(`🎉 Migration complete! Successfully updated ${count} videos with SEO slugs.`);
    } catch (err) {
        console.error('❌ Migration failed:', err.message);
    } finally {
        await mongoose.connection.close();
        console.log('🔌 Database connection closed.');
    }
}

run();
