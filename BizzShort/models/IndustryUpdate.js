import mongoose from 'mongoose';

const IndustryUpdateSchema = new mongoose.Schema({
    sector: { type: String, required: true }, // e.g. "Semiconductor"
    title: { type: String, required: true },
    description: String,
    growthMetric: String, // e.g. "+15%"
    trend: { type: String, enum: ['UP', 'DOWN', 'STABLE'], default: 'UP' },
    updatedAt: { type: Date, default: Date.now }
});

const IndustryUpdate = mongoose.model('IndustryUpdate', IndustryUpdateSchema);
export default IndustryUpdate;
