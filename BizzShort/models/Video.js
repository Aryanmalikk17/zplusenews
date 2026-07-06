const mongoose = require('mongoose');

const videoSchema = new mongoose.Schema({
    title: { type: String, required: true },
    slug: { type: String, unique: true },
    category: { 
        type: String, 
        required: true,
        enum: [
            // Special Categories (positive removed from active UI; kept here for legacy docs)
            'fake-news', 'positive',
            // Level-based Categories
            'international', 'national', 'state',
            // Interest-based Categories
            'economics', 'polity', 'technology', 'environment', 'sports',
            'health', 'defence', 'culture', 'spirituality', 'agriculture', 'geography', 'religion', 'ai',
            'astrology', 'science', 'tourism', 'others', // New category enums
            // Legacy categories (for backward compatibility)
            'business', 'innovation', 'tech', 'gadgets', 'software',
            'startups', 'markets', 'crypto', 'general'
        ]
    },
    subcategory: { type: String }, // For additional granularity
    source: { type: String, enum: ['youtube', 'instagram'], required: true },
    videoId: { type: String, required: true, unique: true },
    thumbnail: { type: String },
    description: { type: String },
    transcript: { type: String, default: '' },
    articleContent: { type: String, default: '' },
    youtubeChannelTitle: { type: String, default: '' },
    views: { type: String, default: '0' },
    date: { type: String }, // formatted date string
    duration: { type: String },
    featured: { type: Boolean, default: false },
    tags: [String],
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    updatedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    isTicker: { type: Boolean, default: false },
    tickerCategory: { type: String, enum: ['commodity', 'financial', 'civic', 'general', 'none'], default: 'none' },
    calendarDate: { type: Date },
    createdAt: { type: Date, default: Date.now },
    updatedAt: { type: Date, default: Date.now }
});

// Indexes for query performance
videoSchema.index({ category: 1, createdAt: -1 });
videoSchema.index({ videoId: 1 }, { unique: true });
videoSchema.index({ slug: 1 }, { unique: true });

// Auto-generate slug from title if not provided
videoSchema.pre('save', async function () {
    if (!this.slug) {
        // 1. Basic cleaning and lowercase
        let baseSlug = this.title
            .toLowerCase()
            .replace(/[^a-z0-9\s]/g, '') // Remove special chars but keep spaces
            .trim()
            .replace(/\s+/g, '-');       // Replace spaces with hyphens

        // 2. SEO Enhancement: Remove common stop words to keep slugs clean
        const stopWords = ['a', 'an', 'and', 'are', 'as', 'at', 'be', 'but', 'by', 'for', 'if', 'in', 'into', 'is', 'it', 'no', 'not', 'of', 'on', 'or', 'such', 'that', 'the', 'their', 'then', 'there', 'these', 'they', 'this', 'to', 'was', 'will', 'with'];
        const words = baseSlug.split('-');
        const filteredWords = words.filter(word => !stopWords.includes(word));

        baseSlug = (filteredWords.length > 0 ? filteredWords : words).join('-');

        // 3. Smart Truncation: Limit to ~70 chars, cutting at whole words
        if (baseSlug.length > 70) {
            const lastHyphen = baseSlug.lastIndexOf('-', 70);
            baseSlug = lastHyphen > 30 ? baseSlug.substring(0, lastHyphen) : baseSlug.substring(0, 70);
        }

        // 4. Ensure Uniqueness (append -1, -2 etc. if collision occurs)
        let slug = baseSlug;
        let counter = 1;

        while (await this.constructor.findOne({ slug, _id: { $ne: this._id } })) {
            slug = `${baseSlug}-${counter++}`;
        }

        this.slug = slug;
    }
});

module.exports = mongoose.model('Video', videoSchema);
