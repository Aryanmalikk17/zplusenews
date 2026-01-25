import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import VideoCard from '../ui/VideoCard';
import ArticleCard from '../ui/ArticleCard';
import '../../styles/category-page.css';

export default function CategoryPageLayout({
    category,
    title,
    description,
    heroGradient = 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
    icon
}) {
    const [content, setContent] = useState({ articles: [], videos: [] });
    const [loading, setLoading] = useState(true);
    const [viewMode, setViewMode] = useState('grid'); // grid or list
    const [filter, setFilter] = useState('all'); // all, articles, videos

    useEffect(() => {
        fetchContent();
    }, [category]);

    const fetchContent = async () => {
        setLoading(true);
        try {
            // Fetch articles
            const articlesRes = await fetch(`/api/articles?category=${category}&status=PUBLISHED`);
            const articlesData = await articlesRes.json();

            // Fetch videos
            const videosRes = await fetch(`/api/videos?category=${category}`);
            const videosData = await videosRes.json();

            setContent({
                articles: articlesData.success ? articlesData.data : [],
                videos: videosData.success ? videosData.data : []
            });
        } catch (error) {
            console.error('Error fetching content:', error);
            setContent({ articles: [], videos: [] });
        } finally {
            setLoading(false);
        }
    };

    const getFilteredContent = () => {
        let items = [];

        if (filter === 'all' || filter === 'articles') {
            items.push(...content.articles.map(a => ({ ...a, type: 'article' })));
        }
        if (filter === 'all' || filter === 'videos') {
            items.push(...content.videos.map(v => ({ ...v, type: 'video' })));
        }

        // Sort by date (newest first)
        return items.sort((a, b) => {
            const dateA = new Date(a.publishedAt || a.createdAt);
            const dateB = new Date(b.publishedAt || b.createdAt);
            return dateB - dateA;
        });
    };

    const filteredContent = getFilteredContent();

    return (
        <div className="category-page">
            {/* Hero Section */}
            <motion.section
                className="category-hero"
                style={{ background: heroGradient }}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5 }}
            >
                <div className="container">
                    <div className="category-hero-content">
                        {icon && <div className="category-icon">{icon}</div>}
                        <h1 className="category-title">{title}</h1>
                        <p className="category-description">{description}</p>
                        <div className="category-stats">
                            <div className="stat">
                                <span className="stat-number">{content.articles.length}</span>
                                <span className="stat-label">Articles</span>
                            </div>
                            <div className="stat">
                                <span className="stat-number">{content.videos.length}</span>
                                <span className="stat-label">Videos</span>
                            </div>
                            <div className="stat">
                                <span className="stat-number">{filteredContent.length}</span>
                                <span className="stat-label">Total</span>
                            </div>
                        </div>
                    </div>
                </div>
            </motion.section>

            {/* Controls */}
            <div className="container">
                <div className="category-controls">
                    {/* Filter Tabs */}
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
                            Articles
                        </button>
                        <button
                            className={`filter-tab ${filter === 'videos' ? 'active' : ''}`}
                            onClick={() => setFilter('videos')}
                        >
                            Videos
                        </button>
                    </div>

                    {/* View Mode Toggle */}
                    <div className="view-toggle">
                        <button
                            className={`view-btn ${viewMode === 'grid' ? 'active' : ''}`}
                            onClick={() => setViewMode('grid')}
                            aria-label="Grid view"
                        >
                            <svg viewBox="0 0 24 24" fill="currentColor" width="20" height="20">
                                <path d="M3 3h8v8H3zm10 0h8v8h-8zM3 13h8v8H3zm10 0h8v8h-8z" />
                            </svg>
                        </button>
                        <button
                            className={`view-btn ${viewMode === 'list' ? 'active' : ''}`}
                            onClick={() => setViewMode('list')}
                            aria-label="List view"
                        >
                            <svg viewBox="0 0 24 24" fill="currentColor" width="20" height="20">
                                <path d="M3 4h18v4H3zm0 6h18v4H3zm0 6h18v4H3z" />
                            </svg>
                        </button>
                    </div>
                </div>

                {/* Content Grid */}
                {loading ? (
                    <div className="loading-state">
                        <div className="spinner"></div>
                        <p>Loading content...</p>
                    </div>
                ) : filteredContent.length > 0 ? (
                    <motion.div
                        className={`content-${viewMode}`}
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ duration: 0.3 }}
                    >
                        {filteredContent.map((item, index) => (
                            <motion.div
                                key={`${item.type}-${item._id}`}
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: index * 0.05 }}
                            >
                                {item.type === 'article' ? (
                                    <ArticleCard article={item} />
                                ) : (
                                    <VideoCard video={item} />
                                )}
                            </motion.div>
                        ))}
                    </motion.div>
                ) : (
                    <div className="empty-state">
                        <div className="empty-icon">
                            <svg viewBox="0 0 24 24" fill="currentColor" width="64" height="64">
                                <path d="M19 3H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm0 16H5V5h14v14zm-5.04-6.71l-2.75 3.54-1.96-2.36L6.5 17h11l-3.54-4.71z" />
                            </svg>
                        </div>
                        <h3>No Content Available</h3>
                        <p>There's no {filter === 'all' ? 'content' : filter} in this category yet.</p>
                        <p className="empty-hint">Check back soon for updates!</p>
                    </div>
                )}
            </div>
        </div>
    );
}
