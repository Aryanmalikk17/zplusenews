import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { articlesAPI, videosAPI, adminAPI } from '../services/api';
import '../styles/admin.css';

export default function AdminPanel() {
    const navigate = useNavigate();
    const [isAuthenticated, setIsAuthenticated] = useState(false);
    const [isLoading, setIsLoading] = useState(true);
    const [activeTab, setActiveTab] = useState('articles');
    const [articles, setArticles] = useState([]);
    const [videos, setVideos] = useState([]);
    const [showCreateModal, setShowCreateModal] = useState(false);
    const [showPasswordModal, setShowPasswordModal] = useState(false);
    const [editingItem, setEditingItem] = useState(null);
    const [stats, setStats] = useState({
        totalArticles: 0,
        totalVideos: 0,
        byCategory: {}
    });

    // Categories — 'positive' removed; must stay in sync with Mongoose enums
    const categories = {
        special: [
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
        // Cookie-based auth: verify session by checking API health with credentials
        // adminUser in localStorage is just a UI hint — the real auth is the httpOnly cookie
        const adminUser = localStorage.getItem('adminUser');
        if (!adminUser) {
            navigate('/admin/login');
            return;
        }
        setIsAuthenticated(true);
        fetchContent();
    }, [navigate]);

    const fetchContent = async () => {
        setIsLoading(true);
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
        } finally {
            setIsLoading(false);
        }
    };

    const handleLogout = async () => {
        try {
            // Clear the httpOnly cookie on the server
            await adminAPI.logout();
        } catch {
            // Proceed even if the server call fails
        }
        localStorage.removeItem('adminUser');
        navigate('/admin/login');
    };

    // Show loading while checking auth
    if (!isAuthenticated) {
        return (
            <div className="admin-loading">
                <div className="spinner"></div>
                <p>Checking authentication...</p>
            </div>
        );
    }

    return (
        <div className="admin-panel">
            {/* Header */}
            <header className="admin-header">
                <div className="admin-header-content">
                    <img src="/assets/images/logo.png" alt="ZPluse News" className="admin-header-logo" />
                    <h1>📰 ZPlusNews Admin Panel</h1>
                    <div className="header-actions">
                        <button onClick={() => setShowPasswordModal(true)} className="btn-secondary">
                            🔑 Change Password
                        </button>
                        <button onClick={handleLogout} className="btn-logout">
                            Logout
                        </button>
                    </div>
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
                    <AnalyticsTab stats={stats} categories={categories} articles={articles} videos={videos} />
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

            {/* Password Modal */}
            {showPasswordModal && (
                <PasswordModal onClose={() => setShowPasswordModal(false)} />
            )}
        </div>
    );
}

