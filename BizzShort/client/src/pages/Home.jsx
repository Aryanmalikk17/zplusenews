import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { articlesAPI, eventsAPI } from '../services/api';
import HeroSection from '../components/ui/HeroSection';
import TrendingTicker from '../components/ui/TrendingTicker';
import ArticleCard from '../components/ui/ArticleCard';
import VideoNewsSection from '../components/ui/VideoNewsSection';
import '../styles/components.css';

export default function Home() {
    const [articles, setArticles] = useState([]);
    const [events, setEvents] = useState([]);
    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState('all');

    useEffect(() => {
        const fetchData = async () => {
            try {
                const [articlesRes, eventsRes] = await Promise.all([
                    articlesAPI.getAll({ limit: 20 }).catch(() => ({ data: [] })),
                    eventsAPI.getAll().catch(() => ({ data: [] })),
                ]);
                // Handle both {data: [...]} and direct array responses
                const articlesData = articlesRes?.data || articlesRes || [];
                const eventsData = eventsRes?.data || eventsRes || [];
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

    // Organize articles by section
    const featuredArticle = articles[0];
    const sideArticles = articles.slice(1, 3);

    // Filter tech articles (or first 6 if no category)
    const techArticles = articles.filter(a =>
        a.category?.toLowerCase().includes('tech') ||
        a.category?.toLowerCase().includes('ai') ||
        a.category?.toLowerCase().includes('software')
    ).slice(0, 6);

    // Use first 6 if no tech articles found
    const displayTechArticles = techArticles.length > 0 ? techArticles : articles.slice(0, 6);

    // Filter business articles
    const businessArticles = articles.filter(a =>
        a.category?.toLowerCase().includes('business') ||
        a.category?.toLowerCase().includes('market') ||
        a.category?.toLowerCase().includes('startup') ||
        a.category?.toLowerCase().includes('economy')
    ).slice(0, 4);

    const displayBusinessArticles = businessArticles.length > 0 ? businessArticles : articles.slice(3, 7);

    // Innovation articles
    const innovationArticles = articles.filter(a =>
        a.category?.toLowerCase().includes('innovation') ||
        a.category?.toLowerCase().includes('space') ||
        a.category?.toLowerCase().includes('science') ||
        a.category?.toLowerCase().includes('green')
    ).slice(0, 3);

    const displayInnovationArticles = innovationArticles.length > 0 ? innovationArticles : articles.slice(6, 9);

    // Get popular articles (sort by views if available)
    const popularArticles = [...articles]
        .sort((a, b) => (b.views || 0) - (a.views || 0))
        .slice(0, 5);

    const categoryTabs = [
        { id: 'all', label: 'All' },
        { id: 'ai', label: 'AI' },
        { id: 'gadgets', label: 'Gadgets' },
        { id: 'software', label: 'Software' },
    ];

    // Filter articles by active tab
    const getFilteredArticles = () => {
        if (activeTab === 'all') return displayTechArticles;
        return articles.filter(a =>
            a.category?.toLowerCase().includes(activeTab)
        ).slice(0, 6);
    };

    const formatViews = (views) => {
        if (!views) return '0';
        const num = parseInt(views);
        if (num >= 1000) return `${(num / 1000).toFixed(1)}K`;
        return num.toString();
    };

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
                        ) : getFilteredArticles().length > 0 ? (
                            getFilteredArticles().map((article, index) => (
                                <ArticleCard
                                    key={article._id || article.id || index}
                                    article={article}
                                    index={index}
                                />
                            ))
                        ) : (
                            <div className="empty-state">
                                <p>No articles available. Add articles via the admin panel.</p>
                            </div>
                        )}
                    </motion.div>
                </div>
            </section>

            {/* Business Section with Sidebar */}
            <section className="section bg-light" id="business" style={{ background: 'var(--bg-secondary)' }}>
                <div className="container">
                    <div className="section-header">
                        <h2>Business & Markets</h2>
                        <a href="/business" className="view-all">
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
                                ) : displayBusinessArticles.length > 0 ? (
                                    displayBusinessArticles.map((article, index) => (
                                        <ArticleCard
                                            key={article._id || article.id || index}
                                            article={article}
                                            index={index}
                                        />
                                    ))
                                ) : (
                                    <div className="empty-state">
                                        <p>No business articles available.</p>
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Sidebar */}
                        <aside className="sidebar-area">
                            {/* Popular This Week */}
                            <div className="sidebar-widget">
                                <h3 className="widget-title">Popular This Week</h3>
                                {popularArticles.length > 0 ? (
                                    popularArticles.map((article, index) => (
                                        <div key={article._id || index} className="popular-article">
                                            <span className="popular-article-number">{index + 1}</span>
                                            <div className="popular-article-content">
                                                <h4>{article.title}</h4>
                                                <span>{formatViews(article.views)} views</span>
                                            </div>
                                        </div>
                                    ))
                                ) : (
                                    <p className="empty-hint">Popular articles will appear here</p>
                                )}
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

            {/* Video News Section */}
            <VideoNewsSection />

            {/* Innovation Section */}
            {displayInnovationArticles.length > 0 && (
                <section className="section" id="innovation">
                    <div className="container">
                        <div className="section-header">
                            <h2>Innovation & Future Tech</h2>
                        </div>

                        <div className="article-grid">
                            {displayInnovationArticles.map((article, i) => (
                                <ArticleCard
                                    key={article._id || article.id || i}
                                    article={article}
                                    index={i}
                                />
                            ))}
                        </div>
                    </div>
                </section>
            )}
        </div>
    );
}
