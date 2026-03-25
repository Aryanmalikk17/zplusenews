import mongoose from 'mongoose';

const ClientSchema = new mongoose.Schema({
    name: { type: String, required: true },
    logo: String,
    type: { type: String, default: 'PARTNER' }, // Partner, Sponsor, Client
    website: String,
    createdAt: { type: Date, default: Date.now }
});

const Client = mongoose.model('Client', ClientSchema);
export default Client;
