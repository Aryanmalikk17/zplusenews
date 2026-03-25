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
ArticleSchema.pre('save', function () {
    if (this.isModified('title') && !this.slug) {
        this.slug = this.title.toLowerCase()
            .replace(/[^a-z0-9]+/g, '-')
            .replace(/^-+|-+$/g, '') + '-' + Date.now();
    }
});

module.exports = mongoose.model('Article', ArticleSchema);
