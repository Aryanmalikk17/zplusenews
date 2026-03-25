const mongoose = require('mongoose');

const AdvertisementSchema = new mongoose.Schema({
    title: { type: String, required: true },
    imageUrl: { type: String, required: true },
    targetUrl: { type: String, required: true },
    altText: { type: String, default: 'Advertisement' },
    // Position types:
    // - horizontal-banner: Full-width banner (970x90 or 728x90) - like "Home Speaker" in Newsim
    // - vertical-sidebar: Tall sidebar ad (160x600 or 300x600) - like "Summer Big Sale" in Newsim
    // - sidebar-rectangle: Square sidebar ad (300x250)
    // - inline: In-between content sections
    // Legacy positions kept for backward compatibility
    position: { 
        type: String, 
        required: true, 
        enum: [
            'horizontal-banner', 
            'vertical-sidebar', 
            'sidebar-rectangle', 
            'inline',
            'header',      // legacy
            'sidebar',     // legacy
            'footer'       // legacy
        ] 
    },
    // Recommended size for the position
    size: {
        width: { type: Number },
        height: { type: Number }
    },
    // Ad label text (e.g., "WEEKEND DISCOUNT", "SPECIAL OFFER")
    label: { type: String, default: '' },
    // Call-to-action button text
    ctaText: { type: String, default: 'Shop Now' },
    status: { type: String, default: 'active', enum: ['active', 'paused', 'expired'] },
    startDate: { type: Date, default: Date.now },
    endDate: Date,
    priority: { type: Number, default: 0 }, // Higher priority ads show first
    metrics: {
        impressions: { type: Number, default: 0 },
        clicks: { type: Number, default: 0 }
    },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    updatedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    createdAt: { type: Date, default: Date.now },
    updatedAt: { type: Date, default: Date.now }
});

// Virtual for CTR
AdvertisementSchema.virtual('ctr').get(function () {
    if (this.metrics.impressions === 0) return 0;
    return ((this.metrics.clicks / this.metrics.impressions) * 100).toFixed(2);
});

module.exports = mongoose.model('Advertisement', AdvertisementSchema);
