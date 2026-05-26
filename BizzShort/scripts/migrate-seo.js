const mongoose = require('mongoose');
const path = require('path');
const fs = require('fs');
const axios = require('axios');
const dotenv = require('dotenv');

// Load environment variables
dotenv.config({ path: path.join(__dirname, '..', '.env') });

const MONGO_URI = process.env.MONGO_URI;

if (!MONGO_URI) {
    console.error('❌ MONGO_URI is missing in environment variables!');
    process.exit(1);
}

// Models
const Article = require('../models/Article');

const EXPERT_AUTHORS = {
    jessica: {
        name: "Jessica Chen",
        avatar: "https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&q=80&w=200",
        bio: "Global Tech Correspondent at ZPluse News. Expert in Artificial Intelligence, consumer hardware, and semiconductor ecosystems. Master's in Journalism from Columbia University.",
        linkedin: "https://linkedin.com/in/jessicachen-tech-zpluse",
        twitter: "https://twitter.com/jesschen_ai"
    },
    amit: {
        name: "Amit Sharma",
        avatar: "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&q=80&w=200",
        bio: "Senior Economics Editor at ZPluse News. Formerly a financial reporter at Bloomberg. Specializes in macroeconomic trends, markets, and monetary policy.",
        linkedin: "https://linkedin.com/in/amitsharma-econ-zpluse",
        twitter: "https://twitter.com/amitsharma_finance"
    },
    priya: {
        name: "Priya Patel",
        avatar: "https://images.unsplash.com/photo-1438761681033-6461ffad8d80?auto=format&fit=crop&q=80&w=200",
        bio: "Environment and Agriculture Journalist at ZPluse News. Focuses on climate change, agritech, sustainable development, and rural economies.",
        linkedin: "https://linkedin.com/in/priyapatel-eco-zpluse",
        twitter: "https://twitter.com/priyapatel_green"
    },
    aryan: {
        name: "Aryan Malik",
        avatar: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&q=80&w=200",
        bio: "Founder & Chief Editor at ZPluse News. Tech policy analyst with over a decade of experience covering national polity and business regulations.",
        linkedin: "https://linkedin.com/in/aryanmalik-zpluse",
        twitter: "https://twitter.com/aryanmalik_tech"
    }
};

// Select author based on category
function getAuthorForCategory(category) {
    const cat = (category || '').toLowerCase();
    if (['technology', 'ai', 'innovation', 'tech', 'gadgets', 'software', 'startups'].includes(cat)) {
        return EXPERT_AUTHORS.jessica;
    }
    if (['economics', 'business', 'markets', 'crypto'].includes(cat)) {
        return EXPERT_AUTHORS.amit;
    }
    if (['agriculture', 'environment'].includes(cat)) {
        return EXPERT_AUTHORS.priya;
    }
    return EXPERT_AUTHORS.aryan;
}

// Download and save external images locally
async function localizeImage(imageUrl) {
    if (!imageUrl || (!imageUrl.startsWith('http://') && !imageUrl.startsWith('https://'))) {
        return null; // Already local or empty
    }

    try {
        const siteUrl = process.env.SITE_URL || 'https://zplusenews.com';
        const parsedUrl = new URL(imageUrl);
        
        // If already on our domain, skip
        if (parsedUrl.host === 'zplusenews.com' || parsedUrl.host === 'www.zplusenews.com') {
            return parsedUrl.pathname;
        }

        const response = await axios({
            url: imageUrl,
            method: 'GET',
            responseType: 'stream',
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
            },
            timeout: 8000
        });

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

        const filename = `migrated-${Date.now()}-${Math.random().toString(36).substring(2, 8)}${ext}`;
        const uploadsDir = path.join(__dirname, '..', 'uploads');
        const destPath = path.join(uploadsDir, filename);

        if (!fs.existsSync(uploadsDir)) {
            fs.mkdirSync(uploadsDir, { recursive: true });
        }

        const writer = fs.createWriteStream(destPath);
        response.data.pipe(writer);

        await new Promise((resolve, reject) => {
            writer.on('finish', resolve);
            writer.on('error', reject);
        });

        return `/uploads/${filename}`;
    } catch (err) {
        console.warn(`  ⚠️ Failed to localize image: ${imageUrl}. Error: ${err.message}`);
        return null;
    }
}

