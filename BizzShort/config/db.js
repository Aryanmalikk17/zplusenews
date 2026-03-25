const mongoose = require('mongoose');

let isConnected = false;
let connectionAttempts = 0;
const MAX_RETRY_ATTEMPTS = 5;
const RETRY_DELAY = 5000; // 5 seconds

const connectDB = async () => {
    try {
        const uri = process.env.MONGO_URI;
        console.log(`Connecting to MongoDB... (URI Length: ${uri ? uri.length : 'undefined'})`);

        if (!uri) {
            console.error('❌ MONGO_URI is missing in environment variables!');
            console.warn('⚠️ Server will continue without database - static pages will work');
            return false;
        }

        const conn = await mongoose.connect(uri, {
            serverSelectionTimeoutMS: 10000, // 10 second timeout
            socketTimeoutMS: 45000,
        });

        isConnected = true;
        connectionAttempts = 0;
        console.log(`✅ MongoDB Connected: ${conn.connection.host}`);
        return true;
    } catch (error) {
        connectionAttempts++;
        console.error(`❌ DB Connection Error (Attempt ${connectionAttempts}): ${error.message}`);
        
        // Don't crash the app - allow it to serve static content
        if (connectionAttempts < MAX_RETRY_ATTEMPTS) {
            console.log(`⏳ Retrying connection in ${RETRY_DELAY/1000} seconds...`);
            setTimeout(connectDB, RETRY_DELAY);
        } else {
            console.error(`❌ Max connection attempts (${MAX_RETRY_ATTEMPTS}) reached.`);
            console.warn('⚠️ Server will continue without database - static pages will still work');
            console.warn('⚠️ Please check your MongoDB Atlas IP whitelist or network connection');
        }
        return false;
    }
};

// Handle connection events
mongoose.connection.on('disconnected', () => {
    console.warn('⚠️ MongoDB disconnected. Attempting to reconnect...');
    isConnected = false;
    if (connectionAttempts < MAX_RETRY_ATTEMPTS) {
        setTimeout(connectDB, RETRY_DELAY);
    }
});

mongoose.connection.on('error', (err) => {
    console.error('❌ MongoDB connection error:', err.message);
    isConnected = false;
});

mongoose.connection.on('reconnected', () => {
    console.log('✅ MongoDB reconnected');
    isConnected = true;
    connectionAttempts = 0;
});

// Export connection status checker
const isDBConnected = () => isConnected;

module.exports = connectDB;
module.exports.isDBConnected = isDBConnected;
