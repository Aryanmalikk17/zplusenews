import { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { articlesAPI, videosAPI, statsAPI } from '../services/api';
import '../styles/admin.css';

const AdminPanel = () => {
    const [activeTab, setActiveTab] = useState('dashboard');
    const [articles, setArticles] = useState([]);
    const [videos, setVideos] = useState([]);
    const [stats, setStats] = useState({ totalArticles: 0, totalViews: 0, trendingTopics: [] });
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [successMessage, setSuccessMessage] = useState(null);

    // Form states
    const [isArticleModalOpen, setIsArticleModalOpen] = useState(false);
    const [editingArticle, setEditingArticle] = useState(null);
    const [articleForm, setArticleForm] = useState({
        title: '',
        content: '',
        category: 'National News',
        author: 'Editorial Team',
        image: '',
        poster: '',
        videoId: '',
        videoUrl: '',
        metaTitle: '',
        metaDescription: ''
    });

    const categories = ['National News', 'Business', 'Technology', 'Sports', 'Entertainment', 'Health', 'World News', 'Economics', 'Video News'];

    useEffect(() => {
        fetchData();
    }, []);

    const fetchData = async () => {
        setLoading(true);
        try {
            const [articlesRes, videosRes, statsRes] = await Promise.all([
                articlesAPI.getAll().catch(() => ({ data: [] })),
                videosAPI.getAll().catch(() => ({ data: [] })),
                statsAPI.getOverall().catch(() => ({ data: { totalArticles: 0, totalViews: 0, trendingTopics: [] } }))
            ]);

            setArticles(articlesRes.data || articlesRes || []);
            setVideos(videosRes.data || videosRes || []);
            setStats(statsRes.data || statsRes || { totalArticles: 0, totalViews: 0, trendingTopics: [] });
            setError(null);
        } catch (err) {
            console.error('Error fetching admin data:', err);
            setError('Failed to sync with server. Check your connection.');
        } finally {
            setLoading(false);
        }
    };

    const handleArticleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        setError(null);
        try {
            if (editingArticle) {
                await articlesAPI.update(editingArticle._id, articleForm);
                setSuccessMessage('Article updated successfully!');
            } else {
                await articlesAPI.create(articleForm);
                setSuccessMessage('Article published successfully!');
            }
            setIsArticleModalOpen(false);
            setEditingArticle(null);
            setArticleForm({
                title: '',
                content: '',
                category: 'National News',
                author: 'Editorial Team',
                image: '',
                poster: '',
                videoId: '',
                videoUrl: '',
                metaTitle: '',
                metaDescription: ''
            });
            await fetchData();
            setTimeout(() => setSuccessMessage(null), 3000);
        } catch (err) {
            console.error('Submit error:', err);
            setError(err.response?.data?.message || 'Failed to save article. Possible duplicate title.');
        } finally {
            setLoading(false);
        }
    };

    const handleDeleteArticle = async (id) => {
        if (!window.confirm('Are you sure you want to delete this article?')) return;
        try {
            await articlesAPI.delete(id);
            setSuccessMessage('Article deleted.');
            await fetchData();
            setTimeout(() => setSuccessMessage(null), 3000);
        } catch (err) {
            setError('Delete failed.');
        }
    };

    const openEditModal = (article) => {
        setEditingArticle(article);
        setArticleForm({
            title: article.title || '',
            content: article.content || '',
            category: article.category || 'National News',
            author: article.author || 'Editorial Team',
            image: article.image || '',
            poster: article.poster || '',
            videoId: article.videoId || '',
            videoUrl: article.videoUrl || '',
            metaTitle: article.metaTitle || '',
            metaDescription: article.metaDescription || ''
        });
        setIsArticleModalOpen(true);
    };

    // Render components
    const DashboardTab = () => (
        <div className="admin-dashboard-grid">
            <div className="stat-card">
                <div className="stat-icon"><i className="fa-solid fa-file-lines"></i></div>
                <div className="stat-content">
                    <h3>{articles.length}</h3>
                    <p>Total Articles</p>
                </div>
            </div>
            <div className="stat-card">
                <div className="stat-icon"><i className="fa-solid fa-eye"></i></div>
                <div className="stat-content">
                    <h3>{stats.totalViews || articles.reduce((acc, art) => acc + (art.views || 0), 0).toLocaleString()}</h3>
                    <p>Total Reach</p>
                </div>
            </div>
            <div className="stat-card">
                <div className="stat-icon"><i className="fa-solid fa-video"></i></div>
                <div className="stat-content">
                    <h3>{videos.length}</h3>
                    <p>Videos Synced</p>
                </div>
            </div>
            
            <div className="dashboard-main">
                <div className="recent-activity-card">
                    <h3>Recent News Flow</h3>
                    <div className="activity-list">
                        {articles.slice(0, 5).map((art, i) => (
                            <div key={art._id || i} className="activity-item">
                                <div className="activity-dot"></div>
                                <div className="activity-text">
                                    <strong>{art.title}</strong>
                                    <span>in {art.category} • {new Date(art.publishedAt || art.createdAt || Date.now()).toLocaleDateString()}</span>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        </div>
    );

    const ArticlesTab = () => (
        <div className="admin-table-container">
            <div className="table-header">
                <h2>Article Archive</h2>
                <button 
                    className="add-btn"
                    onClick={() => {
                        setEditingArticle(null);
                        setArticleForm({
                            title: '', content: '', category: 'National News',
                            author: 'Editorial Team', image: '', poster: '',
                            videoId: '', videoUrl: '', metaTitle: '', metaDescription: ''
                        });
                        setIsArticleModalOpen(true);
                    }}
                >
                    <i className="fa-solid fa-plus"></i> New News
                </button>
            </div>
            <table className="admin-table">
                <thead>
                    <tr>
                        <th>Headline</th>
                        <th>Category</th>
                        <th>Date Published</th>
                        <th>Views</th>
                        <th>Actions</th>
                    </tr>
                </thead>
                <tbody>
                    {articles.map(art => (
                        <tr key={art._id}>
                            <td className="headline-cell">{art.title}</td>
                            <td><span className={`cat-pill ${art.category?.toLowerCase().replace(' ', '-')}`}>{art.category}</span></td>
                            <td>{new Date(art.publishedAt || art.createdAt || Date.now()).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}</td>
                            <td>{art.views?.toLocaleString() || 0}</td>
                            <td className="actions-cell">
                                <button className="icon-btn edit" onClick={() => openEditModal(art)}><i className="fa-solid fa-pen"></i></button>
                                <button className="icon-btn delete" onClick={() => handleDeleteArticle(art._id)}><i className="fa-solid fa-trash"></i></button>
                            </td>
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    );

    return (
        <div className="admin-panel">
            <aside className="admin-sidebar">
                <div className="admin-logo">
                    <img src="/zplus_black.png" alt="ZPluse" />
                    <span>Admin Central</span>
                </div>
                <nav className="admin-nav">
                    <button className={activeTab === 'dashboard' ? 'active' : ''} onClick={() => setActiveTab('dashboard')}>
                        <i className="fa-solid fa-gauge-high"></i> Dashboard
                    </button>
                    <button className={activeTab === 'articles' ? 'active' : ''} onClick={() => setActiveTab('articles')}>
                        <i className="fa-solid fa-file-pen"></i> All Articles
                    </button>
                    <button className={activeTab === 'videos' ? 'active' : ''} onClick={() => setActiveTab('videos')}>
                        <i className="fa-solid fa-play"></i> Video Sync
                    </button>
                    <button className={activeTab === 'settings' ? 'active' : ''} onClick={() => setActiveTab('settings')}>
                        <i className="fa-solid fa-sliders"></i> Settings
                    </button>
                </nav>
            </aside>

            <main className="admin-main">
                <header className="admin-header">
                    <div className="header-search">
                        <i className="fa-solid fa-magnifying-glass"></i>
                        <input type="text" placeholder="Search entries..." />
                    </div>
                    <div className="admin-user-flow">
                        <div className="notification-bell"><i className="fa-regular fa-bell"></i></div>
                        <div className="user-profile">
                            <div className="user-avatar">AM</div>
                            <span>Aryan Malik</span>
                        </div>
                    </div>
                </header>

                <div className="admin-content">
                    {error && <div className="admin-alert error">{error}</div>}
                    {successMessage && <div className="admin-alert success">{successMessage}</div>}

                    {activeTab === 'dashboard' && <DashboardTab />}
                    {activeTab === 'articles' && <ArticlesTab />}
                    {activeTab === 'videos' && (
                        <div className="admin-placeholder">
                            <i className="fa-solid fa-rotate"></i>
                            <h3>YouTube Engine is Active</h3>
                            <p>Videos are automatically synced from ZPluse News channel.</p>
                        </div>
                    )}
                </div>
            </main>

            {/* Article Modal */}
            <AnimatePresence>
                {isArticleModalOpen && (
                    <div className="modal-overlay">
                        <motion.div 
                            className="article-modal"
                            initial={{ opacity: 0, scale: 0.9 }}
                            animate={{ opacity: 1, scale: 1 }}
                            exit={{ opacity: 0, scale: 0.9 }}
                        >
                            <div className="modal-header">
                                <h3>{editingArticle ? 'Update Article' : 'Compose New Story'}</h3>
                                <button className="close-btn" onClick={() => setIsArticleModalOpen(false)}>×</button>
                            </div>
                            <form onSubmit={handleArticleSubmit} className="article-form">
                                <div className="form-grid">
                                    <div className="form-group full-width">
                                        <label>Headline</label>
                                        <input type="text" value={articleForm.title} onChange={e => setArticleForm({...articleForm, title: e.target.value})} required />
                                    </div>
                                    <div className="form-group">
                                        <label>Category</label>
                                        <select value={articleForm.category} onChange={e => setArticleForm({...articleForm, category: e.target.value})}>
                                            {categories.map(cat => <option key={cat} value={cat}>{cat}</option>)}
                                        </select>
                                    </div>
                                    <div className="form-group">
                                        <label>Author / Source</label>
                                        <input type="text" value={articleForm.author} onChange={e => setArticleForm({...articleForm, author: e.target.value})} />
                                    </div>
                                    <div className="form-group">
                                        <label>Featured Image URL</label>
                                        <input type="text" value={articleForm.image} onChange={e => setArticleForm({...articleForm, image: e.target.value})} placeholder="https://..." />
                                    </div>
                                    <div className="form-group">
                                        <label>YouTube Video ID (Optional)</label>
                                        <input type="text" value={articleForm.videoId} onChange={e => setArticleForm({...articleForm, videoId: e.target.value})} placeholder="e.g. dQw4w9WgXcQ" />
                                    </div>
                                    <div className="form-group full-width">
                                        <label>Article Content (HTML Supported)</label>
                                        <textarea value={articleForm.content} onChange={e => setArticleForm({...articleForm, content: e.target.value})} required rows="12"></textarea>
                                    </div>
                                    <div className="form-group">
                                        <label>SEO Title</label>
                                        <input type="text" value={articleForm.metaTitle} onChange={e => setArticleForm({...articleForm, metaTitle: e.target.value})} />
                                    </div>
                                    <div className="form-group">
                                        <label>SEO Description</label>
                                        <input type="text" value={articleForm.metaDescription} onChange={e => setArticleForm({...articleForm, metaDescription: e.target.value})} />
                                    </div>
                                </div>
                                <div className="form-footer">
                                    <button type="button" className="cancel-btn" onClick={() => setIsArticleModalOpen(false)}>Discard</button>
                                    <button type="submit" className="submit-btn" disabled={loading}>
                                        {loading ? 'Processing...' : (editingArticle ? 'Save Changes' : 'Publish News')}
                                    </button>
                                </div>
                            </form>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>
        </div>
    );
};

export default AdminPanel;
