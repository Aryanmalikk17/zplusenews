/**
 * Create First Admin User
 * Run this script to create your first admin account
 * Usage: node create-first-admin.js
 */

const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
require('dotenv').config();

// Connect to MongoDB
const connectDB = async () => {
    try {
        await mongoose.connect(process.env.MONGO_URI, {
            useNewUrlParser: true,
            useUnifiedTopology: true
        });
        console.log('✅ MongoDB Connected');
    } catch (err) {
        console.error('❌ MongoDB Connection Error:', err.message);
        process.exit(1);
    }
};

// User Schema (inline for simplicity)
const UserSchema = new mongoose.Schema({
    name: { type: String, required: true },
    email: { type: String, required: true, unique: true },
    password: { type: String, required: true },
    role: { type: String, default: 'EDITOR', enum: ['ADMIN', 'EDITOR'] },
    status: { type: String, default: 'PENDING', enum: ['PENDING', 'APPROVED', 'REJECTED'] },
    avatar: { type: String, default: 'https://ui-avatars.com/api/?name=User&background=random' },
    joinedAt: { type: Date, default: Date.now },
    approvedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    approvedAt: { type: Date },
    rejectionReason: { type: String }
});

const User = mongoose.model('User', UserSchema);

// Readline for user input
const readline = require('readline');
const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
});

const question = (query) => new Promise((resolve) => rl.question(query, resolve));

// Create Admin
const createAdmin = async () => {
    try {
        await connectDB();
        
        // Check if any approved admin exists
        const approvedAdminCount = await User.countDocuments({ role: 'ADMIN', status: 'APPROVED' });
        
        if (approvedAdminCount > 0) {
            console.log('\n⚠️  An approved admin already exists!');
            console.log('Use the admin panel to approve additional users.\n');
            process.exit(0);
        }
        
        console.log('\n🔐 Create First Admin Account');
        console.log('================================\n');
        
        const name = await question('Enter admin name: ');
        const email = await question('Enter admin email: ');
        const password = await question('Enter password (min 8 chars): ');
        
        // Validate
        if (!name || !email || !password) {
            console.log('❌ All fields are required!');
            process.exit(1);
        }
        
        if (password.length < 8) {
            console.log('❌ Password must be at least 8 characters!');
            process.exit(1);
        }
        
        // Hash password
        const hashedPassword = await bcrypt.hash(password, 10);
        
        // Create user
        const admin = new User({
            name: name.trim(),
            email: email.toLowerCase().trim(),
            password: hashedPassword,
            role: 'ADMIN',
            status: 'APPROVED' // First admin auto-approved
        });
        
        await admin.save();
        
        console.log('\n✅ Admin account created successfully!');
        console.log('📧 Email:', admin.email);
        console.log('👤 Name:', admin.name);
        console.log('🔓 Status: APPROVED');
        console.log(`\nYou can now login at: ${process.env.SITE_URL || 'http://localhost:3000'}/admin-login.html\n`);
        
        rl.close();
        process.exit(0);
        
    } catch (error) {
        console.error('❌ Error:', error.message);
        rl.close();
        process.exit(1);
    }
};

createAdmin();
