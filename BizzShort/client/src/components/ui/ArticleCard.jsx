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
        views,
    } = article;

    const formattedDate = date
        ? new Date(date).toLocaleDateString('en-US', {
            month: 'short',
            day: 'numeric',
            year: 'numeric'
        })
        : 'Today';

    // Handle author - can be string or object with name property
    const authorName = typeof author === 'object' ? author?.name : author;

    const displayExcerpt = excerpt || (content ? content.substring(0, 120) + '...' : '');
    const articleUrl = `/article/${slug || _id}`;
    const imageUrl = image || `https://images.unsplash.com/photo-1677442136019-21780ecad995?w=600`;

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
                <Link to={articleUrl} className="article-card-compact-inner">
                    <div className="article-card-compact-image">
                        <img src={imageUrl} alt={title} loading="lazy" />
                    </div>
                    <div className="article-card-compact-content">
                        <h4 className="article-card-compact-title">{title}</h4>
                        <span className="article-card-compact-date">{formattedDate}</span>
                    </div>
                </Link>
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
                whileHover={{ scale: 1.02 }}
                transition={{ duration: 0.3 }}
            >
                <Link to={articleUrl}>
                    <div className="article-card-featured-image">
                        <img src={imageUrl} alt={title} loading="lazy" />
                        <div className="article-card-featured-overlay">
                            {category && (
                                <span className={`category-badge ${category.toLowerCase()}`}>
                                    {category}
                                </span>
                            )}
                            <h2 className="article-card-featured-title">{title}</h2>
                            <div className="article-card-featured-meta">
                                {authorName && <span>By {authorName}</span>}
                                <span>{formattedDate}</span>
                            </div>
                        </div>
                    </div>
                </Link>
            </motion.article>
        );
    }

    // Default card variant
    return (
        <motion.article
            className="article-card"
            variants={cardVariants}
            initial="hidden"
            animate="visible"
            transition={{ delay: index * 0.1 }}
            whileHover={{ y: -5 }}
        >
            <Link to={articleUrl}>
                <div className="article-card-image">
                    <img src={imageUrl} alt={title} loading="lazy" />
                    {category && (
                        <span className={`category-badge ${category.toLowerCase()}`}>
                            {category}
                        </span>
                    )}
                </div>
                <div className="article-card-content">
                    <h3 className="article-card-title">{title}</h3>
                    {displayExcerpt && (
                        <p className="article-card-excerpt">{displayExcerpt}</p>
                    )}
                    <div className="article-card-meta">
                        <div className="article-card-author">
                            {authorName && <span>By {authorName}</span>}
                        </div>
                        <span className="article-card-date">{formattedDate}</span>
                    </div>
                </div>
            </Link>
        </motion.article>
    );
}
