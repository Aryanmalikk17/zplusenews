import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { articlesAPI, eventsAPI, adsAPI } from '../services/api';
import HeroSection from '../components/ui/HeroSection';
import TrendingTicker from '../components/ui/TrendingTicker';
import ArticleCard from '../components/ui/ArticleCard';
import '../styles/components.css';

export default function Home() {
    const [articles, setArticles] = useState([]);
    const [events, setEvents] = useState([]);
    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState('all');

    useEffect(() => {
        const fetchData = async () => {
            try {
                const [articlesData, eventsData] = await Promise.all([
                    articlesAPI.getAll().catch(() => []),
                    eventsAPI.getAll().catch(() => []),
                ]);
                setArticles(Array.isArray(articlesData) ? articlesData : []);
                setEvents(Array.isArray(eventsData) ? eventsData : []);
            } catch (error) {
                console.error('Error fetching data:', error);
            } finally {
                setLoading(false);
            }
        };

        fetchData();
    }, []);

    // Get featured and side articles
    const featuredArticle = articles[0];
    const sideArticles = articles.slice(1, 3);
    const techArticles = articles.slice(0, 6);
    const businessArticles = articles.slice(3, 9);

    // Popular articles for sidebar
    const popularArticles = [
        { title: "Tesla's New Factory in India: What It Means for EV Market", views: '15.2K' },
        { title: "5G Revolution: How It's Changing Rural Connectivity", views: '12.8K' },
        { title: "Top 10 AI Tools Every Professional Should Know", views: '11.5K' },
        { title: "Semiconductor Industry: India's $10B Investment Push", views: '9.3K' },
        { title: "Remote Work Trends: Hybrid Model Becomes Standard", views: '8.7K' },
    ];

    const categoryTabs = [
        { id: 'all', label: 'All' },
        { id: 'ai', label: 'AI' },
        { id: 'gadgets', label: 'Gadgets' },
        { id: 'software', label: 'Software' },
    ];

    return (
        <div className="home-page">
            {/* Trending Ticker */}
            <TrendingTicker />

            {/* Hero Section */}
            <HeroSection
                featured={featuredArticle}
                sideArticles={sideArticles}
            />

            {/* Technology Section */}
            <section className="section" id="tech">
                <div className="container">
                    <div className="section-header">
                        <h2>Technology</h2>
                        <div className="category-tabs">
                            {categoryTabs.map((tab) => (
                                <button
                                    key={tab.id}
                                    className={`category-tab ${activeTab === tab.id ? 'active' : ''}`}
                                    onClick={() => setActiveTab(tab.id)}
                                >
                                    {tab.label}
                                </button>
                            ))}
                        </div>
                    </div>

                    <motion.div
                        className="article-grid"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ duration: 0.5 }}
                    >
                        {loading ? (
                            // Skeleton loading
                            [...Array(3)].map((_, i) => (
                                <div key={i} className="article-card">
                                    <div className="skeleton" style={{ height: 200 }}></div>
                                    <div style={{ padding: 20 }}>
                                        <div className="skeleton" style={{ height: 24, marginBottom: 10 }}></div>
                                        <div className="skeleton" style={{ height: 48, marginBottom: 10 }}></div>
                                        <div className="skeleton" style={{ height: 16, width: '60%' }}></div>
                                    </div>
                                </div>
                            ))
                        ) : techArticles.length > 0 ? (
                            techArticles.map((article, index) => (
                                <ArticleCard
                                    key={article._id || index}
                                    article={article}
                                    index={index}
                                />
                            ))
                        ) : (
                            // Default demo articles
                            [...Array(3)].map((_, i) => (
                                <ArticleCard
                                    key={i}
                                    article={{
                                        _id: i,
                                        title: ['OpenAI Announces GPT-5 with Revolutionary Capabilities',
                                            "Apple's Vision Pro 2 Redefines Mixed Reality",
                                            'Cloud Computing Trends: What to Expect in 2026'][i],
                                        category: ['AI', 'Gadgets', 'Cloud'][i],
                                        author: ['Tech Desk', 'Gadget Review', 'Cloud Expert'][i],
                                        image: [
                                            'https://images.unsplash.com/photo-1485827404703-89b55fcc595e?w=400',
                                            'https://images.unsplash.com/photo-1512941937669-90a1b58e7e9c?w=400',
                                            'https://images.unsplash.com/photo-1558494949-ef010cbdcc31?w=400'
                                        ][i],
                                        excerpt: 'Latest developments in technology shaping the future...',
                                        slug: `demo-article-${i}`,
                                    }}
                                    index={i}
                                />
                            ))
                        )}
                    </motion.div>
                </div>
            </section>

            {/* Business Section with Sidebar */}
            <section className="section bg-light" id="business" style={{ background: 'var(--off-white)' }}>
                <div className="container">
                    <div className="section-header">
                        <h2>Business & Markets</h2>
                        <a href="#" className="view-all">
                            View All →
                        </a>
                    </div>

                    <div className="content-with-sidebar">
                        <div className="main-content-area">
                            <div className="article-grid" style={{ gridTemplateColumns: 'repeat(2, 1fr)' }}>
                                {loading ? (
                                    [...Array(4)].map((_, i) => (
                                        <div key={i} className="article-card">
                                            <div className="skeleton" style={{ height: 180 }}></div>
                                            <div style={{ padding: 20 }}>
                                                <div className="skeleton" style={{ height: 20, marginBottom: 8 }}></div>
                                                <div className="skeleton" style={{ height: 40 }}></div>
                                            </div>
                                        </div>
                                    ))
                                ) : businessArticles.length > 0 ? (
                                    businessArticles.slice(0, 4).map((article, index) => (
                                        <ArticleCard
                                            key={article._id || index}
                                            article={article}
                                            index={index}
                                        />
                                    ))
                                ) : (
                                    [...Array(4)].map((_, i) => (
                                        <ArticleCard
                                            key={i}
                                            article={{
                                                _id: i + 10,
                                                title: [
                                                    'Sensex Crosses 85,000 Mark as FIIs Return',
                                                    'Bengaluru Startup Raises $100M Series C',
                                                    'RBI Explores Digital Rupee 2.0',
                                                    "India's GDP Growth Projected at 7.5%"
                                                ][i],
                                                category: ['Markets', 'Startups', 'Crypto', 'Economy'][i],
                                                author: ['Market Watch', 'Startup Desk', 'Finance Desk', 'Economy Bureau'][i],
                                                image: [
                                                    'https://images.unsplash.com/photo-1460925895917-afdab827c52f?w=400',
                                                    'https://images.unsplash.com/photo-1553729459-efe14ef6055d?w=400',
                                                    'https://images.unsplash.com/photo-1611974789855-9c2a0a7236a3?w=400',
                                                    'https://images.unsplash.com/photo-1507679799987-c73779587ccf?w=400'
                                                ][i],
                                                slug: `business-article-${i}`,
                                            }}
                                            index={i}
                                        />
                                    ))
                                )}
                            </div>
                        </div>

                        {/* Sidebar */}
                        <aside className="sidebar-area">
                            {/* Popular This Week */}
                            <div className="sidebar-widget">
                                <h3 className="widget-title">Popular This Week</h3>
                                {popularArticles.map((article, index) => (
                                    <div key={index} className="popular-article">
                                        <span className="popular-article-number">{index + 1}</span>
                                        <div className="popular-article-content">
                                            <h4>{article.title}</h4>
                                            <span>{article.views} views</span>
                                        </div>
                                    </div>
                                ))}
                            </div>

                            {/* Newsletter */}
                            <div className="sidebar-widget newsletter-widget">
                                <h3 className="widget-title">Newsletter</h3>
                                <p>Get the latest tech & business news delivered to your inbox.</p>
                                <form className="newsletter-form" onSubmit={(e) => e.preventDefault()}>
                                    <input type="email" placeholder="Your email address" required />
                                    <button type="submit">Subscribe Now</button>
                                </form>
                            </div>
                        </aside>
                    </div>
                </div>
            </section>

            {/* Innovation Section */}
            <section className="section" id="innovation">
                <div className="container">
                    <div className="section-header">
                        <h2>Innovation & Future Tech</h2>
                    </div>

                    <div className="article-grid">
                        {[
                            { title: 'Quantum Computing: The Next Frontier', category: 'Quantum', image: 'https://images.unsplash.com/photo-1635070041078-e363dbe005cb?w=400' },
                            { title: "ISRO's Gaganyaan Mission: India's Giant Leap", category: 'Space', image: 'https://images.unsplash.com/photo-1614728263952-84ea256f9679?w=400' },
                            { title: "Green Hydrogen: India's Clean Energy Revolution", category: 'Green Tech', image: 'https://images.unsplash.com/photo-1593941707882-a5bba14938c7?w=400' },
                        ].map((article, i) => (
                            <ArticleCard
                                key={i}
                                article={{
                                    ...article,
                                    _id: i + 20,
                                    author: 'Science Desk',
                                    slug: `innovation-${i}`,
                                }}
                                index={i}
                            />
                        ))}
                    </div>
                </div>
            </section>
        </div>
    );
}
