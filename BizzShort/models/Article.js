const mongoose = require('mongoose');

const ArticleSchema = new mongoose.Schema({
    title: { type: String, required: true },
    slug: { type: String, unique: true },
    category: { 
        type: String, 
        required: true,
        enum: [
            // Special Categories (positive removed)
            'fake-news',
            // Level-based Categories
            'international', 'national', 'state',
            // Interest-based Categories
            'economics', 'polity', 'technology', 'environment', 'sports',
            // Legacy categories (for backward compatibility with existing DB records)
            'positive', 'business', 'innovation', 'tech', 'ai', 'gadgets', 'software', 
            'startups', 'markets', 'crypto', 'general'
        ]
    },
    subcategory: { type: String }, // For additional granularity
    excerpt: String,
    content: { type: String, required: true },
    image: String,
    author: {
        name: String,
        avatar: String,
        bio: String
    },
    tags: [String],
    status: { type: String, default: 'PUBLISHED', enum: ['PUBLISHED', 'DRAFT', 'ARCHIVED'] },
    views: { type: Number, default: 0 },
    likes: { type: Number, default: 0 },
    readTime: { type: Number, default: 3 },
    publishedAt: { type: Date, default: Date.now }
}, {
    timestamps: true
});

// Indexes for query performance
ArticleSchema.index({ category: 1, publishedAt: -1 });
ArticleSchema.index({ slug: 1 }, { unique: true });

// Auto-generate slug from title if not provided
ArticleSchema.pre('save', async function () {
    if (this.isModified('title') && !this.slug) {
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

        // If filtering leaves nothing (e.g. title was "To Be Or Not To Be"), use original words
        baseSlug = (filteredWords.length > 0 ? filteredWords : words).join('-');

        // 3. Smart Truncation: Limit to ~70 chars, cutting at whole words
        if (baseSlug.length > 70) {
            const lastHyphen = baseSlug.lastIndexOf('-', 70);
            baseSlug = lastHyphen > 30 ? baseSlug.substring(0, lastHyphen) : baseSlug.substring(0, 70);
        }

        // 4. Ensure Uniqueness (append -1, -2 etc. if collision occurs)
        let slug = baseSlug;
        let counter = 1;

        // Use this.constructor to query the Article model directly
        while (await this.constructor.findOne({ slug, _id: { $ne: this._id } })) {
            slug = `${baseSlug}-${counter++}`;
        }

        this.slug = slug;
    }
});

module.exports = mongoose.model('Article', ArticleSchema);