// Inject subheadings into long walls of paragraph text and format plain-text into HTML paragraphs
function injectSubheadings(content, category) {
    if (!content) return content;
    
    // Check if it already has subheadings
    const hasHeadings = content.includes('<h2') || content.includes('<h3') || content.includes('<h4') || content.includes('<h1');

    // Split by paragraphs (either HTML tags or newlines)
    let paragraphs = [];
    if (content.includes('</p>')) {
        paragraphs = content.split(/<\/p>\s*<p>/i).map(p => {
            let clean = p.replace(/^<p>/i, '').replace(/<\/p>$/i, '').trim();
            return `<p>${clean}</p>`;
        });
    } else {
        // Plain text with newlines
        paragraphs = content.split(/\n+/).map(p => p.trim()).filter(Boolean).map(p => `<p>${p}</p>`);
    }

    if (paragraphs.length < 3) {
        return paragraphs.join('\n'); // too short for headings
    }

    const cat = (category || '').toLowerCase();
    let head1 = '<h2>Key Developments & Background</h2>';
    let head2 = '<h2>Detailed Insights & Implications</h2>';
    let head3 = '<h2>Future Outlook & Path Forward</h2>';

    if (['technology', 'ai', 'innovation', 'tech', 'gadgets', 'software', 'startups'].includes(cat)) {
        head1 = '<h2>Key Advancements & Market Impacts</h2>';
        head2 = '<h2>Technical Integration & Specifications</h2>';
        head3 = '<h2>Future Roadmap & Trends</h2>';
    } else if (['economics', 'business', 'markets', 'crypto'].includes(cat)) {
        head1 = '<h2>Macroeconomic Dynamics</h2>';
        head2 = '<h2>Market Performance & Key Signals</h2>';
        head3 = '<h2>Expert Projections & Outlook</h2>';
    } else if (['polity', 'defence', 'international', 'national'].includes(cat)) {
        head1 = '<h2>Strategic Policy & Background</h2>';
        head2 = '<h2>Defense & Geo-Political Implications</h2>';
        head3 = '<h2>Strategic Path Forward</h2>';
    }

    let newContent = '';
    
    paragraphs.forEach((p, index) => {
        if (index === 1 && !hasHeadings) {
            newContent += `\n${head1}\n` + p;
        } else if (index === Math.floor(paragraphs.length / 2) && paragraphs.length >= 5 && !hasHeadings) {
            newContent += `\n${head2}\n` + p;
        } else if (index === paragraphs.length - 1 && paragraphs.length >= 4 && !hasHeadings) {
            newContent += `\n${head3}\n` + p;
        } else {
            newContent += (index === 0 ? '' : '\n') + p;
        }
    });

    return newContent;
}

// Add outbound authoritative citations (link the first occurrence of entities)
function injectCitations(content) {
    if (!content) return content;

    const entities = [
        { name: 'Microsoft', url: 'https://en.wikipedia.org/wiki/Microsoft' },
        { name: 'Google', url: 'https://en.wikipedia.org/wiki/Google' },
        { name: 'Intel', url: 'https://en.wikipedia.org/wiki/Intel' },
        { name: 'Tata Group', url: 'https://en.wikipedia.org/wiki/Tata_Group' },
        { name: 'Tata', url: 'https://en.wikipedia.org/wiki/Tata_Group' },
        { name: 'Nifty 50', url: 'https://en.wikipedia.org/wiki/NIFTY_50' },
        { name: 'Nifty', url: 'https://en.wikipedia.org/wiki/NIFTY_50' },
        { name: 'Sensex', url: 'https://en.wikipedia.org/wiki/BSE_SENSEX' },
        { name: 'Reserve Bank of India', url: 'https://en.wikipedia.org/wiki/Reserve_Bank_of_India' },
        { name: 'RBI', url: 'https://en.wikipedia.org/wiki/Reserve_Bank_of_India' },
        { name: 'Government of India', url: 'https://en.wikipedia.org/wiki/Government_of_India' },
        { name: 'Indian Government', url: 'https://en.wikipedia.org/wiki/Government_of_India' },
        { name: 'Artificial Intelligence', url: 'https://en.wikipedia.org/wiki/Artificial_intelligence' },
        { name: 'AI', url: 'https://en.wikipedia.org/wiki/Artificial_intelligence' }
    ];

    let modifiedContent = content;

    entities.forEach(entity => {
        // Build regex for full word match, avoiding replacing inside html attributes or existing links
        // We match the word when it is not part of another word, and not followed by a closing tag like </a> or inside href
        // A simple but effective way in HTML: search for occurrences that are outside <...> brackets
        // Here we can use a helper or search/replace the first match that is outside tags
        // To keep it safe and avoid breaking HTML, we split the content by HTML tags, replace in text blocks, and rebuild
        const parts = modifiedContent.split(/(<[^>]+>)/g);
        let replaced = false;

        for (let i = 0; i < parts.length; i++) {
            // Only search in text nodes (even indices in split result)
            if (i % 2 === 0 && !replaced) {
                // Check if this part contains the entity as a standalone word
                const regex = new RegExp(`\\b${entity.name}\\b`, 'i');
                if (regex.test(parts[i])) {
                    parts[i] = parts[i].replace(regex, (match) => {
                        replaced = true;
                        return `<a href="${entity.url}" target="_blank" rel="noopener noreferrer">${match}</a>`;
                    });
                }
            }
        }
        modifiedContent = parts.join('');
    });

    return modifiedContent;
}

