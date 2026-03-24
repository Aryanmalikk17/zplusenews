import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import '../../styles/components.css';

const cardVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: {
        opacity: 1,
        y: 0,
        transition: { duration: 0.4, ease: 'easeOut' }
    },
};

export default function ArticleCard({ article, variant = 'default', index = 0 }) {
    const {
        _id,
        title,
        slug,
        excerpt,
        content,
        category,
        author,
        image,
        date,
        createdAt,
        views,
        isExternal,
        source,
        readTime,
    } = article;

    const formattedDate = (date || createdAt)
        ? new Date(date || createdAt).toLocaleDateString('en-US', {
            month: 'short',
            day: 'numeric',
            year: 'numeric'
        })
        : 'Today';

    // Handle author - can be string or object with name property
    const authorName = typeof author === 'object' ? author?.name : author;

    const displayExcerpt = excerpt || (content ? content.substring(0, 120) + '...' : '');
    const articleUrl = isExternal ? source?.url : `/article/${slug || _id}`;
    const imageUrl = image || `https://images.unsplash.com/photo-1677442136019-21780ecad995?w=600&q=75&fm=webp&fit=crop`;

    // Wrapper component for links
    const CardLink = ({ children, className }) => {
        if (isExternal) {
            return (
                <a
                    href={articleUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className={className}
                >
                    {children}
                </a>
            );
        }
        return <Link to={articleUrl} className={className}>{children}</Link>;
    };

    // Compact variant for sidebar lists
    if (variant === 'compact') {
        return (
            <motion.article
                className="article-card-compact"
                variants={cardVariants}
                initial="hidden"
                animate="visible"
                transition={{ delay: index * 0.1 }}
            >
                <CardLink className="article-card-compact-inner">
                    <div className="article-card-compact-image">
                        <img
                            src={imageUrl}
                            alt={title}
                            loading="lazy"
                            onError={(e) => {
                                e.target.src = 'https://images.unsplash.com/photo-1504711434969-e33886168f5c?w=600';
                            }}
                        />
                        {isExternal && (
                            <span className="external-indicator" title="External Source">
                                <i className="fa-solid fa-arrow-up-right-from-square"></i>
                            </span>
                        )}
                    </div>
                    <div className="article-card-compact-content">
                        <h4 className="article-card-compact-title">{title}</h4>
                        <div className="article-card-compact-meta">
                            <span className="article-card-compact-date">{formattedDate}</span>
                            {source?.name && (
                                <span className="article-card-source">• {source.name}</span>
                            )}
                        </div>
                    </div>
                </CardLink>
            </motion.article>
        );
    }

    // Featured variant for hero section
    if (variant === 'featured') {
        return (
            <motion.article
                className="article-card-featured"
                variants={cardVariants}
                initial="hidden"
                animate="visible"
                transition={{ duration: 0.3 }}
            >
                <CardLink>
                    <div className="article-card-featured-image">
                        <img
                            src={imageUrl}
                            alt={title}
                            loading="lazy"
                            onError={(e) => {
                                e.target.src = 'https://images.unsplash.com/photo-1504711434969-e33886168f5c?w=600';
                            }}
                        />
                        <div className="article-card-featured-overlay">
                            <div className="article-card-featured-badges">
                                {category && (
                                    <span className={`category-badge ${category.toLowerCase()}`}>
                                        {category}
                                    </span>
                                )}
                                {isExternal && (
                                    <span className="category-badge external-badge">
                                        <i className="fa-solid fa-external-link"></i> External
                                    </span>
                                )}
                            </div>
                            <h2 className="article-card-featured-title">{title}</h2>
                            <div className="article-card-featured-meta">
                                {authorName && <span>By {authorName}</span>}
                                <span>{formattedDate}</span>
                                {source?.name && <span>via {source.name}</span>}
                            </div>
                        </div>
                    </div>
                </CardLink>
            </motion.article>
        );
    }

    // Default card variant
    return (
        <motion.article
            className={`article-card article-card-hover ${isExternal ? 'article-card-external' : ''}`}
            variants={cardVariants}
            initial="hidden"
            animate="visible"
            transition={{ delay: index * 0.1 }}
        >
            <CardLink>
                <div className="article-card-image">
                    <img
                        src={imageUrl}
                        alt={title}
                        loading="lazy"
                        onError={(e) => {
                            e.target.src = 'https://images.unsplash.com/photo-1504711434969-e33886168f5c?w=600';
                        }}
                    />
                    <div className="article-card-badges">
                        {category && (
                            <span className={`category-badge ${category.toLowerCase()}`}>
                                {category}
                            </span>
                        )}
                        {isExternal && (
                            <span className="external-indicator" title="Opens in new tab">
                                <i className="fa-solid fa-arrow-up-right-from-square"></i>
                            </span>
                        )}
                    </div>
                </div>
                <div className="article-card-content">
                    <h3 className="article-card-title">{title}</h3>
                    {displayExcerpt && (
                        <p className="article-card-excerpt">{displayExcerpt}</p>
                    )}
                    <div className="article-card-meta">
                        <div className="article-card-author">
                            {authorName && <span>By {authorName}</span>}
                            {source?.name && (
                                <span className="article-source-tag">
                                    <i className="fa-solid fa-external-link"></i> {source.name}
                                </span>
                            )}
                        </div>
                        <div className="article-card-info">
                            <span className="article-card-date">{formattedDate}</span>
                            {readTime && <span className="article-read-time">{readTime}</span>}
                        </div>
                    </div>
                </div>
            </CardLink>
        </motion.article>
    );
}
