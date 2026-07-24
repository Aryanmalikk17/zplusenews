const mongoose = require('mongoose');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

const Article = require('../models/Article');
const Video = require('../models/Video');

async function exportData() {
  try {
    console.log('Connecting to database...');
    await mongoose.connect(process.env.MONGO_URI);
    console.log('Connected!');

    // Fetch published articles
    const articles = await Article.find({ status: 'PUBLISHED' }, 'slug category updatedAt');
    console.log(`Found ${articles.length} published articles.`);

    // Fetch videos
    const videos = await Video.find({}, 'slug videoId updatedAt');
    console.log(`Found ${videos.length} videos.`);

    const output = {
      articles: articles.map(a => ({
        slug: a.slug,
        category: a.category,
        updatedAt: a.updatedAt
      })),
      videos: videos.map(v => ({
        slug: v.slug,
        videoId: v.videoId,
        updatedAt: v.updatedAt
      }))
    };

    const outputPath = path.join(__dirname, 'db_entities.json');
    fs.writeFileSync(outputPath, JSON.stringify(output, null, 2));
    console.log(`Exported data successfully to ${outputPath}`);
    process.exit(0);
  } catch (error) {
    console.error('Failed to export:', error);
    process.exit(1);
  }
}

exportData();
