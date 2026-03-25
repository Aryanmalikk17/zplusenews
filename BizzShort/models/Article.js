import mongoose from 'mongoose';
const { Schema } = mongoose;

const ArticleSchema = new Schema({
    title: { type: String, required: true },
    content: { type: String, required: true },
    category: { type: String, required: true, enum: ['National News', 'Business', 'Technology', 'Sports', 'Entertainment', 'Health', 'World News', 'Economics', 'Video News'] },
    image: { type: String },
    poster: { type: String },
    slug: { type: String, unique: true },
    author: { type: String, default: 'Editorial Team' },
    views: { type: Number, default: 0 },
    videoId: { type: String },
    videoUrl: { type: String },
    isPremium: { type: Boolean, default: false },
    status: { type: String, enum: ['draft', 'published', 'archived'], default: 'published' },
    publishedAt: { type: Date, default: Date.now },
    metaTitle: String,
    metaDescription: String,
    keywords: [String],
    source: {
        name: String,
        url: String
    }
}, { 
    timestamps: true 
});

// Create index for search
ArticleSchema.index({ title: 'text', content: 'text', category: 'text' });

// Auto-generate slug before saving if it doesn't exist
ArticleSchema.pre('save', function(next) {
    if (this.isModified('title') || !this.slug) {
        // Create base slug
        const baseSlug = this.title
            .toLowerCase()
            .replace(/[^\w ]+/g, '')
            .replace(/ +/g, '-');
        
        // Always add a unique identifier (timestamp) to prevent unique key constraint errors
        this.slug = `${baseSlug}-${Date.now()}`;
    }
    next();
});

const Article = mongoose.model('Article', ArticleSchema);
export default Article;
