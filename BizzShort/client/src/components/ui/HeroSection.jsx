import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import '../../styles/components.css';

export default function HeroSection({ featured, sideArticles = [] }) {
    // Default featured article if none provided
    const mainArticle = featured || {
        title: 'The Future of AI: How Machine Learning is Reshaping Every Industry',
        slug: 'future-of-ai',
        category: 'Artificial Intelligence',
        author: 'Editorial Team',
        image: 'https://images.unsplash.com/photo-1677442136019-21780ecad995?w=800',
        date: new Date().toISOString(),
    };

    // Default side articles
    const sides = sideArticles.length > 0 ? sideArticles : [
        {
            title: 'Indian Unicorns Lead Global Tech Innovation Wave',
            slug: 'indian-unicorns',
            category: 'Startups',
            image: 'https://images.unsplash.com/photo-1559526324-4b87b5e36e44?w=400',
        },
        {
            title: 'Bitcoin Reaches New All-Time High as Institutions Invest',
            slug: 'bitcoin-ath',
            category: 'Cryptocurrency',
            image: 'https://images.unsplash.com/photo-1639762681485-074b7f938ba0?w=400',
        },
    ];

    return (
        <section className="hero-section">
            <div className="container">
                <div className="hero-grid">
                    {/* Main Featured Article */}
                    <motion.article
                        className="hero-main"
                        initial={{ opacity: 0, scale: 0.98 }}
                        animate={{ opacity: 1, scale: 1 }}
                        transition={{ duration: 0.6 }}
                    >
                        <Link to={`/article/${mainArticle.slug}`}>
                            <div className="hero-main-image">
                                <img src={mainArticle.image} alt={mainArticle.title} />
                            </div>
                            <div className="hero-main-overlay">
                                <span className="category-badge">
                                    {mainArticle.category}
                                </span>
                                <h1 className="hero-main-title">{mainArticle.title}</h1>
                                <div className="hero-main-meta">
                                    <span>By {typeof mainArticle.author === 'object' ? mainArticle.author?.name : mainArticle.author || 'Editorial Team'}</span>
                                    <span>•</span>
                                    <span>5 min read</span>
                                </div>
                            </div>
                        </Link>
                    </motion.article>

                    {/* Side Articles */}
                    <div className="hero-side">
                        {sides.slice(0, 2).map((article, index) => (
                            <motion.article
                                key={article.slug || index}
                                className="hero-side-article"
                                initial={{ opacity: 0, x: 20 }}
                                animate={{ opacity: 1, x: 0 }}
                                transition={{ duration: 0.5, delay: 0.2 + index * 0.1 }}
                            >
                                <Link to={`/article/${article.slug}`}>
                                    <div className="hero-side-image">
                                        <img src={article.image} alt={article.title} />
                                    </div>
                                    <div className="hero-side-overlay">
                                        <span className="category-badge">
                                            {article.category}
                                        </span>
                                        <h3 className="hero-side-title">{article.title}</h3>
                                    </div>
                                </Link>
                            </motion.article>
                        ))}
                    </div>
                </div>
            </div>
        </section>
    );
}
