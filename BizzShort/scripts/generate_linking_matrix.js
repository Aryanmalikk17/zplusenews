const mongoose = require('mongoose');
require('dotenv').config();
require('../models/Article');

const Article = mongoose.model('Article');

async function generateLinkingAndCalendar() {
    try {
        console.log('Connecting to MongoDB...');
        await mongoose.connect(process.env.MONGO_URI);
        console.log('Connected.');

        const beats = ['international', 'national', 'polity'];

        console.log('\n--- Generating Internal Linking Matrix for Top 3 Beats ---');

        for (const beat of beats) {
            console.log(`\n================== BEAT: ${beat.toUpperCase()} ==================`);
            const articles = await Article.find({ status: 'PUBLISHED', category: beat })
                .sort({ publishedAt: -1 })
                .limit(20)
                .select('title slug')
                .lean();

            console.log(`Fetched top ${articles.length} articles for beat: ${beat}`);

            // Generate linking loop:
            // Article N links to Article N+1, N+2, N+3 (wrapping around)
            articles.forEach((article, index) => {
                const suggestions = [];
                for (let i = 1; i <= 3; i++) {
                    const targetIndex = (index + i) % articles.length;
                    const target = articles[targetIndex];
                    if (target && target._id.toString() !== article._id.toString()) {
                        suggestions.push({
                            title: target.title,
                            path: `/article/${target.slug}`
                        });
                    }
                }

                console.log(`\nSource Article: [${article.title}] (/article/${article.slug})`);
                console.log('Suggest adding links to:');
                suggestions.forEach((s, idx) => {
                    console.log(`  ${idx + 1}. [${s.title}] (${s.path})`);
                });
            });
        }

        console.log('\n======================================================');
        console.log('\n--- Content Calendar Template for Priority Beats ---');
        console.log(`
| Day | Beat | Target Topic Angle | Recommended Headline Pattern |
|---|---|---|---|
| Monday | National | Policy/Reform focus | "What India's New [Policy Name] Means for [Target Group]" |
| Tuesday | International | Geopolitics / Border Security | "[Country] and India Strengthen Strategic Ties Amid [Event]" |
| Wednesday | Polity | Legislative bills / elections | "Key Bill Passed: How [Bill Name] Impacts Indian Judiciary/Governance" |
| Thursday | National | Infrastructure / Economy | "Road to 2030: India's Megaprojects Reshaping Regional Trade" |
| Friday | International | Global markets / Trade deals | "Global Trade Wars: How Rising Tariffs Affect Indian Exports" |
| Saturday | Polity | Political analysis / Opinion | "Electoral Shifts: The Changing Landscape of [State Name] Politics" |
| Sunday | National / Special | Fact-checks / Positive News | "Sunday Spotlight: Inspiring Stories of Tech Innovation in Rural India" |
`);

        mongoose.connection.close();
    } catch (err) {
        console.error('Matrix generation error:', err);
    }
}

generateLinkingAndCalendar();
