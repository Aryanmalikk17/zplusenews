/**
 * EASY VIDEO UPDATER - No API Key Required!
 * 
 * This script helps you update videos without YouTube API.
 * Just paste video URLs and answer simple questions.
 * 
 * USAGE:
 * 1. node utils/easy-video-updater.js
 * 2. Paste YouTube video URLs when prompted
 * 3. Script generates code for you to copy
 * 4. Paste into video-manager.js
 */

const readline = require('readline');
const https = require('https');
const fs = require('fs');

const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
});

// Category suggestions based on keywords
const KEYWORDS = {
    'Markets': ['stock', 'market', 'sensex', 'nifty', 'trading', 'ipo', 'shares'],
    'Startups': ['startup', 'entrepreneur', 'funding', 'unicorn', 'founder'],
    'Economy': ['gdp', 'economy', 'rbi', 'inflation', 'growth', 'recession'],
    'Energy': ['energy', 'solar', 'renewable', 'electric', 'power', 'oil'],
    'Cryptocurrency': ['crypto', 'bitcoin', 'blockchain', 'btc', 'ethereum'],
    'Manufacturing': ['manufacturing', 'factory', 'production', 'make in india'],
    'E-commerce': ['ecommerce', 'amazon', 'flipkart', 'online shopping'],
    'Healthcare': ['health', 'medical', 'pharma', 'hospital', 'medicine'],
    'Banking': ['bank', 'finance', 'loan', 'credit', 'upi', 'payment']
};

const videos = [];
let videoCount = 0;

console.log('\n╔═══════════════════════════════════════════════════╗');
console.log('║     🎬 EASY VIDEO UPDATER - No API Needed!      ║');
console.log('╚═══════════════════════════════════════════════════╝\n');

console.log('📝 Instructions:');
console.log('1. Go to https://www.youtube.com/@bizz_short/videos');
console.log('2. Open each video');
console.log('3. Copy the URL from browser');
console.log('4. Paste here when prompted\n');

function extractVideoId(url) {
    // Extract video ID from various YouTube URL formats
    const patterns = [
        /(?:youtube\.com\/watch\?v=|youtu\.be\/)([a-zA-Z0-9_-]{11})/,
        /youtube\.com\/embed\/([a-zA-Z0-9_-]{11})/,
        /youtube\.com\/v\/([a-zA-Z0-9_-]{11})/
    ];
    
    for (const pattern of patterns) {
        const match = url.match(pattern);
        if (match) return match[1];
    }
    return null;
}

function suggestCategory(title) {
    const lowerTitle = title.toLowerCase();
    
    for (const [category, keywords] of Object.entries(KEYWORDS)) {
        if (keywords.some(keyword => lowerTitle.includes(keyword))) {
            return category;
        }
    }
    
    return 'Markets'; // Default
}

function question(query) {
    return new Promise(resolve => rl.question(query, resolve));
}

async function addVideo() {
    videoCount++;
    
    console.log(`\n📹 Video #${videoCount}`);
    console.log('─'.repeat(50));
    
    const url = await question('Paste YouTube URL (or press Enter to finish): ');
    
    if (!url || url.trim() === '') {
        return false; // Done adding videos
    }
    
    const videoId = extractVideoId(url);
    
    if (!videoId) {
        console.log('❌ Invalid YouTube URL. Please try again.\n');
        videoCount--;
        return true;
    }
    
    console.log(`✅ Video ID extracted: ${videoId}`);
    
    const title = await question('Enter video title: ');
    const suggestedCategory = suggestCategory(title);
    console.log(`💡 Suggested category: ${suggestedCategory}`);
    
    const category = await question(`Category [${suggestedCategory}]: `) || suggestedCategory;
    
    const description = await question('Enter short description (100-150 chars): ');
    
    const views = await question('Approximate views (e.g., 1.2K, 5.6K): ') || '1.0K';
    
    const duration = await question('Video duration (e.g., 5:30, 10:45): ') || '5:00';
    
    const date = new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
    const featured = videoCount <= 3 ? 'true' : 'false';
    
    const video = {
        id: videoCount.toString(),
        title: title,
        category: category,
        source: 'youtube',
        videoId: videoId,
        thumbnail: `https://img.youtube.com/vi/${videoId}/maxresdefault.jpg`,
        description: description,
        views: views,
        date: date,
        duration: duration,
        featured: featured,
        tags: []
    };
    
    videos.push(video);
    
    console.log(`\n✅ Video #${videoCount} added successfully!`);
    
    return true; // Continue adding more videos
}

async function generateOutput() {
    if (videos.length === 0) {
        console.log('\n❌ No videos added. Exiting...\n');
        return;
    }
    
    console.log('\n' + '═'.repeat(60));
    console.log(`✅ ${videos.length} video(s) added successfully!`);
    console.log('═'.repeat(60));
    
    // Generate JavaScript code
    let code = 'const videoDatabase = [\n';
    
    videos.forEach((video, index) => {
        code += `    {\n`;
        code += `        id: '${video.id}',\n`;
        code += `        title: '${video.title}',\n`;
        code += `        category: '${video.category}',\n`;
        code += `        source: '${video.source}',\n`;
        code += `        videoId: '${video.videoId}',\n`;
        code += `        thumbnail: '${video.thumbnail}',\n`;
        code += `        description: '${video.description}',\n`;
        code += `        views: '${video.views}',\n`;
        code += `        date: '${video.date}',\n`;
        code += `        duration: '${video.duration}',\n`;
        code += `        featured: ${video.featured},\n`;
        code += `        tags: []\n`;
        code += `    }${index < videos.length - 1 ? ',' : ''}\n`;
    });
    
    code += '];\n';
    
    // Save to file
    const outputFile = 'video-database-generated.js';
    fs.writeFileSync(outputFile, code);
    
    console.log('\n📁 Output saved to:', outputFile);
    console.log('\n📋 Next Steps:');
    console.log('1. Open:', outputFile);
    console.log('2. Copy the entire content');
    console.log('3. Open: assets/js/video-manager.js');
    console.log('4. Replace videoDatabase array (line 17) with copied content');
    console.log('5. Save and test!\n');
    
    console.log('🧪 Testing:');
    console.log('   python -m http.server 8000');
    console.log('   Open: http://localhost:8000\n');
    
    // Display preview
    console.log('📋 Preview of first video:');
    console.log('─'.repeat(60));
    console.log(JSON.stringify(videos[0], null, 2));
    console.log('─'.repeat(60) + '\n');
}

async function main() {
    try {
        let continueAdding = true;
        
        while (continueAdding && videoCount < 10) {
            continueAdding = await addVideo();
        }
        
        if (videoCount >= 10) {
            console.log('\n✅ Maximum 10 videos reached!');
        }
        
        await generateOutput();
        
    } catch (error) {
        console.error('\n❌ Error:', error.message);
    } finally {
        rl.close();
    }
}

// Run the script
main();
