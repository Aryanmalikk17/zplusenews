const mongoose = require('mongoose');

const ArticleSchema = new mongoose.Schema({
    title: { type: String, required: true },
    slug: { type: String, unique: true },
    category: { type: String, required: true },
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
    publishedAt: { type: Date, default: Date.now },
    updatedAt: { type: Date, default: Date.now }
});

// Auto-generate slug from title
// ArticleSchema.pre('save', function (next) {
//     if (this.isModified('title')) {
//         this.slug = this.title.toLowerCase().replace(/[^a-z0-9]+/g, '-') + '-' + Date.now();
//     }
//     this.updatedAt = Date.now();
//     next();
// });

module.exports = mongoose.model('Article', ArticleSchema);
