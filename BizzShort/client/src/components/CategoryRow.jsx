import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useInView } from 'react-intersection-observer';
import { articlesAPI } from '../services/api';
import ArticleCard from './ui/ArticleCard';
import { motion, AnimatePresence } from 'framer-motion';

/**
 * CategoryRow Component
 * 
 * Fetches its own data when it enters the viewport.
 * Displays a horizontal scrollable row of articles.
 */
export default function CategoryRow({ categoryId, title, path }) {
  const [articles, setArticles] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [hasFetched, setHasFetched] = useState(false);

  const { ref, inView } = useInView({
    triggerOnce: true,
    threshold: 0.1,
    rootMargin: '200px 0px', // Fetch slightly before it enters the viewport
  });

  useEffect(() => {
    if (inView && !hasFetched) {
      fetchCategoryData();
    }
  }, [inView, hasFetched]);

  const fetchCategoryData = async () => {
    setLoading(true);
    try {
      // Fetch 4 articles for this category
      const response = await articlesAPI.getPublicList({ 
        category: categoryId, 
        limit: 4 
      });
      
      const data = response?.data || response || [];
      setArticles(Array.isArray(data) ? data : []);
      setHasFetched(true);
    } catch (err) {
      console.error(`Error fetching category ${categoryId}:`, err);
      setError('Failed to load articles');
    } finally {
      setLoading(false);
    }
  };

  // Only render if we have data or are loading
  if (hasFetched && articles.length === 0 && !loading) return null;

  return (
    <section className="category-row-section" ref={ref}>
      <div className="container">
        <div className="category-row-header">
          <h2 className="category-row-title">{title}</h2>
          <Link to={path} className="category-row-view-all">
            View All <span>&rarr;</span>
          </Link>
        </div>

        <div className="category-row-content">
          <AnimatePresence mode="wait">
            {loading ? (
              <motion.div 
                key="skeleton"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="category-row-grid"
              >
                {[1, 2, 3, 4].map((i) => (
                  <div key={i} className="article-card-skeleton">
                    <div className="skeleton-image shim"></div>
                    <div className="skeleton-content">
                      <div className="skeleton-title shim"></div>
                      <div className="skeleton-text shim"></div>
                      <div className="skeleton-text shim" style={{ width: '60%' }}></div>
                    </div>
                  </div>
                ))}
              </motion.div>
            ) : (
              <motion.div 
                key="content"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="category-row-grid"
              >
                {articles.map((article, index) => (
                  <ArticleCard 
                    key={article._id || index} 
                    article={article} 
                    index={index}
                  />
                ))}
              </motion.div>
            )}
          </AnimatePresence>
          
          {error && !loading && (
            <div className="category-row-error">
              <p>{error}</p>
              <button onClick={fetchCategoryData}>Retry</button>
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
