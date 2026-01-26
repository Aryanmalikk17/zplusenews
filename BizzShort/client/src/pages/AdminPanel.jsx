import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { articlesAPI, videosAPI } from '../services/api';
import '../styles/admin.css';

export default function AdminPanel() {
    const navigate = useNavigate();
    const [activeTab, setActiveTab] = useState('articles');
    const [articles, setArticles] = useState([]);
    const [videos, setVideos] = useState([]);
    const [showCreateModal, setShowCreateModal] = useState(false);
    const [editingItem, setEditingItem] = useState(null);
    const [stats, setStats] = useState({
        totalArticles: 0,
        totalVideos: 0,
        byCategory: {}
    });

    // Categories organized by groups
    const categories = {
        special: [
            { value: 'positive', label: 'Positive News', icon: '🌟' },
            { value: 'fake-news', label: 'Fake News', icon: '🔍' }
        ],
        levels: [
            { value: 'international', label: 'International News', icon: '🌍' },
            { value: 'national', label: 'National News', icon: '🇮🇳' },
            { value: 'state', label: 'State News', icon: '📍' }
        ],
        interests: [
            { value: 'economics', label: 'Economics', icon: '💰' },
            { value: 'polity', label: 'Polity', icon: '🏛️' },
            { value: 'technology', label: 'Technology', icon: '💻' },
            { value: 'environment', label: 'Environment', icon: '🌱' },
            { value: 'sports', label: 'Sports', icon: '⚽' }
        ]
    };

    useEffect(() => {
        // Check authentication
        const token = localStorage.getItem('adminToken');
        if (!token) {
            navigate('/admin/login');
            return;
        }

        fetchContent();
    }, [navigate]);

    const fetchContent = async () => {
        try {
            const [articlesRes, videosRes] = await Promise.all([
                articlesAPI.getAll({ limit: 100 }),
                videosAPI.getAll({ limit: 100 })
            ]);

            const articlesData = articlesRes?.data || articlesRes || [];
            const videosData = videosRes?.data || videosRes || [];

            setArticles(Array.isArray(articlesData) ? articlesData : []);
            setVideos(Array.isArray(videosData) ? videosData : []);

            // Calculate stats
            const byCategory = {};
            articlesData.forEach(a => {
                byCategory[a.category] = (byCategory[a.category] || 0) + 1;
            });

            setStats({
                totalArticles: articlesData.length,
                totalVideos: videosData.length,
                byCategory
            });
        } catch (error) {
            console.error('Error fetching content:', error);
        }
    };

    const handleLogout = () => {
        localStorage.removeItem('adminToken');
        navigate('/admin/login');
    };

    return (
        <div className="admin-panel">
            {/* Header */}
            <header className="admin-header">
                <div className="admin-header-content">
                    <h1>📰 ZPlusNews Admin Panel</h1>
                    <button onClick={handleLogout} className="btn-logout">
                        Logout
                    </button>
                </div>
            </header>

            {/* Dashboard Stats */}
            <section className="admin-stats">
                <div className="stat-card">
                    <div className="stat-icon">📝</div>
                    <div className="stat-info">
                        <h3>{stats.totalArticles}</h3>
                        <p>Total Articles</p>
                    </div>
                </div>
                <div className="stat-card">
                    <div className="stat-icon">🎬</div>
                    <div className="stat-info">
                        <h3>{stats.totalVideos}</h3>
                        <p>Total Videos</p>
                    </div>
                </div>
                <div className="stat-card">
                    <div className="stat-icon">📊</div>
                    <div className="stat-info">
                        <h3>{Object.keys(stats.byCategory).length}</h3>
                        <p>Active Categories</p>
                    </div>
                </div>
                <div className="stat-card">
                    <div className="stat-icon">✅</div>
                    <div className="stat-info">
                        <h3>{stats.totalArticles + stats.totalVideos}</h3>
                        <p>Total Content</p>
                    </div>
                </div>
            </section>

            {/* Tabs */}
            <div className="admin-tabs">
                <button
                    className={`tab ${activeTab === 'articles' ? 'active' : ''}`}
                    onClick={() => setActiveTab('articles')}
                >
                    📝 Articles
                </button>
                <button
                    className={`tab ${activeTab === 'videos' ? 'active' : ''}`}
                    onClick={() => setActiveTab('videos')}
                >
                    🎬 Videos
                </button>
                <button
                    className={`tab ${activeTab === 'analytics' ? 'active' : ''}`}
                    onClick={() => setActiveTab('analytics')}
                >
                    📊 Analytics
                </button>
            </div>

            {/* Content Area */}
            <div className="admin-content">
                {activeTab === 'articles' && (
                    <ArticlesTab
                        articles={articles}
                        categories={categories}
                        onRefresh={fetchContent}
                        setShowCreateModal={setShowCreateModal}
                        setEditingItem={setEditingItem}
                    />
                )}

                {activeTab === 'videos' && (
                    <VideosTab
                        videos={videos}
                        categories={categories}
                        onRefresh={fetchContent}
                        setShowCreateModal={setShowCreateModal}
                        setEditingItem={setEditingItem}
                    />
                )}

                {activeTab === 'analytics' && (
                    <AnalyticsTab stats={stats} categories={categories} />
                )}
            </div>

            {/* Create/Edit Modal */}
            {showCreateModal && (
                <ContentModal
                    type={activeTab === 'articles' ? 'article' : 'video'}
                    categories={categories}
                    editingItem={editingItem}
                    onClose={() => {
                        setShowCreateModal(false);
                        setEditingItem(null);
                    }}
                    onSuccess={() => {
                        setShowCreateModal(false);
                        setEditingItem(null);
                        fetchContent();
                    }}
                />
            )}
        </div>
    );
}

