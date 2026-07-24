import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import axios from 'axios';
import ArticleCard from '../components/ui/ArticleCard';

export default function Author() {
    const { slug } = useParams();
    const [author, setAuthor] = useState(null);
    const [articles, setArticles] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    useEffect(() => {
        const fetchAuthorData = async () => {
            setLoading(true);
            setError(null);
            try {
                const res = await axios.get(`/api/authors/${slug}`);
                if (res.data?.success) {
                    setAuthor(res.data.author);
                    setArticles(res.data.articles || []);
                } else {
                    setError('Author data not found');
                }
            } catch (err) {
                console.error('Error fetching author data:', err);
                setError(err.response?.data?.error || 'Failed to load author profile');
            } finally {
                setLoading(false);
            }
        };

        if (slug) {
            fetchAuthorData();
        }
    }, [slug]);

    if (loading) {
        return (
            <div className="page-loading" style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '60vh' }}>
                <div className="page-loading-spinner" style={{ width: '40px', height: '40px', border: '3px solid #f3f3f3', borderTop: '3px solid #aa2123', borderRadius: '50%', animation: 'spin 1s linear infinite' }} />
                <style>{`@keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }`}</style>
            </div>
        );
    }

    if (error || !author) {
        return (
            <div className="container" style={{ textAlign: 'center', padding: '100px 20px', minHeight: '60vh' }}>
                <h2 style={{ fontSize: '2rem', color: '#aa2123', marginBottom: '15px' }}>Profile Not Found</h2>
                <p style={{ color: '#666', marginBottom: '20px' }}>{error || 'The requested author profile does not exist.'}</p>
                <Link to="/" style={{ display: 'inline-block', background: '#aa2123', color: '#fff', padding: '10px 20px', borderRadius: '4px', textDecoration: 'none', fontWeight: 'bold' }}>Go to Homepage</Link>
            </div>
        );
    }

    return (
        <motion.div
            className="author-profile-page"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            style={{ minHeight: '80vh', background: '#fafafa' }}
        >
            {/* Author Profile Header (Glassmorphic Hero Card) */}
            <div className="author-hero" style={{ background: 'linear-gradient(135deg, #111 0%, #222 100%)', padding: '60px 0 40px 0', borderBottom: '3px solid #aa2123', color: '#fff' }}>
                <div className="container" style={{ maxWidth: '1000px', margin: '0 auto', padding: '0 20px', display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center' }}>
                    
                    {/* Avatar */}
                    <div className="author-avatar-container" style={{ position: 'relative', marginBottom: '20px' }}>
                        <img 
                            src={author.avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(author.name)}&background=random`} 
                            alt={author.name} 
                            style={{ width: '130px', height: '130px', borderRadius: '50%', objectFit: 'cover', border: '4px solid #fff', boxShadow: '0 8px 16px rgba(0,0,0,0.3)' }}
                        />
                        <span style={{ position: 'absolute', bottom: '5px', right: '5px', background: '#aa2123', color: '#fff', fontSize: '11px', fontWeight: 'bold', padding: '3px 8px', borderRadius: '10px', textTransform: 'uppercase', boxShadow: '0 2px 4px rgba(0,0,0,0.2)' }}>Author</span>
                    </div>

                    {/* Info */}
                    <h1 style={{ fontSize: '2.5rem', fontWeight: '800', margin: '0 0 10px 0', color: '#fff' }}>{author.name}</h1>
                    <p style={{ fontSize: '1.1rem', color: '#ccc', maxWidth: '600px', margin: '0 auto 20px auto', lineHeight: '1.6' }}>{author.bio || 'Journalist and contributor at ZPlus News.'}</p>
                    
                    {/* Social links */}
                    <div className="author-socials" style={{ display: 'flex', gap: '15px', justifyContent: 'center' }}>
                        {author.linkedin && (
                            <a href={author.linkedin} target="_blank" rel="noopener noreferrer" style={{ display: 'inline-flex', alignItems: 'center', gap: '5px', color: '#fff', background: '#0077b5', padding: '6px 15px', borderRadius: '20px', textDecoration: 'none', fontSize: '0.9rem', fontWeight: '500', transition: 'all 0.2s' }}>
                                <span>LinkedIn</span>
                            </a>
                        )}
                        {author.twitter && (
                            <a href={author.twitter} target="_blank" rel="noopener noreferrer" style={{ display: 'inline-flex', alignItems: 'center', gap: '5px', color: '#fff', background: '#1da1f2', padding: '6px 15px', borderRadius: '20px', textDecoration: 'none', fontSize: '0.9rem', fontWeight: '500', transition: 'all 0.2s' }}>
                                <span>Twitter</span>
                            </a>
                        )}
                    </div>
                </div>
            </div>

            {/* Articles by Author Section */}
            <section className="section" style={{ padding: '60px 0' }}>
                <div className="container" style={{ maxWidth: '1000px', margin: '0 auto', padding: '0 20px' }}>
                    <h2 style={{ fontSize: '1.8rem', fontWeight: '800', borderBottom: '2px solid #ddd', paddingBottom: '10px', marginBottom: '30px', color: '#222' }}>
                        Articles Published by {author.name} <span style={{ fontSize: '1.2rem', color: '#666', fontWeight: 'normal' }}>({articles.length})</span>
                    </h2>

                    {articles.length === 0 ? (
                        <div style={{ background: '#fff', border: '1px solid #eee', borderRadius: '8px', padding: '40px 20px', textAlign: 'center', color: '#666' }}>
                            No articles found for this author.
                        </div>
                    ) : (
                        <div className="articles-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '30px' }}>
                            {articles.map(article => (
                                <ArticleCard key={article._id || article.id} article={article} />
                            ))}
                        </div>
                    )}
                </div>
            </section>
        </motion.div>
    );
}
