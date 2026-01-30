import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { articlesAPI, eventsAPI, videosAPI, newsAPI } from '../services/api';
import TrendingTicker from '../components/ui/TrendingTicker';
import NewsCategorySection from '../components/ui/NewsCategorySection';
import ArticleCard from '../components/ui/ArticleCard';
import HinduCalendar from '../components/ui/HinduCalendar';
import '../styles/components.css';

export default function Home() {
    const [articles, setArticles] = useState([]);
    const [videos, setVideos] = useState([]);
    const [liveNews, setLiveNews] = useState([]);
    const [loading, setLoading] = useState(true);
    const [newsSource, setNewsSource] = useState('backend'); // 'api' or 'backend'

    useEffect(() => {
        const fetchData = async () => {
            try {
                // Try to fetch live news from CurrentsAPI first
                let liveNewsData = [];
                try {
                    const liveNewsRes = await newsAPI.getLatest({ language: 'en' });
                    if (liveNewsRes?.data && liveNewsRes.data.length > 0) {
                        liveNewsData = liveNewsRes.data;
                        setLiveNews(liveNewsData);
                        setNewsSource('api');
                    }
                } catch (apiError) {
                    console.log('CurrentsAPI unavailable, using backend data');
                }

                // Also fetch from backend for custom content
                const [articlesRes, videosRes] = await Promise.all([
                    articlesAPI.getAll({ limit: 30 }).catch(() => ({ data: [] })),
                    videosAPI.getAll().catch(() => ({ data: [] })),
                ]);

                const articlesData = articlesRes?.data || articlesRes || [];
                const videosData = videosRes?.data || videosRes || [];

                // Combine API news with backend articles (API first if available)
                const combinedArticles = liveNewsData.length > 0
                    ? [...liveNewsData, ...(Array.isArray(articlesData) ? articlesData : [])]
                    : (Array.isArray(articlesData) ? articlesData : []);

                setArticles(combinedArticles);
                setVideos(Array.isArray(videosData) ? videosData : []);
            } catch (error) {
                console.error('Error fetching data:', error);
            } finally {
                setLoading(false);
            }
        };

        fetchData();
    }, []);

    // Organize content by category
    const latestContent = [...articles, ...videos]
        .sort((a, b) => new Date(b.createdAt || b.date) - new Date(a.createdAt || a.date));

    const latestArticles = articles.slice(0, 6);
    const latestVideos = videos.slice(0, 3);

    // Business & Markets
    const businessArticles = articles.filter(a =>
        a.category?.toLowerCase().includes('business') ||
        a.category?.toLowerCase().includes('market') ||
        a.category?.toLowerCase().includes('economy') ||
        a.category?.toLowerCase().includes('finance')
    );
    const businessVideos = videos.filter(v =>
        v.category?.toLowerCase().includes('business') ||
        v.category?.toLowerCase().includes('market') ||
        v.category?.toLowerCase().includes('economy')
    );

    // Technology
    const techArticles = articles.filter(a =>
        a.category?.toLowerCase().includes('tech') ||
        a.category?.toLowerCase().includes('ai') ||
        a.category?.toLowerCase().includes('software') ||
        a.category?.toLowerCase().includes('startup')
    );
    const techVideos = videos.filter(v =>
        v.category?.toLowerCase().includes('tech') ||
        v.category?.toLowerCase().includes('ai') ||
        v.category?.toLowerCase().includes('startup')
    );

    // World News / International
    const worldArticles = articles.filter(a =>
        a.category?.toLowerCase().includes('world') ||
        a.category?.toLowerCase().includes('international') ||
        a.category?.toLowerCase().includes('global')
    );

    // Popular articles (sorted by views)
    const popularArticles = [...articles]
        .sort((a, b) => (parseInt(b.views) || 0) - (parseInt(a.views) || 0))
        .slice(0, 5);

    // Format views helper
    const formatViews = (views) => {
        if (!views) return '0';
        const num = parseInt(views);
        if (num >= 1000) return `${(num / 1000).toFixed(1)}K`;
        return num.toString();
    };

    // Get author name helper
    const getAuthorName = (author) => {
        if (!author) return 'Editorial Team';
        return typeof author === 'object' ? author?.name : author;
    };

    if (loading) {
        return (
            <div className="home-page">
                <div className="loading-container">
                    <div className="loading-spinner"></div>
                    <p>Loading news...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="home-page">
            {/* Trending Ticker */}
            <TrendingTicker />

            {/* ============ LATEST NEWS - Hero Section ============ */}
            <section className="section latest-news-section">
                <div className="container">
                    <motion.div
                        className="section-header"
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                    >
                        <h2>Latest News</h2>
                        <a href="/latest" className="view-all">View All →</a>
                    </motion.div>

                    <div className="latest-news-layout">
                        {/* Featured Article */}
                        {latestArticles[0] && (
                            <motion.div
                                className="latest-featured"
                                initial={{ opacity: 0, scale: 0.98 }}
                                animate={{ opacity: 1, scale: 1 }}
                                transition={{ duration: 0.5 }}
                            >
                                <a href={`/article/${latestArticles[0].slug || latestArticles[0]._id}`} className="featured-card">
                                    <div className="featured-image">
                                        <img
                                            src={latestArticles[0].image || 'https://images.unsplash.com/photo-1677442136019-21780ecad995?w=800'}
                                            alt={latestArticles[0].title}
                                        />
                                        <div className="featured-gradient"></div>
                                    </div>
                                    <div className="featured-content">
                                        <span className="category-badge">{latestArticles[0].category || 'News'}</span>
                                        <h1 className="featured-title">{latestArticles[0].title}</h1>
                                        <p className="featured-excerpt">
                                            {latestArticles[0].excerpt || latestArticles[0].content?.substring(0, 150) + '...'}
                                        </p>
                                        <div className="featured-meta">
                                            <span>By {getAuthorName(latestArticles[0].author)}</span>
                                            <span>•</span>
                                            <span>{latestArticles[0].readTime || '5 min read'}</span>
                                        </div>
                                    </div>
                                </a>
                            </motion.div>
                        )}

                        {/* Side Articles */}
                        <div className="latest-side">
                            {latestArticles.slice(1, 4).map((article, index) => (
                                <motion.div
                                    key={article._id || index}
                                    className="latest-side-item"
                                    initial={{ opacity: 0, x: 20 }}
                                    animate={{ opacity: 1, x: 0 }}
                                    transition={{ delay: 0.1 + index * 0.1 }}
                                >
                                    <a href={`/article/${article.slug || article._id}`} className="side-article">
                                        <div className="side-article-image">
                                            <img
                                                src={article.image || 'https://images.unsplash.com/photo-1677442136019-21780ecad995?w=400'}
                                                alt={article.title}
                                            />
                                        </div>
                                        <div className="side-article-content">
                                            <span className="category-badge small">{article.category}</span>
                                            <h3>{article.title}</h3>
                                            <span className="article-date">
                                                {new Date(article.createdAt || article.date).toLocaleDateString('en-US', {
                                                    month: 'short', day: 'numeric'
                                                })}
                                            </span>
                                        </div>
                                    </a>
                                </motion.div>
                            ))}
                        </div>
                    </div>
                </div>
            </section>

            {/* ============ BUSINESS & MARKETS WITH CALENDAR ============ */}
            <section className="section business-calendar-section">
                <div className="container">
                    <div className="business-calendar-layout">
                        {/* Business Content - Left Side */}
                        <div className="business-content">
                            <NewsCategorySection
                                title="Business & Markets"
                                icon=""
                                articles={businessArticles.length > 0 ? businessArticles : articles.slice(0, 4)}
                                videos={businessVideos}
                                layout="featured"
                                maxItems={5}
                                viewAllLink="/economics"
                            />
                        </div>

                        {/* Hindu Calendar - Right Sidebar */}
                        <div className="calendar-sidebar">
                            <HinduCalendar />
                        </div>
                    </div>
                </div>
            </section>

            {/* ============ TECHNOLOGY ============ */}
            <section className="section tech-section" style={{ background: 'var(--bg-secondary)' }}>
                <div className="container">
                    <motion.div
                        className="section-header"
                        initial={{ opacity: 0, y: 20 }}
                        whileInView={{ opacity: 1, y: 0 }}
                        viewport={{ once: true }}
                    >
                        <h2>Technology</h2>
                        <a href="/technology" className="view-all">View All →</a>
                    </motion.div>

                    <div className="content-with-sidebar">
                        <div className="main-content-area">
                            <div className="article-grid" style={{ gridTemplateColumns: 'repeat(2, 1fr)' }}>
                                {(techArticles.length > 0 ? techArticles : articles.slice(4, 8)).slice(0, 4).map((article, index) => (
                                    <ArticleCard
                                        key={article._id || index}
                                        article={article}
                                        index={index}
                                    />
                                ))}
                            </div>
                        </div>

                        {/* Sidebar - Popular This Week */}
                        <aside className="sidebar-area">
                            <div className="sidebar-widget">
                                <h3 className="widget-title">Trending This Week</h3>
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
                                <p>Get the latest news delivered to your inbox.</p>
                                <form className="newsletter-form" onSubmit={(e) => e.preventDefault()}>
                                    <input type="email" placeholder="Your email" required />
                                    <button type="submit">Subscribe</button>
                                </form>
                            </div>
                        </aside>
                    </div>
                </div>
            </section>

            {/* ============ VIDEO NEWS ============ */}
            {videos.length > 0 && (
                <section className="section video-section">
                    <div className="container">
                        <motion.div
                            className="section-header"
                            initial={{ opacity: 0, y: 20 }}
                            whileInView={{ opacity: 1, y: 0 }}
                            viewport={{ once: true }}
                        >
                            <h2>Video News</h2>
                            <a href="/videos" className="view-all">View All →</a>
                        </motion.div>

                        <div className="video-grid">
                            {videos.slice(0, 4).map((video, index) => (
                                <motion.div
                                    key={video._id || index}
                                    initial={{ opacity: 0, y: 20 }}
                                    whileInView={{ opacity: 1, y: 0 }}
                                    viewport={{ once: true }}
                                    transition={{ delay: index * 0.1 }}
                                    className="video-grid-item"
                                >
                                    <div className="video-card-compact">
                                        <div className="video-thumbnail-wrapper">
                                            <div className="video-thumbnail-placeholder">
                                                <span className="play-icon">▶</span>
                                            </div>
                                            <span className="video-duration">{video.duration || '0:45'}</span>
                                            <span className="video-source-badge">
                                                {video.source === 'instagram' ? '📸' : '🎬'}
                                            </span>
                                        </div>
                                        <div className="video-info">
                                            <span className="category-badge small">{video.category}</span>
                                            <h4>{video.title}</h4>
                                            <span className="video-views">{video.views || '0'} views</span>
                                        </div>
                                    </div>
                                </motion.div>
                            ))}
                        </div>
                    </div>
                </section>
            )}

            {/* ============ WORLD NEWS ============ */}
            {(worldArticles.length > 0 || articles.length > 8) && (
                <NewsCategorySection
                    title="World News"
                    icon=""
                    articles={worldArticles.length > 0 ? worldArticles : articles.slice(8, 12)}
                    videos={[]}
                    layout="grid"
                    maxItems={4}
                    viewAllLink="/world"
                />
            )}
        </div>
    );
}
