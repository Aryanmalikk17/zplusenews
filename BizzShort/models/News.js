import mongoose from 'mongoose';

const NewsSchema = new mongoose.Schema({
    title: { type: String, required: true },
    content: { type: String, required: true },
    category: { type: String, default: 'General' },
    isBreaking: { type: Boolean, default: false },
    source: String,
    publishedAt: { type: Date, default: Date.now }
});

const News = mongoose.model('News', NewsSchema);
export default News;
