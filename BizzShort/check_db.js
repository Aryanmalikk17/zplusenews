const mongoose = require('mongoose');
require('dotenv').config();

async function checkArticles() {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log('Connected to DB');
    
    const Article = mongoose.model('Article', new mongoose.Schema({
      title: String,
      category: String,
      content: String,
      slug: String
    }));

    const categories = await Article.distinct('category');
    console.log('Unique categories in DB:', categories);

    const checkCategory = 'international';
    const count = await Article.countDocuments({ category: checkCategory });
    console.log(`Count for "${checkCategory}":`, count);

    const caseInsensitiveCount = await Article.countDocuments({ 
      category: { $regex: new RegExp('^' + checkCategory + '$', 'i') } 
    });
    console.log(`Case-insensitive count for "${checkCategory}":`, caseInsensitiveCount);

    const emptyContentCount = await Article.countDocuments({ 
      content: { $in: [null, '', '<p></p>', '<p><br></p>'] } 
    });
    console.log('Articles with empty/placeholder content:', emptyContentCount);

    const sample = await Article.findOne({ category: { $regex: /international/i } });
    if (sample) {
      console.log('Sample Article:', {
        title: sample.title,
        category: sample.category,
        hasContent: !!sample.content,
        contentPreview: sample.content ? sample.content.substring(0, 50) : 'EMPTY'
      });
    }

    process.exit(0);
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
}

checkArticles();
