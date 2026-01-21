import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import ArticleCard from './ArticleCard';
import VideoCard from './VideoCard';

/**
 * NewsCategorySection - Displays a category section with mixed articles and videos
 */
export default function NewsCategorySection({
    title,
    icon = '',
    articles = [],
    videos = [],
    showViewAll = true,
    viewAllLink = '#',
    layout = 'grid', // 'grid' | 'featured' | 'list'
    maxItems = 6
}) {
    // Combine and sort content by date
    const combinedContent = [
        ...articles.map(a => ({ ...a, type: 'article' })),
        ...videos.map(v => ({ ...v, type: 'video' }))
    ].sort((a, b) => new Date(b.createdAt || b.date) - new Date(a.createdAt || a.date))
        .slice(0, maxItems);

    // Get featured item (first one) and rest
    const featuredItem = combinedContent[0];
    const otherItems = combinedContent.slice(1);

    // Handle author - can be string or object
    const getAuthorName = (author) => {
        if (!author) return 'Editorial Team';
        return typeof author === 'object' ? author?.name : author;
    };

    if (combinedContent.length === 0) {
        return null; // Don't show empty sections
    }

    return (
        <section className="news-category-section">
            <div className="container">
                {/* Section Header */}
                <motion.div
                    className="section-header"
                    initial={{ opacity: 0, y: 20 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                >
                    <h2>{icon && `${icon} `}{title}</h2>
                    {showViewAll && (
                        <Link to={viewAllLink} className="view-all">
                            View All →
                        </Link>
                    )}
                </motion.div>

                {/* Featured Layout */}
                {layout === 'featured' && featuredItem && (
                    <div className="category-featured-layout">
                        {/* Featured Item */}
                        <motion.div
                            className="category-featured-main"
                            initial={{ opacity: 0, scale: 0.98 }}
                            whileInView={{ opacity: 1, scale: 1 }}
                            viewport={{ once: true }}
                        >
                            {featuredItem.type === 'video' ? (
                                <VideoCard video={featuredItem} featured={true} />
                            ) : (
                                <Link to={`/article/${featuredItem.slug || featuredItem._id}`} className="featured-article-card">
                                    <div className="featured-article-image">
                                        <img
                                            src={featuredItem.image || 'https://images.unsplash.com/photo-1677442136019-21780ecad995?w=800'}
                                            alt={featuredItem.title}
                                        />
                                        <div className="featured-article-overlay">
                                            <span className="category-badge">{featuredItem.category}</span>
                                            <h3 className="featured-article-title">{featuredItem.title}</h3>
                                            <div className="featured-article-meta">
                                                <span>By {getAuthorName(featuredItem.author)}</span>
                                                <span>•</span>
                                                <span>{featuredItem.readTime || '5 min read'}</span>
                                            </div>
                                        </div>
                                    </div>
                                </Link>
                            )}
                        </motion.div>

                        {/* Side Items */}
                        <div className="category-featured-side">
                            {otherItems.slice(0, 4).map((item, index) => (
                                <motion.div
                                    key={item._id || item.id || index}
                                    className="category-side-item"
                                    initial={{ opacity: 0, x: 20 }}
                                    whileInView={{ opacity: 1, x: 0 }}
                                    viewport={{ once: true }}
                                    transition={{ delay: index * 0.1 }}
                                >
                                    {item.type === 'video' ? (
                                        <VideoCard video={item} />
                                    ) : (
                                        <ArticleCard article={item} variant="compact" />
                                    )}
                                </motion.div>
                            ))}
                        </div>
                    </div>
                )}

                {/* Grid Layout */}
                {layout === 'grid' && (
                    <motion.div
                        className="category-grid-layout"
                        initial={{ opacity: 0 }}
                        whileInView={{ opacity: 1 }}
                        viewport={{ once: true }}
                    >
                        {combinedContent.map((item, index) => (
                            <motion.div
                                key={item._id || item.id || index}
                                initial={{ opacity: 0, y: 20 }}
                                whileInView={{ opacity: 1, y: 0 }}
                                viewport={{ once: true }}
                                transition={{ delay: index * 0.05 }}
                            >
                                {item.type === 'video' ? (
                                    <VideoCard video={item} />
                                ) : (
                                    <ArticleCard article={item} index={index} />
                                )}
                            </motion.div>
                        ))}
                    </motion.div>
                )}

                {/* List Layout */}
                {layout === 'list' && (
                    <div className="category-list-layout">
                        {combinedContent.map((item, index) => (
                            <motion.div
                                key={item._id || item.id || index}
                                initial={{ opacity: 0, x: -20 }}
                                whileInView={{ opacity: 1, x: 0 }}
                                viewport={{ once: true }}
                                transition={{ delay: index * 0.05 }}
                            >
                                {item.type === 'video' ? (
                                    <VideoCard video={item} />
                                ) : (
                                    <ArticleCard article={item} variant="compact" index={index} />
                                )}
                            </motion.div>
                        ))}
                    </div>
                )}
            </div>
        </section>
    );
}
