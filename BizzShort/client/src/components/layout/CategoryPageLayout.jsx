import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import { articlesAPI, videosAPI, newsAPI } from '../../services/api';
import ArticleCard from '../ui/ArticleCard';
import '../../styles/category-page.css';

// Map ZPluse categories to CurrentsAPI categories
const CATEGORY_TO_CURRENTS = {
    'technology': 'technology',
    'tech': 'technology',
    'economics': 'business',
    'economy': 'business',
    'business': 'business',
    'polity': 'politics',
    'politics': 'politics',
    'environment': 'environment',
    'sports': 'sports',
    'international': 'world',
    'world': 'world',
    'national': 'regional',
    'india': 'regional',
    'positive': 'general',
    'state': 'regional',
    'fake-news': null, // No external API - backend only
};

export default function CategoryPageLayout({
    category,
    title,
    subtitle,
    description,
    accentColor = '#AA2123',
    heroImage,
    iconClass = 'fa-solid fa-newspaper'
}) {
    const [articles, setArticles] = useState([]);
    const [videos, setVideos] = useState([]);
    const [loading, setLoading] = useState(true);
    const [filter, setFilter] = useState('all');
    const [viewMode, setViewMode] = useState('grid');
    const [newsSource, setNewsSource] = useState('api'); // 'api' or 'backend'

    useEffect(() => {
        const fetchContent = async () => {
            setLoading(true);
            try {
                const currentsCategory = CATEGORY_TO_CURRENTS[category?.toLowerCase()];

                // Try CurrentsAPI first (unless it's fake-news which has no API)
                if (currentsCategory !== null) {
                    try {
                        const newsRes = await newsAPI.getByCategory(category);

                        if (newsRes?.data && newsRes.data.length > 0) {
                            setArticles(newsRes.data);
                            setNewsSource('api');

                            // Also try to get videos from backend
                            try {
                                const videosRes = await videosAPI.getAll();
                                const videosData = videosRes?.data || videosRes || [];
                                setVideos(Array.isArray(videosData) ? videosData.filter(v =>
                                    v.category?.toLowerCase().includes(category.toLowerCase())
                                ) : []);
                            } catch {
                                setVideos([]);
                            }

                            setLoading(false);
                            return;
                        }
                    } catch (apiError) {
                        console.log('CurrentsAPI unavailable, falling back to backend:', apiError.message);
                    }
                }

                // Fallback to backend
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
                setNewsSource('backend');
            } catch (error) {
                console.error('Error fetching content:', error);
                setArticles([]);
                setVideos([]);
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

    // Format time ago
    const getTimeAgo = (date) => {
        const now = new Date();
        const diff = now - new Date(date);
        const hours = Math.floor(diff / (1000 * 60 * 60));
        if (hours < 1) return 'Just now';
        if (hours < 24) return `${hours}h ago`;
        return `${Math.floor(hours / 24)}d ago`;
    };

    const lastUpdated = articles[0]?.createdAt ? getTimeAgo(articles[0].createdAt) : 'Recently';

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
            {/* Breadcrumb Navigation */}
            <nav className="category-breadcrumb" aria-label="Breadcrumb">
                <div className="container">
                    <Link to="/">Home</Link>
                    <span className="breadcrumb-separator">/</span>
                    <span className="breadcrumb-current">{title}</span>
                </div>
            </nav>

            {/* Professional Hero Section */}
            <section
                className="category-hero category-hero-pro"
                style={{
                    '--accent-color': accentColor,
                    backgroundImage: heroImage ? `url(${heroImage})` : 'none'
                }}
            >
                <div className="hero-overlay"></div>
                <div className="container">
                    <motion.div
                        className="category-hero-content"
                        initial={{ opacity: 0, y: 30 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.6 }}
                    >
                        {/* Category Badge */}
                        <div className="category-badge-pro" style={{ background: accentColor }}>
                            <i className={iconClass}></i>
                            <span>{title.toUpperCase()}</span>
                        </div>

                        {/* Main Headline */}
                        <h1 className="category-headline">
                            {subtitle || title}
                        </h1>

                        <p className="category-tagline">{description}</p>

                        {/* News Highlights Bar */}
                        <div className="category-highlights">
                            <div className="highlight-item">
                                <i className="fa-regular fa-newspaper"></i>
                                <span><strong>{articles.length}</strong> Articles</span>
                            </div>
                            <div className="highlight-divider"></div>
                            <div className="highlight-item">
                                <i className="fa-regular fa-circle-play"></i>
                                <span><strong>{videos.length}</strong> Videos</span>
                            </div>
                            <div className="highlight-divider"></div>
                            <div className="highlight-item">
                                <i className="fa-regular fa-clock"></i>
                                <span>Updated {lastUpdated}</span>
                            </div>
                            {newsSource === 'api' && (
                                <>
                                    <div className="highlight-divider"></div>
                                    <div className="highlight-item highlight-live">
                                        <i className="fa-solid fa-signal"></i>
                                        <span>Live News</span>
                                    </div>
                                </>
                            )}
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
                                    {featuredArticle.isExternal ? (
                                        <a
                                            href={featuredArticle.source?.url || '#'}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="featured-link"
                                        >
                                            <FeaturedContent article={featuredArticle} accentColor={accentColor} />
                                        </a>
                                    ) : (
                                        <Link
                                            to={`/article/${featuredArticle.slug || featuredArticle._id}`}
                                            className="featured-link"
                                        >
                                            <FeaturedContent article={featuredArticle} accentColor={accentColor} />
                                        </Link>
                                    )}
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
                                            <i className="fa-solid fa-layer-group"></i> All Content
                                        </button>
                                        <button
                                            className={`filter-tab ${filter === 'articles' ? 'active' : ''}`}
                                            onClick={() => setFilter('articles')}
                                        >
                                            <i className="fa-regular fa-newspaper"></i> Articles
                                        </button>
                                        <button
                                            className={`filter-tab ${filter === 'videos' ? 'active' : ''}`}
                                            onClick={() => setFilter('videos')}
                                        >
                                            <i className="fa-regular fa-circle-play"></i> Videos
                                        </button>
                                    </div>

                                    <div className="view-toggle">
                                        <button
                                            className={`view-btn ${viewMode === 'grid' ? 'active' : ''}`}
                                            onClick={() => setViewMode('grid')}
                                            title="Grid View"
                                        >
                                            <i className="fa-solid fa-grip"></i>
                                        </button>
                                        <button
                                            className={`view-btn ${viewMode === 'list' ? 'active' : ''}`}
                                            onClick={() => setViewMode('list')}
                                            title="List View"
                                        >
                                            <i className="fa-solid fa-list"></i>
                                        </button>
                                    </div>
                                </div>

                                {/* Latest Articles Grid */}
                                <h3 className="section-title-small">
                                    <i className="fa-solid fa-bolt" style={{ color: accentColor }}></i> Latest Stories
                                </h3>
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
                                    <div className="sidebar-widget sidebar-widget-pro">
                                        <h3 className="widget-title">
                                            <i className="fa-solid fa-fire-flame-curved" style={{ color: '#ff6b35' }}></i>
                                            Trending in {title}
                                        </h3>
                                        <div className="trending-list">
                                            {trendingArticles.map((article, index) => (
                                                article.isExternal ? (
                                                    <a
                                                        key={article._id || index}
                                                        href={article.source?.url || '#'}
                                                        target="_blank"
                                                        rel="noopener noreferrer"
                                                        className="trending-item trending-item-pro"
                                                    >
                                                        <TrendingItemContent article={article} index={index} accentColor={accentColor} />
                                                    </a>
                                                ) : (
                                                    <Link
                                                        key={article._id || index}
                                                        to={`/article/${article.slug || article._id}`}
                                                        className="trending-item trending-item-pro"
                                                    >
                                                        <TrendingItemContent article={article} index={index} accentColor={accentColor} />
                                                    </Link>
                                                )
                                            ))}
                                        </div>
                                    </div>
                                )}

                                {/* Newsletter */}
                                <div className="sidebar-widget newsletter-widget-pro" style={{ '--accent-color': accentColor }}>
                                    <div className="newsletter-icon">
                                        <i className="fa-regular fa-envelope"></i>
                                    </div>
                                    <h3 className="widget-title">Stay Informed</h3>
                                    <p>Get {title.toLowerCase()} delivered straight to your inbox</p>
                                    <form className="newsletter-form-pro" onSubmit={(e) => e.preventDefault()}>
                                        <input type="email" placeholder="Enter your email" required />
                                        <button type="submit" style={{ background: accentColor }}>
                                            <i className="fa-solid fa-paper-plane"></i> Subscribe
                                        </button>
                                    </form>
                                </div>

                                {/* Popular Topics */}
                                <div className="sidebar-widget sidebar-widget-pro">
                                    <h3 className="widget-title">
                                        <i className="fa-solid fa-hashtag" style={{ color: accentColor }}></i> Popular Topics
                                    </h3>
                                    <div className="topic-tags topic-tags-pro">
                                        <span className="topic-tag" style={{ '--tag-color': accentColor }}>Breaking News</span>
                                        <span className="topic-tag" style={{ '--tag-color': accentColor }}>Analysis</span>
                                        <span className="topic-tag" style={{ '--tag-color': accentColor }}>Opinion</span>
                                        <span className="topic-tag" style={{ '--tag-color': accentColor }}>Exclusive</span>
                                        <span className="topic-tag" style={{ '--tag-color': accentColor }}>Featured</span>
                                    </div>
                                </div>
                            </aside>
                        </section>
                    </>
                ) : (
                    /* Professional Empty State */
                    <div className="empty-state empty-state-pro">
                        <div className="empty-state-content">
                            <div className="empty-icon-pro" style={{ color: accentColor }}>
                                <i className={iconClass}></i>
                            </div>
                            <h3>Coming Soon</h3>
                            <p className="empty-description">
                                We're curating the best stories in <strong>{title}</strong> for you.
                            </p>
                            <p className="empty-hint">Our editorial team is working on bringing you quality content.</p>

                            <div className="empty-cta">
                                <form className="empty-notify-form" onSubmit={(e) => e.preventDefault()}>
                                    <input type="email" placeholder="Enter your email" />
                                    <button type="submit" style={{ background: accentColor }}>
                                        <i className="fa-regular fa-bell"></i> Notify Me
                                    </button>
                                </form>
                            </div>

                            <div className="empty-explore">
                                <p>Meanwhile, explore other categories:</p>
                                <div className="explore-links">
                                    <Link to="/national-news">National News</Link>
                                    <Link to="/technology">Technology</Link>
                                    <Link to="/sports">Sports</Link>
                                </div>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}

// Featured Content Component
function FeaturedContent({ article, accentColor }) {
    return (
        <>
            <div className="featured-image-container">
                <img
                    src={article.image || 'https://images.unsplash.com/photo-1504711434969-e33886168f5c?w=1200'}
                    alt={article.title}
                    onError={(e) => {
                        e.target.src = 'https://images.unsplash.com/photo-1504711434969-e33886168f5c?w=1200';
                    }}
                />
                <div className="featured-overlay"></div>
            </div>
            <div className="featured-content-overlay">
                <span className="featured-badge" style={{ background: accentColor }}>
                    <i className="fa-solid fa-fire"></i> Featured Story
                    {article.isExternal && (
                        <span className="external-badge"> • External</span>
                    )}
                </span>
                <h2 className="featured-headline">{article.title}</h2>
                <p className="featured-excerpt">
                    {article.excerpt || article.content?.substring(0, 200) + '...'}
                </p>
                <div className="featured-meta">
                    <span>
                        <i className="fa-regular fa-user"></i>
                        {typeof article.author === 'object' ? article.author?.name : article.author || 'Editorial Team'}
                    </span>
                    <span>•</span>
                    <span>
                        <i className="fa-regular fa-calendar"></i>
                        {new Date(article.createdAt || article.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                    </span>
                    <span>•</span>
                    <span>
                        <i className="fa-regular fa-clock"></i>
                        {article.readTime || '5 min read'}
                    </span>
                    {article.source?.name && (
                        <>
                            <span>•</span>
                            <span className="source-badge">
                                <i className="fa-solid fa-external-link"></i>
                                {article.source.name}
                            </span>
                        </>
                    )}
                </div>
            </div>
        </>
    );
}

// Trending Item Content Component
function TrendingItemContent({ article, index, accentColor }) {
    return (
        <>
            <span className="trending-number" style={{ background: accentColor }}>{index + 1}</span>
            <div className="trending-content">
                <h4>{article.title}</h4>
                <span className="trending-date">
                    <i className="fa-regular fa-clock"></i>
                    {new Date(article.createdAt || article.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                    {article.source?.name && (
                        <span className="trending-source"> • {article.source.name}</span>
                    )}
                </span>
            </div>
        </>
    );
}
