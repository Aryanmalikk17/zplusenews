#!/usr/bin/env node

/**
 * BizzShort Installation Checker
 * Verifies all dependencies and configurations
 */

const fs = require('fs');
const path = require('path');

console.log('\n╔════════════════════════════════════════════════╗');
console.log('║   🔍 BizzShort Installation Check            ║');
console.log('╚════════════════════════════════════════════════╝\n');

let hasErrors = false;
let warnings = [];

// Check Node.js version
const nodeVersion = process.version;
const majorVersion = parseInt(nodeVersion.split('.')[0].substring(1));
console.log(`✅ Node.js version: ${nodeVersion}`);

if (majorVersion < 14) {
    console.log('❌ Node.js version 14 or higher is required');
    hasErrors = true;
}

// Check package.json
const packagePath = path.join(__dirname, 'package.json');
if (fs.existsSync(packagePath)) {
    console.log('✅ package.json found');
    const pkg = require(packagePath);
    
    // Check dependencies
    const requiredDeps = ['express', 'mongoose', 'cors', 'dotenv', 'bcryptjs', 'jsonwebtoken'];
    console.log('\n📦 Checking required dependencies:');
    
    requiredDeps.forEach(dep => {
        if (pkg.dependencies && pkg.dependencies[dep]) {
            console.log(`   ✅ ${dep}`);
        } else {
            console.log(`   ❌ ${dep} - MISSING`);
            hasErrors = true;
        }
    });
} else {
    console.log('❌ package.json not found');
    hasErrors = true;
}

// Check node_modules
const nodeModulesPath = path.join(__dirname, 'node_modules');
if (fs.existsSync(nodeModulesPath)) {
    console.log('\n✅ node_modules directory exists');
} else {
    console.log('\n⚠️  node_modules directory not found - Run: npm install');
    warnings.push('Run npm install to install dependencies');
}

// Check .env file
const envPath = path.join(__dirname, '.env');
if (fs.existsSync(envPath)) {
    console.log('✅ .env file exists');
    
    // Read and validate .env
    const envContent = fs.readFileSync(envPath, 'utf8');
    const requiredVars = ['MONGO_URI', 'JWT_SECRET', 'PORT'];
    
    console.log('\n🔧 Checking environment variables:');
    requiredVars.forEach(varName => {
        if (envContent.includes(`${varName}=`)) {
            const match = envContent.match(new RegExp(`${varName}=(.+)`));
            if (match && match[1].trim() && !match[1].includes('your_') && !match[1].includes('username:password')) {
                console.log(`   ✅ ${varName}`);
            } else {
                console.log(`   ⚠️  ${varName} - needs configuration`);
                warnings.push(`Configure ${varName} in .env file`);
            }
        } else {
            console.log(`   ❌ ${varName} - MISSING`);
            hasErrors = true;
        }
    });
} else {
    console.log('\n⚠️  .env file not found');
    console.log('   Run: node setup.js to create it');
    warnings.push('Create .env file by running: node setup.js');
}

// Check required directories
const requiredDirs = ['config', 'models', 'assets', 'uploads'];
console.log('\n📁 Checking required directories:');

requiredDirs.forEach(dir => {
    const dirPath = path.join(__dirname, dir);
    if (fs.existsSync(dirPath)) {
        console.log(`   ✅ ${dir}/`);
    } else {
        console.log(`   ⚠️  ${dir}/ - creating...`);
        fs.mkdirSync(dirPath, { recursive: true });
        console.log(`   ✅ Created ${dir}/`);
    }
});

// Check server.js
const serverPath = path.join(__dirname, 'server.js');
if (fs.existsSync(serverPath)) {
    console.log('\n✅ server.js found');
} else {
    console.log('\n❌ server.js not found');
    hasErrors = true;
}

// Final Summary
console.log('\n╔════════════════════════════════════════════════╗');
console.log('║   📊 Installation Summary                     ║');
console.log('╚════════════════════════════════════════════════╝\n');

if (hasErrors) {
    console.log('❌ Installation has ERRORS that must be fixed\n');
    process.exit(1);
} else if (warnings.length > 0) {
    console.log('⚠️  Installation has warnings:\n');
    warnings.forEach((warning, i) => {
        console.log(`   ${i + 1}. ${warning}`);
    });
    console.log('\n💡 Address these warnings before running the server\n');
} else {
    console.log('✅ All checks passed! Installation is complete.\n');
    console.log('🚀 Start the server with: npm start\n');
}
