import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { articlesAPI } from '../services/api';
import ArticleCard from '../components/ui/ArticleCard';

export default function Article() {
    const { slug } = useParams();
    const [article, setArticle] = useState(null);
    const [relatedArticles, setRelatedArticles] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchArticle = async () => {
            try {
                // Try to fetch by slug first
                const data = await articlesAPI.getBySlug(slug).catch(() => null);

                if (data) {
                    setArticle(data);
                    // Track view
                    if (data._id) {
                        articlesAPI.incrementViews(data._id).catch(() => { });
                    }
                } else {
                    // Demo article if not found
                    setArticle({
                        title: 'The Future of AI: How Machine Learning is Reshaping Every Industry',
                        content: `
              <p>Artificial intelligence has evolved from a futuristic concept to a practical tool reshaping industries worldwide. From healthcare diagnostics to financial analysis, AI systems are demonstrating capabilities that were once thought impossible.</p>
              
              <h2>The Current State of AI</h2>
              <p>Today's AI systems can process natural language, recognize images, and make complex decisions with remarkable accuracy. Large language models have transformed how we interact with technology, enabling more natural and intuitive interfaces.</p>
              
              <h2>Industry Applications</h2>
              <p>Healthcare providers are using AI to detect diseases earlier and more accurately. Financial institutions leverage machine learning for fraud detection and risk assessment. Manufacturing facilities employ AI-powered robots for precision tasks.</p>
              
              <h2>What's Next</h2>
              <p>The next generation of AI systems promises even greater capabilities. Multimodal models that can understand text, images, and audio simultaneously are already emerging. Edge AI will bring intelligent processing to devices everywhere.</p>
              
              <p>As we move forward, the key challenge will be ensuring AI development remains ethical and beneficial for all of humanity.</p>
            `,
                        category: 'Artificial Intelligence',
                        author: 'Editorial Team',
                        date: new Date().toISOString(),
                        image: 'https://images.unsplash.com/photo-1677442136019-21780ecad995?w=1200',
                        views: 15420,
                    });
                }

                // Fetch related articles
                const allArticles = await articlesAPI.getAll().catch(() => []);
                setRelatedArticles(Array.isArray(allArticles) ? allArticles.slice(0, 3) : []);
            } catch (error) {
                console.error('Error fetching article:', error);
            } finally {
                setLoading(false);
            }
        };

        fetchArticle();
    }, [slug]);

    if (loading) {
        return (
            <div className="article-page">
                <div className="container">
                    <div className="skeleton" style={{ height: 400, marginBottom: 32, borderRadius: 20 }}></div>
                    <div className="skeleton" style={{ height: 40, width: '80%', marginBottom: 16 }}></div>
                    <div className="skeleton" style={{ height: 24, width: '40%', marginBottom: 32 }}></div>
                    {[...Array(5)].map((_, i) => (
                        <div key={i} className="skeleton" style={{ height: 20, marginBottom: 12 }}></div>
                    ))}
                </div>
            </div>
        );
    }

    if (!article) {
        return (
            <div className="article-page">
                <div className="container" style={{ textAlign: 'center', padding: '100px 0' }}>
                    <h1>Article Not Found</h1>
                    <p>The article you're looking for doesn't exist.</p>
                    <Link to="/" style={{ color: 'var(--primary)', fontWeight: 600 }}>
                        ← Back to Home
                    </Link>
                </div>
            </div>
        );
    }

    const formattedDate = article.date
        ? new Date(article.date).toLocaleDateString('en-US', {
            weekday: 'long',
            month: 'long',
            day: 'numeric',
            year: 'numeric'
        })
        : 'Today';

    return (
        <motion.div
            className="article-page"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.5 }}
        >
            {/* Hero Image */}
            <div className="article-hero">
                <img src={article.image} alt={article.title} />
                <div className="article-hero-overlay">
                    <div className="container">
                        {article.category && (
                            <span className="category-badge">{article.category}</span>
                        )}
                        <h1>{article.title}</h1>
                        <div className="article-meta">
                            <span>By {article.author || 'Editorial Team'}</span>
                            <span>•</span>
                            <span>{formattedDate}</span>
                            {article.views && (
                                <>
                                    <span>•</span>
                                    <span>{article.views.toLocaleString()} views</span>
                                </>
                            )}
                        </div>
                    </div>
                </div>
            </div>

            {/* Article Content */}
            <div className="container">
                <div className="article-content-wrapper">
                    <article
                        className="article-content"
                        dangerouslySetInnerHTML={{ __html: article.content }}
                    />

                    {/* Share Buttons */}
                    <div className="article-share">
                        <span>Share this article:</span>
                        <div className="share-buttons">
                            <button className="share-btn facebook">Facebook</button>
                            <button className="share-btn twitter">Twitter</button>
                            <button className="share-btn linkedin">LinkedIn</button>
                        </div>
                    </div>
                </div>

                {/* Related Articles */}
                {relatedArticles.length > 0 && (
                    <section className="related-articles">
                        <h2>Related Articles</h2>
                        <div className="article-grid">
                            {relatedArticles.map((related, index) => (
                                <ArticleCard
                                    key={related._id || index}
                                    article={related}
                                    index={index}
                                />
                            ))}
                        </div>
                    </section>
                )}
            </div>

            <style>{`
        .article-page {
          padding-bottom: 80px;
        }
        
        .article-hero {
          position: relative;
          height: 500px;
          overflow: hidden;
        }
        
        .article-hero img {
          width: 100%;
          height: 100%;
          object-fit: cover;
        }
        
        .article-hero-overlay {
          position: absolute;
          bottom: 0;
          left: 0;
          right: 0;
          padding: 60px 0;
          background: linear-gradient(to top, rgba(0,0,0,0.9), rgba(0,0,0,0.5), transparent);
        }
        
        .article-hero h1 {
          font-size: clamp(2rem, 4vw, 3rem);
          color: white;
          margin: 16px 0;
          max-width: 800px;
        }
        
        .article-meta {
          display: flex;
          gap: 12px;
          color: rgba(255,255,255,0.8);
          font-size: 14px;
        }
        
        .article-content-wrapper {
          max-width: 800px;
          margin: 0 auto;
          padding: 60px 0;
        }
        
        .article-content {
          font-size: 18px;
          line-height: 1.8;
          color: var(--text-secondary);
        }
        
        .article-content h2 {
          font-size: 1.75rem;
          color: var(--text-primary);
          margin: 40px 0 20px;
        }
        
        .article-content p {
          margin-bottom: 24px;
        }
        
        .article-share {
          display: flex;
          align-items: center;
          gap: 20px;
          padding: 30px 0;
          border-top: 1px solid var(--light-gray);
          margin-top: 40px;
        }
        
        .share-buttons {
          display: flex;
          gap: 12px;
        }
        
        .share-btn {
          padding: 10px 20px;
          border-radius: var(--radius-full);
          font-size: 13px;
          font-weight: 600;
          color: white;
        }
        
        .share-btn.facebook { background: #1877f2; }
        .share-btn.twitter { background: #1da1f2; }
        .share-btn.linkedin { background: #0a66c2; }
        
        .related-articles {
          padding: 60px 0;
          border-top: 1px solid var(--light-gray);
        }
        
        .related-articles h2 {
          margin-bottom: 32px;
        }
        
        @media (max-width: 768px) {
          .article-hero {
            height: 350px;
          }
          
          .article-content-wrapper {
            padding: 40px 0;
          }
        }
      `}</style>
        </motion.div>
    );
}