// Password Modal Component
function PasswordModal({ onClose }) {
    const [formData, setFormData] = useState({
        currentPassword: '',
        newPassword: '',
        confirmPassword: ''
    });
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');
        setSuccess('');

        if (formData.newPassword !== formData.confirmPassword) {
            setError('New passwords do not match');
            return;
        }

        if (formData.newPassword.length < 8) {
            setError('Password must be at least 8 characters');
            return;
        }

        setLoading(true);

        try {
            const res = await adminAPI.changePassword({
                currentPassword: formData.currentPassword,
                newPassword: formData.newPassword
            });

            setSuccess(res.message || 'Password updated successfully');
            setFormData({ currentPassword: '', newPassword: '', confirmPassword: '' });
            setTimeout(() => {
                onClose();
            }, 2000);
        } catch (err) {
            setError(err.response?.data?.error || 'Failed to update password');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="modal-overlay" onClick={onClose}>
            <div className="modal-content password-modal" onClick={e => e.stopPropagation()}>
                <div className="modal-header">
                    <h2>🔑 Change Password</h2>
                    <button onClick={onClose} className="modal-close">×</button>
                </div>

                <form onSubmit={handleSubmit} className="modal-form">
                    {error && <div className="login-error">{error}</div>}
                    {success && <div className="add-message add-success" style={{ marginBottom: '20px' }}>{success}</div>}

                    <div className="form-group">
                        <label>Current Password</label>
                        <input
                            type="password"
                            value={formData.currentPassword}
                            onChange={e => setFormData({ ...formData, currentPassword: e.target.value })}
                            required
                        />
                    </div>

                    <div className="form-group">
                        <label>New Password (min 8 chars)</label>
                        <input
                            type="password"
                            value={formData.newPassword}
                            onChange={e => setFormData({ ...formData, newPassword: e.target.value })}
                            required
                        />
                    </div>

                    <div className="form-group">
                        <label>Confirm New Password</label>
                        <input
                            type="password"
                            value={formData.confirmPassword}
                            onChange={e => setFormData({ ...formData, confirmPassword: e.target.value })}
                            required
                        />
                    </div>

                    <div className="modal-actions">
                        <button type="button" onClick={onClose} className="btn-cancel" disabled={loading}>
                            Cancel
                        </button>
                        <button type="submit" className="btn-save" disabled={loading}>
                            {loading ? 'Updating...' : 'Update Password'}
                        </button>
                    </div>
                </form>
            </div>
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
        console.log('Attempting to delete article with ID:', id);

        try {
            await articlesAPI.delete(id);
            console.log('Delete successful');
            onRefresh();
        } catch (error) {
            console.error('Delete failed:', error);
            alert(`Failed to delete article: ${error.response?.data?.message || error.message}`);
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
                                <td>{typeof article.author === 'object' ? article.author?.name : article.author || 'Unknown'}</td>
                                <td>{new Date(article.publishedAt || article.createdAt || Date.now()).toLocaleDateString()}</td>
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
    const [youtubeInput, setYoutubeInput] = useState('');
    const [addCategory, setAddCategory] = useState('general');
    const [addLoading, setAddLoading] = useState(false);
    const [addError, setAddError] = useState('');
    const [addSuccess, setAddSuccess] = useState('');
    const [transcribingId, setTranscribingId] = useState(null);
    const [syncing, setSyncing] = useState(false);
    const [syncMessage, setSyncMessage] = useState('');
    const [transcribingAll, setTranscribingAll] = useState(false);
    const [transcribeAllMsg, setTranscribeAllMsg] = useState('');

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

    const handleAddById = async (e) => {
        e.preventDefault();
        if (!youtubeInput.trim()) return;

        setAddLoading(true);
        setAddError('');
        setAddSuccess('');

        try {
            const res = await videosAPI.addById(youtubeInput.trim(), addCategory);
            const data = res?.data || res;
            setAddSuccess(`Video "${data.video?.title || 'Video'}" added successfully!`);
            setYoutubeInput('');
            onRefresh();

            setTimeout(() => setAddSuccess(''), 5000);
        } catch (error) {
            const msg = error.response?.data?.error || error.message || 'Failed to add video';
            setAddError(msg);
            setTimeout(() => setAddError(''), 5000);
        } finally {
            setAddLoading(false);
        }
    };

    const handleTranscribe = async (videoId) => {
        setTranscribingId(videoId);

        try {
            await videosAPI.transcribe(videoId);
            alert('Transcription complete! Article content generated.');
            onRefresh();
        } catch (error) {
            const msg = error.response?.data?.error || error.message || 'Transcription failed';
            alert(`Transcription error: ${msg}`);
        } finally {
            setTranscribingId(null);
        }
    };

    const handleSyncChannel = async () => {
        if (!window.confirm('Import ALL videos from the ZPluse News YouTube channel?')) return;
        setSyncing(true);
        setSyncMessage('');
        try {
            const res = await videosAPI.syncChannel('@zplusenews', addCategory);
            const data = res?.data || res;
            setSyncMessage(`✅ ${data.message || 'Sync complete!'} (${data.imported || 0} new, ${data.skipped || 0} existing)`);
            onRefresh();
        } catch (error) {
            const msg = error.response?.data?.error || error.message || 'Sync failed';
            setSyncMessage(`❌ ${msg}`);
        } finally {
            setSyncing(false);
            setTimeout(() => setSyncMessage(''), 8000);
        }
    };

    const handleTranscribeAll = async () => {
        // Find videos that don't have transcripts yet
        const untranscribed = videos.filter(v => v.source === 'youtube' && !v.transcript);
        if (untranscribed.length === 0) {
            setTranscribeAllMsg('✅ All videos already have transcripts!');
            setTimeout(() => setTranscribeAllMsg(''), 5000);
            return;
        }
        if (!window.confirm(`Transcribe ${untranscribed.length} videos without transcripts? This will process them one by one.`)) return;

        setTranscribingAll(true);
        setTranscribeAllMsg('');
        let success = 0;
        let failed = 0;

        for (let i = 0; i < untranscribed.length; i++) {
            const v = untranscribed[i];
            setTranscribeAllMsg(`⏳ Transcribing ${i + 1}/${untranscribed.length}: "${v.title?.slice(0, 40)}..."`);
            try {
                await videosAPI.transcribe(v._id);
                success++;
            } catch {
                failed++;
            }
        }

        setTranscribeAllMsg(`✅ Done! ${success} transcribed, ${failed} failed.`);
        setTranscribingAll(false);
        onRefresh();
        setTimeout(() => setTranscribeAllMsg(''), 10000);
    };

    return (
        <div className="content-tab">
            {/* Add Video by YouTube ID */}
            <div className="add-by-id-section">
                <h3 className="section-label">📺 Add Video by YouTube Link / ID</h3>
                <form onSubmit={handleAddById} className="add-by-id-form">
                    <input
                        type="text"
                        value={youtubeInput}
                        onChange={(e) => setYoutubeInput(e.target.value)}
                        placeholder="Paste YouTube URL or Video ID (e.g. dQw4w9WgXcQ)"
                        className="input-youtube-id"
                        disabled={addLoading}
                    />
                    <select
                        value={addCategory}
                        onChange={(e) => setAddCategory(e.target.value)}
                        className="filter-select"
                        disabled={addLoading}
                    >
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
                    <button
                        type="submit"
                        className="btn-primary"
                        disabled={addLoading || !youtubeInput.trim()}
                    >
                        {addLoading ? '⏳ Adding...' : '+ Add Video'}
                    </button>
                </form>
                {addError && <p className="add-message add-error">❌ {addError}</p>}
                {addSuccess && <p className="add-message add-success">✅ {addSuccess}</p>}
            </div>

            {/* Channel Sync Actions */}
            <div style={{ display: 'flex', gap: '12px', marginBottom: '24px', flexWrap: 'wrap', alignItems: 'center' }}>
                <button
                    onClick={handleSyncChannel}
                    className="btn-primary"
                    disabled={syncing}
                    style={{ background: 'linear-gradient(135deg, #ff0000, #cc0000)' }}
                >
                    {syncing ? '⏳ Syncing Channel...' : '🔄 Sync All Videos from @zplusenews'}
                </button>
                <button
                    onClick={handleTranscribeAll}
                    className="btn-transcribe"
                    disabled={transcribingAll}
                    style={{ padding: '12px 24px', fontSize: '14px' }}
                >
                    {transcribingAll ? '⏳ Transcribing All...' : '🎙️ Transcribe All Videos'}
                </button>
                {syncMessage && <span style={{ fontWeight: 600, fontSize: '14px' }}>{syncMessage}</span>}
                {transcribeAllMsg && <span style={{ fontWeight: 600, fontSize: '14px' }}>{transcribeAllMsg}</span>}
            </div>

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
                            <th>Transcript</th>
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
                                    {video.transcript ? (
                                        <span className="status-badge status-done">✅ Done</span>
                                    ) : (
                                        <button
                                            onClick={() => handleTranscribe(video._id)}
                                            className="btn-transcribe"
                                            disabled={transcribingId === video._id}
                                            title="Generate article from video audio"
                                        >
                                            {transcribingId === video._id ? '⏳ ...' : '🎙️ Transcribe'}
                                        </button>
                                    )}
                                </td>
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
function AnalyticsTab({ stats, categories, articles, videos }) {
    const allCategories = [...categories.special, ...categories.levels, ...categories.interests];

    // Calculate per-category video counts
    const videosByCategory = {};
    (videos || []).forEach(v => {
        videosByCategory[v.category] = (videosByCategory[v.category] || 0) + 1;
    });

    const totalViews = [...(articles || []), ...(videos || [])].reduce(
        (sum, item) => sum + (parseInt(item.views) || 0), 0
    );

    return (
        <div className="content-tab analytics-tab">
            <div className="analytics-summary" style={{ display: 'flex', gap: '16px', marginBottom: '32px', flexWrap: 'wrap' }}>
                <div className="stat-card"><div className="stat-icon">👁️</div><div className="stat-info"><h3>{totalViews.toLocaleString()}</h3><p>Total Views</p></div></div>
                <div className="stat-card"><div className="stat-icon">📝</div><div className="stat-info"><h3>{stats.totalArticles}</h3><p>Articles</p></div></div>
                <div className="stat-card"><div className="stat-icon">🎬</div><div className="stat-info"><h3>{stats.totalVideos}</h3><p>Videos</p></div></div>
                <div className="stat-card"><div className="stat-icon">📦</div><div className="stat-info"><h3>{stats.totalArticles + stats.totalVideos}</h3><p>Total Content</p></div></div>
            </div>

            <h2>Content by Category</h2>
            <div className="analytics-grid">
                {allCategories.map(cat => {
                    const artCount = stats.byCategory[cat.value] || 0;
                    const vidCount = videosByCategory[cat.value] || 0;
                    const total = artCount + vidCount;
                    const maxTotal = stats.totalArticles + stats.totalVideos || 1;
                    return (
                        <div key={cat.value} className="analytics-card">
                            <div className="analytics-icon">{cat.icon}</div>
                            <h3>{cat.label}</h3>
                            <p className="analytics-count">
                                {artCount} articles · {vidCount} videos
                            </p>
                            <div className="analytics-bar">
                                <div
                                    className="analytics-bar-fill"
                                    style={{
                                        width: `${(total / maxTotal) * 100}%`,
                                        maxWidth: '100%'
                                    }}
                                />
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
        image: editingItem?.image || editingItem?.thumbnail || '',
        author: typeof editingItem?.author === 'object' ? editingItem?.author?.name || '' : editingItem?.author || '',
        tags: editingItem?.tags?.join(', ') || '',
        videoUrl: editingItem?.videoUrl || (editingItem?.videoId ? `https://www.youtube.com/watch?v=${editingItem.videoId}` : ''),
        duration: editingItem?.duration || '',
        description: editingItem?.description || '',
        publishedAt: editingItem?.publishedAt
            ? new Date(editingItem.publishedAt).toISOString().slice(0, 16)
            : new Date().toISOString().slice(0, 16),
    });

    const [loading, setLoading] = useState(false);

    // Extract YouTube video ID from URL for preview
    const getYouTubeId = (url) => {
        if (!url) return null;
        const str = String(url).trim();
        try {
            const parsed = new URL(str);
            if (parsed.searchParams.get('v')) return parsed.searchParams.get('v');
            const parts = parsed.pathname.split('/').filter(Boolean);
            if (parts.length > 0) return parts[parts.length - 1];
        } catch {
            if (/^[a-zA-Z0-9_-]{10,12}$/.test(str)) return str;
        }
        return null;
    };

    const youtubeId = getYouTubeId(formData.videoUrl);
    const autoThumbnail = youtubeId ? `https://img.youtube.com/vi/${youtubeId}/maxresdefault.jpg` : '';

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);

        try {
            const data = {
                ...formData,
                tags: formData.tags.split(',').map(t => t.trim()).filter(Boolean),
                // Use auto-generated thumbnail if none provided
                image: formData.image || autoThumbnail,
                thumbnail: formData.image || autoThumbnail,
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
                    <h2>{editingItem ? '✏️ Edit' : '➕ Create'} {type === 'article' ? 'Article' : 'Video'}</h2>
                    <button onClick={onClose} className="modal-close">×</button>
                </div>

                <form onSubmit={handleSubmit} className="modal-form">
                    {/* Title */}
                    <div className="form-group">
                        <label>Title *</label>
                        <input
                            type="text"
                            value={formData.title}
                            onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                            placeholder="Enter a descriptive title"
                            required
                        />
                    </div>

                    {/* Category */}
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
                                <label>Published Date & Time</label>
                                <input
                                    type="datetime-local"
                                    value={formData.publishedAt}
                                    onChange={(e) => setFormData({ ...formData, publishedAt: e.target.value })}
                                />
                            </div>

                            <div className="form-group">
                                <label>Excerpt</label>
                                <textarea
                                    value={formData.excerpt}
                                    onChange={(e) => setFormData({ ...formData, excerpt: e.target.value })}
                                    rows="2"
                                    placeholder="Brief summary of the article"
                                />
                            </div>

                            <div className="form-group">
                                <label>Content *</label>
                                <textarea
                                    value={formData.content}
                                    onChange={(e) => setFormData({ ...formData, content: e.target.value })}
                                    rows="6"
                                    required
                                    placeholder="Full article content (supports HTML)"
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
                            {/* Video URL with live preview */}
                            <div className="form-group">
                                <label>Video URL *</label>
                                <input
                                    type="text"
                                    value={formData.videoUrl}
                                    onChange={(e) => setFormData({ ...formData, videoUrl: e.target.value })}
                                    placeholder="https://youtube.com/watch?v=... or video ID"
                                    required
                                />
                                {youtubeId && (
                                    <div className="video-preview-section">
                                        <div className="video-preview-thumb">
                                            <img
                                                src={autoThumbnail}
                                                alt="Video Preview"
                                                onError={(e) => { e.target.src = `https://img.youtube.com/vi/${youtubeId}/hqdefault.jpg`; }}
                                            />
                                            <div className="preview-play-icon">▶</div>
                                        </div>
                                        <div className="video-preview-info">
                                            <span className="video-id-badge">
                                                🎬 YouTube ID: <code>{youtubeId}</code>
                                            </span>
                                            <a
                                                href={`https://www.youtube.com/watch?v=${youtubeId}`}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                className="preview-link"
                                            >
                                                Open in YouTube ↗
                                            </a>
                                        </div>
                                    </div>
                                )}
                            </div>

                            {/* Description */}
                            <div className="form-group">
                                <label>Description</label>
                                <textarea
                                    value={formData.description}
                                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                                    rows="3"
                                    placeholder="Video description or summary"
                                />
                            </div>

                            {/* Thumbnail + Duration in grid row */}
                            <div className="form-row">
                                <div className="form-group">
                                    <label>Thumbnail URL</label>
                                    <input
                                        type="url"
                                        value={formData.image}
                                        onChange={(e) => setFormData({ ...formData, image: e.target.value })}
                                        placeholder={autoThumbnail ? 'Auto-generated from YouTube' : 'https://example.com/thumb.jpg'}
                                    />
                                    {!formData.image && autoThumbnail && (
                                        <span className="form-hint">💡 Auto-generated from YouTube URL</span>
                                    )}
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
                            </div>

                            {/* Tags */}
                            <div className="form-group">
                                <label>Tags (comma-separated)</label>
                                <input
                                    type="text"
                                    value={formData.tags}
                                    onChange={(e) => setFormData({ ...formData, tags: e.target.value })}
                                    placeholder="news, politics, breaking"
                                />
                            </div>
                        </>
                    )}

                    <div className="form-actions">
                        <button type="button" onClick={onClose} className="btn-secondary">
                            Cancel
                        </button>
                        <button type="submit" className="btn-primary" disabled={loading}>
                            {loading ? '⏳ Saving...' : (editingItem ? '✅ Update' : '➕ Create')}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}