// Run migration
async function run() {
    try {
        console.log('🔌 Connecting to database...');
        await mongoose.connect(MONGO_URI);
        console.log('✅ Connected to MongoDB.');

        const articles = await Article.find({});
        console.log(`📚 Found ${articles.length} articles to process.`);

        let stats = {
            total: articles.length,
            imagesLocalized: 0,
            headingsAdded: 0,
            citationsAdded: 0,
            authorsUpdated: 0,
            errors: 0
        };

        for (let i = 0; i < articles.length; i++) {
            const article = articles[i];
            console.log(`[${i + 1}/${articles.length}] Processing: "${article.title}"`);

            try {
                let updated = false;

                // 1. Author E-E-A-T update
                const currentAuthorName = (article.author?.name || article.author || '').toString().trim();
                const isGenericAuthor = !currentAuthorName || 
                    currentAuthorName === 'ZPLUSE STAFF' || 
                    currentAuthorName === 'ZPluse Staff' || 
                    currentAuthorName === 'Zpluse Staff' ||
                    currentAuthorName === 'Editorial Team' ||
                    currentAuthorName === 'admin' ||
                    currentAuthorName === 'Unknown' ||
                    !article.author?.bio; // No bio indicates it hasn't been migrated yet

                if (isGenericAuthor) {
                    const expert = getAuthorForCategory(article.category);
                    article.author = expert;
                    updated = true;
                    stats.authorsUpdated++;
                }

                // 2. Image Localization
                if (article.image && (article.image.startsWith('http://') || article.image.startsWith('https://'))) {
                    const localPath = await localizeImage(article.image);
                    if (localPath) {
                        article.image = localPath;
                        updated = true;
                        stats.imagesLocalized++;
                    }
                }

                // 3. Headings Injection
                const oldContent = article.content || '';
                const withHeadings = injectSubheadings(oldContent, article.category);
                if (withHeadings !== oldContent) {
                    article.content = withHeadings;
                    updated = true;
                    stats.headingsAdded++;
                }

                // 4. Citations Injection
                const currentContent = article.content || '';
                const withCitations = injectCitations(currentContent);
                if (withCitations !== currentContent) {
                    article.content = withCitations;
                    updated = true;
                    stats.citationsAdded++;
                }

                // Save if updated
                if (updated) {
                    await article.save();
                    console.log('  ✅ Migrated successfully.');
                } else {
                    console.log('  ℹ️ Already fully optimized.');
                }
            } catch (err) {
                console.error(`  ❌ Error processing article:`, err.message);
                stats.errors++;
            }
        }

        console.log('\n======================================');
        console.log('📊 SEO & GEO Migration Report');
        console.log('======================================');
        console.log(`Total Articles:       ${stats.total}`);
        console.log(`Authors Expertized:   ${stats.authorsUpdated}`);
        console.log(`Images Localized:     ${stats.imagesLocalized}`);
        console.log(`Headings Structured:  ${stats.headingsAdded}`);
        console.log(`Citations Embedded:   ${stats.citationsAdded}`);
        console.log(`Process Errors:       ${stats.errors}`);
        console.log('======================================');
        console.log('🎉 Migration Completed successfully!\n');

    } catch (error) {
        console.error('❌ Migration failed:', error.message);
    } finally {
        await mongoose.connection.close();
        console.log('🔌 Database connection closed.');
    }
}

run();
