import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { articlesAPI, videosAPI } from '../../services/api';
import ArticleCard from '../ui/ArticleCard';
import '../../styles/category-page.css';

export default function CategoryPageLayout({ category, title, description, heroGradient, icon }) {
    const [articles, setArticles] = useState([]);
    const [videos, setVideos] = useState([]);
    const [loading, setLoading] = useState(true);
    const [filter, setFilter] = useState('all');
    const [viewMode, setViewMode] = useState('grid');

    useEffect(() => {
        const fetchContent = async () => {
            setLoading(true);
            try {
                const [articlesRes, videosRes] = await Promise.all([
                    articlesAPI.getAll({ category: category, limit: 30 }).catch(() => ({ data: [] })),
                    videosAPI.getAll().catch(() => ({ data: [] }))
                ]);

                const articlesData = articlesRes?.data || articlesRes || [];
                const videosData = videosRes?.data || videosRes || [];

                setArticles(Array.isArray(articlesData) ? articlesData : []);
                setVideos(Array.isArray(videosData) ? videosData.filter(v =>
                    v.category?.toLowerCase().includes(category.toLowerCase())
                ) : []);
            } catch (error) {
                console.error('Error fetching content:', error);
            } finally {
                setLoading(false);
            }
        };

        fetchContent();
    }, [category]);

    const filteredContent = () => {
        if (filter === 'articles') return articles;
        if (filter === 'videos') return videos;
        return articles;
    };

    const content = filteredContent();
    const featuredArticle = articles[0];
    const trendingArticles = articles.slice(1, 6);
    const latestArticles = articles.slice(6);

    if (loading) {
        return (
            <div className="category-page">
                <div className="loading-state">
                    <div className="spinner"></div>
                    <p>Loading {title}...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="category-page">
            {/* Enhanced Hero Section */}
            <section className="category-hero" style={{ background: heroGradient }}>
                <div className="container">
                    <motion.div
                        className="category-hero-content"
                        initial={{ opacity: 0, y: 30 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.6 }}
                    >
                        <div className="category-icon">{icon}</div>
                        <h1 className="category-title">{title}</h1>
                        <p className="category-description">{description}</p>
                        <div className="category-stats">
                            <div className="stat">
                                <span className="stat-number">{articles.length}</span>
                                <span className="stat-label">Articles</span>
                            </div>
                            <div className="stat">
                                <span className="stat-number">{videos.length}</span>
                                <span className="stat-label">Videos</span>
                            </div>
                            <div className="stat">
                                <span className="stat-number">{articles.length + videos.length}</span>
                                <span className="stat-label">Total</span>
                            </div>
                        </div>
                    </motion.div>
                </div>
            </section>

            {/* Main Content */}
            <div className="container">
                {content.length > 0 ? (
                    <>
                        {/* Featured Article Section */}
                        {featuredArticle && (
                            <section className="featured-section">
                                <motion.div
                                    className="featured-article-large"
                                    initial={{ opacity: 0, scale: 0.98 }}
                                    animate={{ opacity: 1, scale: 1 }}
                                    transition={{ duration: 0.5 }}
                                >
                                    <a href={`/article/${featuredArticle.slug || featuredArticle._id}`} className="featured-link">
                                        <div className="featured-image-container">
                                            <img
                                                src={featuredArticle.image || 'https://images.unsplash.com/photo-1504711434969-e33886168f5c?w=1200'}
                                                alt={featuredArticle.title}
                                            />
                                            <div className="featured-overlay"></div>
                                        </div>
                                        <div className="featured-content-overlay">
                                            <span className="featured-badge">Featured Story</span>
                                            <h2 className="featured-headline">{featuredArticle.title}</h2>
                                            <p className="featured-excerpt">
                                                {featuredArticle.excerpt || featuredArticle.content?.substring(0, 200) + '...'}
                                            </p>
                                            <div className="featured-meta">
                                                <span>{typeof featuredArticle.author === 'object' ? featuredArticle.author?.name : featuredArticle.author || 'Editorial Team'}</span>
                                                <span>•</span>
                                                <span>{new Date(featuredArticle.createdAt || featuredArticle.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</span>
                                                <span>•</span>
                                                <span>{featuredArticle.readTime || '5 min read'}</span>
                                            </div>
                                        </div>
                                    </a>
                                </motion.div>
                            </section>
                        )}

                        {/* Content with Sidebar Layout */}
                        <section className="content-sidebar-section">
                            <div className="main-content-area">
                                {/* Controls */}
                                <div className="category-controls">
                                    <div className="filter-tabs">
                                        <button
                                            className={`filter-tab ${filter === 'all' ? 'active' : ''}`}
                                            onClick={() => setFilter('all')}
                                        >
                                            All Content
                                        </button>
                                        <button
                                            className={`filter-tab ${filter === 'articles' ? 'active' : ''}`}
                                            onClick={() => setFilter('articles')}
                                        >
                                            Articles Only
                                        </button>
                                        <button
                                            className={`filter-tab ${filter === 'videos' ? 'active' : ''}`}
                                            onClick={() => setFilter('videos')}
                                        >
                                            Videos Only
                                        </button>
                                    </div>

                                    <div className="view-toggle">
                                        <button
                                            className={`view-btn ${viewMode === 'grid' ? 'active' : ''}`}
                                            onClick={() => setViewMode('grid')}
                                            title="Grid View"
                                        >
                                            ⊞
                                        </button>
                                        <button
                                            className={`view-btn ${viewMode === 'list' ? 'active' : ''}`}
                                            onClick={() => setViewMode('list')}
                                            title="List View"
                                        >
                                            ☰
                                        </button>
                                    </div>
                                </div>

                                {/* Latest Articles Grid */}
                                <h3 className="section-title-small">Latest Stories</h3>
                                <div className={viewMode === 'grid' ? 'content-grid' : 'content-list'}>
                                    {latestArticles.map((article, index) => (
                                        <ArticleCard
                                            key={article._id || index}
                                            article={article}
                                            variant={viewMode === 'list' ? 'compact' : 'default'}
                                            index={index}
                                        />
                                    ))}
                                </div>
                            </div>

                            {/* Sidebar */}
                            <aside className="category-sidebar">
                                {/* Trending Stories */}
                                {trendingArticles.length > 0 && (
                                    <div className="sidebar-widget">
                                        <h3 className="widget-title">🔥 Trending in {title}</h3>
                                        <div className="trending-list">
                                            {trendingArticles.map((article, index) => (
                                                <a
                                                    key={article._id || index}
                                                    href={`/article/${article.slug || article._id}`}
                                                    className="trending-item"
                                                >
                                                    <span className="trending-number">{index + 1}</span>
                                                    <div className="trending-content">
                                                        <h4>{article.title}</h4>
                                                        <span className="trending-date">
                                                            {new Date(article.createdAt || article.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                                                        </span>
                                                    </div>
                                                </a>
                                            ))}
                                        </div>
                                    </div>
                                )}

                                {/* Newsletter */}
                                <div className="sidebar-widget newsletter-widget-category">
                                    <h3 className="widget-title">📧 Stay Updated</h3>
                                    <p>Get {title.toLowerCase()} delivered to your inbox</p>
                                    <form className="newsletter-form-category" onSubmit={(e) => e.preventDefault()}>
                                        <input type="email" placeholder="Your email" required />
                                        <button type="submit">Subscribe</button>
                                    </form>
                                </div>

                                {/* Popular Topics */}
                                <div className="sidebar-widget">
                                    <h3 className="widget-title">📑 Popular Topics</h3>
                                    <div className="topic-tags">
                                        <span className="topic-tag">Breaking News</span>
                                        <span className="topic-tag">Analysis</span>
                                        <span className="topic-tag">Opinion</span>
                                        <span className="topic-tag">Exclusive</span>
                                        <span className="topic-tag">Trending</span>
                                    </div>
                                </div>
                            </aside>
                        </section>
                    </>
                ) : (
                    <div className="empty-state">
                        <div className="empty-icon">{icon}</div>
                        <h3>No content available yet</h3>
                        <p>We're working on bringing you the latest {title.toLowerCase()}.</p>
                        <p className="empty-hint">Check back soon for updates!</p>
                    </div>
                )}
            </div>
        </div>
    );
}
