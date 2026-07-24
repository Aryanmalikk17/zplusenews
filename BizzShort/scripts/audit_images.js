const mongoose = require('mongoose');
require('dotenv').config();
require('../models/Article');

const Article = mongoose.model('Article');

async function auditImages() {
    try {
        console.log('Connecting to MongoDB...');
        await mongoose.connect(process.env.MONGO_URI);
        console.log('Connected.');

        const articles = await Article.find({ status: 'PUBLISHED' }).select('title slug image category').lean();
        console.log(`Found ${articles.length} published articles.`);

        let noImageCount = 0;
        let localUploadCount = 0;
        let externalCount = 0;
        let cloudinaryCount = 0;

        const auditList = [];

        articles.forEach(article => {
            const img = article.image;
            if (!img) {
                noImageCount++;
                auditList.push({
                    title: article.title,
                    slug: article.slug,
                    status: 'FAIL',
                    reason: 'No image specified'
                });
            } else if (img.startsWith('/uploads/')) {
                localUploadCount++;
                auditList.push({
                    title: article.title,
                    slug: article.slug,
                    status: 'WARNING',
                    reason: `Local upload (${img}) - Needs dimension check`,
                    url: img
                });
            } else if (img.includes('cloudinary.com')) {
                cloudinaryCount++;
                auditList.push({
                    title: article.title,
                    slug: article.slug,
                    status: 'PASS',
                    reason: 'Cloudinary hosted (Dynamic resizing supported)',
                    url: img
                });
            } else {
                externalCount++;
                auditList.push({
                    title: article.title,
                    slug: article.slug,
                    status: 'INFO',
                    reason: 'External image - Needs validation',
                    url: img
                });
            }
        });

        console.log('\n--- Image Hosting Summary ---');
        console.log(`Cloudinary Hosted: ${cloudinaryCount}`);
        console.log(`Local Uploads:     ${localUploadCount}`);
        console.log(`External Images:   ${externalCount}`);
        console.log(`Missing Images:    ${noImageCount}`);

        const warnings = auditList.filter(a => a.status === 'WARNING');
        const fails = auditList.filter(a => a.status === 'FAIL');

        console.log(`\nFails: ${fails.length}`);
        console.log(`Warnings: ${warnings.length}`);

        if (fails.length > 0) {
            console.log('\nSample Fails (No image):');
            console.log(fails.slice(0, 5).map(f => ` - ${f.title} (${f.slug})`).join('\n'));
        }

        if (warnings.length > 0) {
            console.log('\nSample Warnings (Local Uploads):');
            console.log(warnings.slice(0, 5).map(w => ` - ${w.title} (${w.url})`).join('\n'));
        }

        mongoose.connection.close();
    } catch (err) {
        console.error('Audit Error:', err);
    }
}

auditImages();
