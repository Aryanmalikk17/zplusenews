const mongoose = require('mongoose');

const videoSchema = new mongoose.Schema({
    title: { type: String, required: true },
    category: { 
        type: String, 
        required: true,
        enum: [
            // Special Categories
            'positive', 'fake-news',
            // Level-based Categories
            'international', 'national', 'state',
            // Interest-based Categories
            'economics', 'polity', 'technology', 'environment', 'sports',
            // Legacy categories (for backward compatibility)
            'business', 'innovation', 'tech', 'ai', 'gadgets', 'software',
            'startups', 'markets', 'crypto', 'general'
        ]
    },
    subcategory: { type: String }, // For additional granularity
    source: { type: String, enum: ['youtube', 'instagram'], required: true },
    videoId: { type: String, required: true },
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
    createdAt: { type: Date, default: Date.now },
    updatedAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Video', videoSchema);
