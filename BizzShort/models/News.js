const mongoose = require('mongoose');

const NewsSchema = new mongoose.Schema({
    title: { type: String, required: true },
    content: { type: String, required: true },
    category: { type: String, default: 'General' },
    isBreaking: { type: Boolean, default: false },
    source: String,
    publishedAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('News', NewsSchema);
