#!/usr/bin/env node

/**
 * BizzShort Project Setup Script
 * Automates the setup process for the BizzShort project
 */

const fs = require('fs');
const path = require('path');
const readline = require('readline');

const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
});

function question(query) {
    return new Promise(resolve => rl.question(query, resolve));
}

async function setup() {
    console.log('\n╔════════════════════════════════════════════════╗');
    console.log('║   🚀 BizzShort Project Setup                  ║');
    console.log('╚════════════════════════════════════════════════╝\n');

    // Check if .env already exists
    const envPath = path.join(__dirname, '.env');
    const envExamplePath = path.join(__dirname, '.env.example');

    if (fs.existsSync(envPath)) {
        console.log('✅ .env file already exists');
        const overwrite = await question('Do you want to reconfigure it? (y/N): ');
        if (overwrite.toLowerCase() !== 'y') {
            console.log('\n✅ Setup complete! Your existing .env is unchanged.');
            rl.close();
            return;
        }
    }

    console.log('\n📋 Let\'s set up your environment variables:\n');

    // Collect environment variables
    const mongoUri = await question('Enter your MongoDB URI\n(e.g., mongodb+srv://user:pass@cluster.mongodb.net/bizzshort): ');
    const jwtSecret = await question('\nEnter JWT Secret (leave blank for auto-generate): ');
    const setupKey = await question('\nEnter Setup Key (leave blank for default): ');
    const corsOrigin = await question('\nEnter CORS Origins (comma-separated, leave blank for defaults): ');

    // Generate JWT secret if not provided
    const finalJwtSecret = jwtSecret || require('crypto').randomBytes(32).toString('hex');
    const finalSetupKey = setupKey || 'setup_' + Math.random().toString(36).substring(7);

    // Create .env content
    const envContent = `# BizzShort Environment Configuration
# Generated: ${new Date().toISOString()}

# Server Configuration
PORT=3000
NODE_ENV=production

# Database Configuration
MONGO_URI=${mongoUri}

# Security
JWT_SECRET=${finalJwtSecret}
JWT_EXPIRE=30d

# CORS Allowed Origins (comma-separated)
CORS_ORIGIN=${corsOrigin || 'https://bizzshort.com,https://www.bizzshort.com,http://localhost:3000,http://127.0.0.1:3000'}

# API Rate Limiting
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=100

# File Upload
MAX_FILE_SIZE=5242880

# Admin Setup Key (for emergency setup route)
SETUP_KEY=${finalSetupKey}
`;

    // Write .env file
    fs.writeFileSync(envPath, envContent);

    console.log('\n✅ .env file created successfully!');
    console.log('\n╔════════════════════════════════════════════════╗');
    console.log('║   📝 Setup Information                        ║');
    console.log('╚════════════════════════════════════════════════╝');
    console.log(`\n🔑 Admin Setup Key: ${finalSetupKey}`);
    console.log(`\n📌 Setup URL: http://localhost:3000/api/setup-production?key=${finalSetupKey}`);
    console.log('\n📖 Next Steps:');
    console.log('   1. Install dependencies: npm install');
    console.log('   2. Start the server: npm start');
    console.log('   3. Visit the setup URL above to initialize the database');
    console.log('   4. Login with username: admin, password: admin123');
    console.log('\n💡 Tip: Change the admin password after first login!\n');

    rl.close();
}

setup().catch(err => {
    console.error('❌ Setup failed:', err);
    rl.close();
    process.exit(1);
});