// Articles Tab Component
function ArticlesTab({ articles, categories, onRefresh, setShowCreateModal, setEditingItem }) {
    const [filterCategory, setFilterCategory] = useState('all');

    const filteredArticles = filterCategory === 'all'
        ? articles
        : articles.filter(a => a.category === filterCategory);

    const handleDelete = async (id) => {
        if (!window.confirm('Are you sure you want to delete this article?')) return;

        try {
            await articlesAPI.delete(id);
            onRefresh();
        } catch (error) {
            alert('Failed to delete article');
        }
    };

    return (
        <div className="content-tab">
            <div className="tab-header">
                <div className="tab-actions">
                    <select
                        value={filterCategory}
                        onChange={(e) => setFilterCategory(e.target.value)}
                        className="filter-select"
                    >
                        <option value="all">All Categories</option>
                        <optgroup label="📌 Special">
                            {categories.special.map(cat => (
                                <option key={cat.value} value={cat.value}>
                                    {cat.icon} {cat.label}
                                </option>
                            ))}
                        </optgroup>
                        <optgroup label="🌐 Levels">
                            {categories.levels.map(cat => (
                                <option key={cat.value} value={cat.value}>
                                    {cat.icon} {cat.label}
                                </option>
                            ))}
                        </optgroup>
                        <optgroup label="🎯 Interests">
                            {categories.interests.map(cat => (
                                <option key={cat.value} value={cat.value}>
                                    {cat.icon} {cat.label}
                                </option>
                            ))}
                        </optgroup>
                    </select>
                </div>
                <button
                    onClick={() => {
                        setEditingItem(null);
                        setShowCreateModal(true);
                    }}
                    className="btn-primary"
                >
                    + Create Article
                </button>
            </div>

            <div className="content-table">
                <table>
                    <thead>
                        <tr>
                            <th>Title</th>
                            <th>Category</th>
                            <th>Author</th>
                            <th>Date</th>
                            <th>Views</th>
                            <th>Actions</th>
                        </tr>
                    </thead>
                    <tbody>
                        {filteredArticles.map(article => (
                            <tr key={article._id}>
                                <td className="title-cell">
                                    <div className="article-title">{article.title}</div>
                                </td>
                                <td>
                                    <span className={`category-badge ${article.category}`}>
                                        {article.category}
                                    </span>
                                </td>
                                <td>{article.author || 'Unknown'}</td>
                                <td>{new Date(article.createdAt || article.date).toLocaleDateString()}</td>
                                <td>{article.views || 0}</td>
                                <td>
                                    <div className="action-buttons">
                                        <button
                                            onClick={() => {
                                                setEditingItem(article);
                                                setShowCreateModal(true);
                                            }}
                                            className="btn-edit"
                                            title="Edit"
                                        >
                                            ✏️
                                        </button>
                                        <button
                                            onClick={() => handleDelete(article._id)}
                                            className="btn-delete"
                                            title="Delete"
                                        >
                                            🗑️
                                        </button>
                                    </div>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>

                {filteredArticles.length === 0 && (
                    <div className="empty-state">
                        <p>No articles found</p>
                    </div>
                )}
            </div>
        </div>
    );
}

// Videos Tab Component  
function VideosTab({ videos, categories, onRefresh, setShowCreateModal, setEditingItem }) {
    const [filterCategory, setFilterCategory] = useState('all');

    const filteredVideos = filterCategory === 'all'
        ? videos
        : videos.filter(v => v.category === filterCategory);

    const handleDelete = async (id) => {
        if (!window.confirm('Are you sure you want to delete this video?')) return;

        try {
            await videosAPI.delete(id);
            onRefresh();
        } catch (error) {
            alert('Failed to delete video');
        }
    };

    return (
        <div className="content-tab">
            <div className="tab-header">
                <div className="tab-actions">
                    <select
                        value={filterCategory}
                        onChange={(e) => setFilterCategory(e.target.value)}
                        className="filter-select"
                    >
                        <option value="all">All Categories</option>
                        <optgroup label="📌 Special">
                            {categories.special.map(cat => (
                                <option key={cat.value} value={cat.value}>
                                    {cat.icon} {cat.label}
                                </option>
                            ))}
                        </optgroup>
                        <optgroup label="🌐 Levels">
                            {categories.levels.map(cat => (
                                <option key={cat.value} value={cat.value}>
                                    {cat.icon} {cat.label}
                                </option>
                            ))}
                        </optgroup>
                        <optgroup label="🎯 Interests">
                            {categories.interests.map(cat => (
                                <option key={cat.value} value={cat.value}>
                                    {cat.icon} {cat.label}
                                </option>
                            ))}
                        </optgroup>
                    </select>
                </div>
                <button
                    onClick={() => {
                        setEditingItem(null);
                        setShowCreateModal(true);
                    }}
                    className="btn-primary"
                >
                    + Create Video
                </button>
            </div>

            <div className="content-table">
                <table>
                    <thead>
                        <tr>
                            <th>Title</th>
                            <th>Category</th>
                            <th>Duration</th>
                            <th>Date</th>
                            <th>Views</th>
                            <th>Actions</th>
                        </tr>
                    </thead>
                    <tbody>
                        {filteredVideos.map(video => (
                            <tr key={video._id}>
                                <td className="title-cell">
                                    <div className="article-title">{video.title}</div>
                                </td>
                                <td>
                                    <span className={`category-badge ${video.category}`}>
                                        {video.category}
                                    </span>
                                </td>
                                <td>{video.duration || 'N/A'}</td>
                                <td>{new Date(video.createdAt).toLocaleDateString()}</td>
                                <td>{video.views || 0}</td>
                                <td>
                                    <div className="action-buttons">
                                        <button
                                            onClick={() => {
                                                setEditingItem(video);
                                                setShowCreateModal(true);
                                            }}
                                            className="btn-edit"
                                            title="Edit"
                                        >
                                            ✏️
                                        </button>
                                        <button
                                            onClick={() => handleDelete(video._id)}
                                            className="btn-delete"
                                            title="Delete"
                                        >
                                            🗑️
                                        </button>
                                    </div>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>

                {filteredVideos.length === 0 && (
                    <div className="empty-state">
                        <p>No videos found</p>
                    </div>
                )}
            </div>
        </div>
    );
}

// Analytics Tab Component
function AnalyticsTab({ stats, categories }) {
    const allCategories = [...categories.special, ...categories.levels, ...categories.interests];

    return (
        <div className="content-tab analytics-tab">
            <h2>Content by Category</h2>
            <div className="analytics-grid">
                {allCategories.map(cat => {
                    const count = stats.byCategory[cat.value] || 0;
                    return (
                        <div key={cat.value} className="analytics-card">
                            <div className="analytics-icon">{cat.icon}</div>
                            <h3>{cat.label}</h3>
                            <p className="analytics-count">{count} articles</p>
                            <div className="analytics-bar">
                                <div
                                    className="analytics-bar-fill"
                                    style={{
                                        width: `${(count / stats.totalArticles) * 100}%`,
                                        maxWidth: '100%'
                                    }}
                                ></div>
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
    );
}

// Content Modal Component
function ContentModal({ type, categories, editingItem, onClose, onSuccess }) {
    const allCategories = [...categories.special, ...categories.levels, ...categories.interests];
    const [formData, setFormData] = useState({
        title: editingItem?.title || '',
        category: editingItem?.category || '',
        content: editingItem?.content || '',
        excerpt: editingItem?.excerpt || '',
        image: editingItem?.image || '',
        author: editingItem?.author || '',
        tags: editingItem?.tags?.join(', ') || '',
        videoUrl: editingItem?.videoUrl || '',
        duration: editingItem?.duration || ''
    });

    const [loading, setLoading] = useState(false);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);

        try {
            const data = {
                ...formData,
                tags: formData.tags.split(',').map(t => t.trim()).filter(Boolean)
            };

            if (type === 'article') {
                if (editingItem) {
                    await articlesAPI.update(editingItem._id, data);
                } else {
                    await articlesAPI.create(data);
                }
            } else {
                if (editingItem) {
                    await videosAPI.update(editingItem._id, data);
                } else {
                    await videosAPI.create(data);
                }
            }

            onSuccess();
        } catch (error) {
            alert(`Failed to ${editingItem ? 'update' : 'create'} ${type}`);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="modal-overlay" onClick={onClose}>
            <div className="modal-content" onClick={(e) => e.stopPropagation()}>
                <div className="modal-header">
                    <h2>{editingItem ? 'Edit' : 'Create'} {type === 'article' ? 'Article' : 'Video'}</h2>
                    <button onClick={onClose} className="modal-close">×</button>
                </div>

                <form onSubmit={handleSubmit} className="modal-form">
                    <div className="form-group">
                        <label>Title *</label>
                        <input
                            type="text"
                            value={formData.title}
                            onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                            required
                        />
                    </div>

                    <div className="form-group">
                        <label>Category *</label>
                        <select
                            value={formData.category}
                            onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                            required
                        >
                            <option value="">Select Category</option>
                            <optgroup label="📌 Special Categories">
                                {categories.special.map(cat => (
                                    <option key={cat.value} value={cat.value}>
                                        {cat.icon} {cat.label}
                                    </option>
                                ))}
                            </optgroup>
                            <optgroup label="🌐 Level-Based News">
                                {categories.levels.map(cat => (
                                    <option key={cat.value} value={cat.value}>
                                        {cat.icon} {cat.label}
                                    </option>
                                ))}
                            </optgroup>
                            <optgroup label="🎯 Interest-Based Categories">
                                {categories.interests.map(cat => (
                                    <option key={cat.value} value={cat.value}>
                                        {cat.icon} {cat.label}
                                    </option>
                                ))}
                            </optgroup>
                        </select>
                    </div>

                    {type === 'article' ? (
                        <>
                            <div className="form-group">
                                <label>Excerpt</label>
                                <textarea
                                    value={formData.excerpt}
                                    onChange={(e) => setFormData({ ...formData, excerpt: e.target.value })}
                                    rows="2"
                                />
                            </div>

                            <div className="form-group">
                                <label>Content *</label>
                                <textarea
                                    value={formData.content}
                                    onChange={(e) => setFormData({ ...formData, content: e.target.value })}
                                    rows="6"
                                    required
                                />
                            </div>

                            <div className="form-group">
                                <label>Image URL</label>
                                <input
                                    type="url"
                                    value={formData.image}
                                    onChange={(e) => setFormData({ ...formData, image: e.target.value })}
                                    placeholder="https://example.com/image.jpg"
                                />
                            </div>

                            <div className="form-group">
                                <label>Author</label>
                                <input
                                    type="text"
                                    value={formData.author}
                                    onChange={(e) => setFormData({ ...formData, author: e.target.value })}
                                    placeholder="Author Name"
                                />
                            </div>

                            <div className="form-group">
                                <label>Tags (comma-separated)</label>
                                <input
                                    type="text"
                                    value={formData.tags}
                                    onChange={(e) => setFormData({ ...formData, tags: e.target.value })}
                                    placeholder="tag1, tag2, tag3"
                                />
                            </div>
                        </>
                    ) : (
                        <>
                            <div className="form-group">
                                <label>Video URL *</label>
                                <input
                                    type="url"
                                    value={formData.videoUrl}
                                    onChange={(e) => setFormData({ ...formData, videoUrl: e.target.value })}
                                    placeholder="https://youtube.com/watch?v=..."
                                    required
                                />
                            </div>

                            <div className="form-group">
                                <label>Thumbnail URL</label>
                                <input
                                    type="url"
                                    value={formData.image}
                                    onChange={(e) => setFormData({ ...formData, image: e.target.value })}
                                    placeholder="https://example.com/thumbnail.jpg"
                                />
                            </div>

                            <div className="form-group">
                                <label>Duration</label>
                                <input
                                    type="text"
                                    value={formData.duration}
                                    onChange={(e) => setFormData({ ...formData, duration: e.target.value })}
                                    placeholder="10:30"
                                />
                            </div>
                        </>
                    )}

                    <div className="form-actions">
                        <button type="button" onClick={onClose} className="btn-secondary">
                            Cancel
                        </button>
                        <button type="submit" className="btn-primary" disabled={loading}>
                            {loading ? 'Saving...' : (editingItem ? 'Update' : 'Create')}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}
