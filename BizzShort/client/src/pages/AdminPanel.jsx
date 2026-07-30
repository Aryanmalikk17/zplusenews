import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { articlesAPI, videosAPI, adminAPI, adsAPI } from '../services/api';
import '../styles/admin.css';

export default function AdminPanel() {
    const navigate = useNavigate();
    const [isAuthenticated, setIsAuthenticated] = useState(false);
    const [isLoading, setIsLoading] = useState(true);
    const [activeTab, setActiveTab] = useState('articles');
    const [articles, setArticles] = useState([]);
    const [videos, setVideos] = useState([]);
    const [ads, setAds] = useState([]);
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
            { value: 'sports', label: 'Sports', icon: '⚽' },
            { value: 'health', label: 'Health', icon: '🏥' },
            { value: 'defence', label: 'Defence', icon: '🛡️' },
            { value: 'culture', label: 'Culture', icon: '🎨' },
            { value: 'spirituality', label: 'Spirituality', icon: '🧘' },
            { value: 'agriculture', label: 'Agriculture', icon: '🌾' },
            { value: 'geography', label: 'Geography', icon: '🗺️' },
            { value: 'religion', label: 'Religion', icon: '📿' },
            { value: 'ai', label: 'AI', icon: '🤖' }
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
            const [articlesRes, videosRes, adsRes] = await Promise.all([
                articlesAPI.getAll({ limit: 100 }),
                videosAPI.getAll({ limit: 100 }),
                adsAPI.getAll()
            ]);

            const articlesData = articlesRes?.data || articlesRes || [];
            const videosData = videosRes?.data || videosRes || [];
            const adsData = adsRes?.data || adsRes || [];

            setArticles(Array.isArray(articlesData) ? articlesData : []);
            setVideos(Array.isArray(videosData) ? videosData : []);
            setAds(Array.isArray(adsData) ? adsData : []);

            // Calculate stats
            const byCategory = {};
            articlesData.forEach(a => {
                byCategory[a.category] = (byCategory[a.category] || 0) + 1;
            });

            setStats({
                totalArticles: articlesData.length,
                totalVideos: videosData.length,
                totalAds: adsData.length,
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
                    <img src="/assets/images/logo.png" alt="ZPlus News" className="admin-header-logo" />
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
                    <div className="stat-icon">📢</div>
                    <div className="stat-info">
                        <h3>{stats.totalAds || 0}</h3>
                        <p>Sponsor Ads</p>
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
                    className={`tab ${activeTab === 'ads' ? 'active' : ''}`}
                    onClick={() => setActiveTab('ads')}
                >
                    📢 Sponsor Ads
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

                {activeTab === 'ads' && (
                    <AdsTab
                        ads={ads}
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
            {showCreateModal && activeTab !== 'ads' && (
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

            {showCreateModal && activeTab === 'ads' && (
                <AdModal
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
        if (!window.confirm('Import ALL videos from the ZPlus News YouTube channel?')) return;
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
        authorAvatar: typeof editingItem?.author === 'object' ? editingItem?.author?.avatar || '' : '',
        authorBio: typeof editingItem?.author === 'object' ? editingItem?.author?.bio || '' : '',
        authorLinkedin: typeof editingItem?.author === 'object' ? editingItem?.author?.linkedin || '' : '',
        authorTwitter: typeof editingItem?.author === 'object' ? editingItem?.author?.twitter || '' : '',
        tags: editingItem?.tags?.join(', ') || '',
        videoUrl: editingItem?.videoUrl || (editingItem?.videoId ? `https://www.youtube.com/watch?v=${editingItem.videoId}` : ''),
        duration: editingItem?.duration || '',
        description: editingItem?.description || '',
        publishedAt: editingItem?.publishedAt
            ? new Date(editingItem.publishedAt).toISOString().slice(0, 16)
            : new Date().toISOString().slice(0, 16),
        isTicker: editingItem?.isTicker || false,
        tickerCategory: editingItem?.tickerCategory || 'none',
        calendarDate: editingItem?.calendarDate
            ? new Date(editingItem.calendarDate).toISOString().slice(0, 10)
            : '',
    });

    const [loading, setLoading] = useState(false);
    const [imageSourceType, setImageSourceType] = useState(editingItem?.image ? 'url' : 'file');
    const [imageFile, setImageFile] = useState(null);

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
            if (type === 'article' && imageSourceType === 'file' && imageFile) {
                const submitData = new FormData();
                submitData.append('title', formData.title);
                submitData.append('category', formData.category);
                submitData.append('excerpt', formData.excerpt || '');
                submitData.append('content', formData.content);
                submitData.append('videoUrl', formData.videoUrl || '');
                submitData.append('isTicker', formData.isTicker);
                submitData.append('tickerCategory', formData.tickerCategory || 'none');
                if (formData.calendarDate) {
                    submitData.append('calendarDate', formData.calendarDate);
                }
                if (formData.publishedAt) {
                    submitData.append('publishedAt', formData.publishedAt);
                }

                // Author fields
                const authorObj = {
                    name: formData.author,
                    avatar: formData.authorAvatar,
                    bio: formData.authorBio,
                    linkedin: formData.authorLinkedin,
                    twitter: formData.authorTwitter
                };
                submitData.append('author', JSON.stringify(authorObj));

                // Tags
                const tagsArray = formData.tags.split(',').map(t => t.trim()).filter(Boolean);
                submitData.append('tags', JSON.stringify(tagsArray));

                // File
                submitData.append('image', imageFile);

                if (editingItem) {
                    await articlesAPI.update(editingItem._id, submitData);
                } else {
                    await articlesAPI.create(submitData);
                }
            } else {
                const data = {
                    ...formData,
                    tags: formData.tags.split(',').map(t => t.trim()).filter(Boolean),
                    image: formData.image || autoThumbnail,
                    thumbnail: formData.image || autoThumbnail,
                };

                if (type === 'article') {
                    data.author = {
                        name: formData.author,
                        avatar: formData.authorAvatar,
                        bio: formData.authorBio,
                        linkedin: formData.authorLinkedin,
                        twitter: formData.authorTwitter
                    };
                }

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
            }

            onSuccess();
        } catch (error) {
            console.error(`Error saving ${type}:`, error);
            let errMsg = 'Unknown error occurred';
            if (typeof error === 'string') {
                errMsg = error;
            } else if (error) {
                if (error.errors && Array.isArray(error.errors)) {
                    errMsg = error.errors.map(e => e.msg || e.message || JSON.stringify(e)).join(', ');
                } else if (error.error) {
                    errMsg = error.error;
                } else if (error.message) {
                    errMsg = error.message;
                } else {
                    errMsg = JSON.stringify(error);
                }
            }
            alert(`Failed to ${editingItem ? 'update' : 'create'} ${type}: ${errMsg}`);
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

                            {/* Image Source Option Selector */}
                            {type === 'article' && (
                                <div className="form-group" style={{ marginBottom: '12px' }}>
                                    <label>Image Source Option</label>
                                    <div style={{ display: 'flex', gap: '10px', marginTop: '5px' }}>
                                        <button
                                            type="button"
                                            className={`btn-secondary ${imageSourceType === 'file' ? 'active' : ''}`}
                                            style={{
                                                flex: 1,
                                                padding: '10px',
                                                background: imageSourceType === 'file' ? 'var(--primary)' : '#f1f5f9',
                                                color: imageSourceType === 'file' ? 'white' : 'var(--text-primary)',
                                                border: imageSourceType === 'file' ? '2px solid var(--primary)' : '2px solid rgba(0, 0, 0, 0.08)',
                                                borderRadius: 'var(--radius-md)',
                                                cursor: 'pointer',
                                                fontWeight: '600',
                                                transition: 'all 0.2s ease-in-out'
                                            }}
                                            onClick={() => setImageSourceType('file')}
                                        >
                                            📤 Upload Image File
                                        </button>
                                        <button
                                            type="button"
                                            className={`btn-secondary ${imageSourceType === 'url' ? 'active' : ''}`}
                                            style={{
                                                flex: 1,
                                                padding: '10px',
                                                background: imageSourceType === 'url' ? 'var(--primary)' : '#f1f5f9',
                                                color: imageSourceType === 'url' ? 'white' : 'var(--text-primary)',
                                                border: imageSourceType === 'url' ? '2px solid var(--primary)' : '2px solid rgba(0, 0, 0, 0.08)',
                                                borderRadius: 'var(--radius-md)',
                                                cursor: 'pointer',
                                                fontWeight: '600',
                                                transition: 'all 0.2s ease-in-out'
                                            }}
                                            onClick={() => setImageSourceType('url')}
                                        >
                                            🔗 Provide Image URL
                                        </button>
                                    </div>
                                </div>
                            )}

                            {type === 'article' && imageSourceType === 'file' ? (
                                <div className="form-group">
                                    <label htmlFor="article-image-file">Upload Image File {editingItem ? '' : '*'}</label>
                                    <input
                                        id="article-image-file"
                                        type="file"
                                        accept="image/*"
                                        onChange={(e) => setImageFile(e.target.files[0])}
                                        required={!editingItem}
                                        style={{
                                            padding: '8px 12px',
                                            border: '2px dashed rgba(0, 0, 0, 0.15)',
                                            borderRadius: 'var(--radius-md)',
                                            background: '#f8fafc',
                                            width: '100%',
                                            cursor: 'pointer'
                                        }}
                                    />
                                    {editingItem?.image && (
                                        <span className="form-hint" style={{ color: 'var(--text-muted)', display: 'block', marginTop: '5px', fontSize: '12px' }}>
                                            💡 Current image: {editingItem.image} (leave empty to keep current image)
                                        </span>
                                    )}
                                </div>
                            ) : (
                                <div className="form-group">
                                    <label>{type === 'article' ? 'Image URL' : 'Image URL (optional, defaults to YouTube preview)'}</label>
                                    <input
                                        type="url"
                                        value={formData.image}
                                        onChange={(e) => setFormData({ ...formData, image: e.target.value })}
                                        placeholder="https://example.com/image.jpg"
                                    />
                                </div>
                            )}

                            <div className="form-group">
                                <label>Author Name</label>
                                <input
                                    type="text"
                                    value={formData.author}
                                    onChange={(e) => setFormData({ ...formData, author: e.target.value })}
                                    placeholder="Author Name"
                                />
                            </div>

                            <div className="form-group">
                                <label>Author Avatar URL</label>
                                <input
                                    type="text"
                                    value={formData.authorAvatar}
                                    onChange={(e) => setFormData({ ...formData, authorAvatar: e.target.value })}
                                    placeholder="https://example.com/avatar.jpg"
                                />
                            </div>

                            <div className="form-group">
                                <label>Author Bio / Credentials</label>
                                <textarea
                                    value={formData.authorBio}
                                    onChange={(e) => setFormData({ ...formData, authorBio: e.target.value })}
                                    placeholder="Enter author short bio and credentials"
                                    rows="2"
                                />
                            </div>

                            <div className="form-row">
                                <div className="form-group">
                                    <label>Author LinkedIn URL</label>
                                    <input
                                        type="url"
                                        value={formData.authorLinkedin}
                                        onChange={(e) => setFormData({ ...formData, authorLinkedin: e.target.value })}
                                        placeholder="https://linkedin.com/in/username"
                                    />
                                </div>

                                <div className="form-group">
                                    <label>Author Twitter/X URL</label>
                                    <input
                                        type="url"
                                        value={formData.authorTwitter}
                                        onChange={(e) => setFormData({ ...formData, authorTwitter: e.target.value })}
                                        placeholder="https://twitter.com/username"
                                    />
                                </div>
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

                    {/* Ticker & Calendar Options */}
                    <div className="form-section-title" style={{ marginTop: '20px', fontWeight: 'bold', fontSize: '15px', borderBottom: '1px solid rgba(0,0,0,0.08)', paddingBottom: '5px', marginBottom: '15px', color: 'var(--text-primary)' }}>
                        📋 Ticker & Calendar Options
                    </div>
                    <div className="form-row">
                        <div className="form-group" style={{ display: 'flex', alignItems: 'center', gap: '10px', height: '100%', marginTop: 'auto', marginBottom: '20px' }}>
                            <input
                                type="checkbox"
                                id="isTicker"
                                checked={formData.isTicker}
                                onChange={(e) => setFormData({ ...formData, isTicker: e.target.checked })}
                                style={{ width: '20px', height: '20px', minWidth: '20px', cursor: 'pointer', margin: 0, padding: 0 }}
                            />
                            <label htmlFor="isTicker" style={{ cursor: 'pointer', marginBottom: 0, fontWeight: 600 }}>Show in Live Ticker</label>
                        </div>

                        <div className="form-group">
                            <label htmlFor="tickerCategory">Ticker Category</label>
                            <select
                                id="tickerCategory"
                                value={formData.tickerCategory}
                                onChange={(e) => setFormData({ ...formData, tickerCategory: e.target.value })}
                            >
                                <option value="none">None</option>
                                <option value="commodity">Commodity</option>
                                <option value="financial">Financial</option>
                                <option value="civic">Civic</option>
                                <option value="general">General</option>
                            </select>
                        </div>
                    </div>
                    <div className="form-group">
                        <label htmlFor="calendarDate">Calendar Event Link Date</label>
                        <input
                            type="date"
                            id="calendarDate"
                            value={formData.calendarDate}
                            onChange={(e) => setFormData({ ...formData, calendarDate: e.target.value })}
                        />
                        <span className="form-hint" style={{ color: '#666', fontWeight: 'normal' }}>💡 Select a date if you want this content to display as a historical event or news archive for that day on the homepage calendar.</span>
                    </div>

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

// Sponsor Ads Tab Component
function AdsTab({ ads, onRefresh, setShowCreateModal, setEditingItem }) {
    const [filterPosition, setFilterPosition] = useState('all');

    const filteredAds = filterPosition === 'all'
        ? ads
        : ads.filter(ad => ad.slotId === filterPosition || ad.position === filterPosition);

    const handleDelete = async (id) => {
        if (!window.confirm('Are you sure you want to delete this sponsor ad?')) return;
        try {
            await adsAPI.delete(id);
            onRefresh();
        } catch (error) {
            console.error('Delete failed:', error);
            alert(`Failed to delete ad: ${error.message || error}`);
        }
    };

    return (
        <div className="content-tab">
            <div className="tab-header">
                <div className="tab-actions">
                    <select
                        value={filterPosition}
                        onChange={(e) => setFilterPosition(e.target.value)}
                        className="filter-select"
                        aria-label="Filter advertisements by slot"
                    >
                        <option value="all">All Placements</option>
                        <option value="H1">Slot H1 (Home Horiz)</option>
                        <option value="H2">Slot H2 (Home Side)</option>
                        <option value="C1">Slot C1 (Left Rail)</option>
                        <option value="C2">Slot C2 (Right Rail)</option>
                        <option value="V1">Slot V1 (Video Left)</option>
                        <option value="V2">Slot V2 (Video Right)</option>
                    </select>
                </div>
                <button
                    onClick={() => {
                        setEditingItem(null);
                        setShowCreateModal(true);
                    }}
                    className="btn-primary"
                >
                    + Add Sponsor Ad
                </button>
            </div>

            <div className="content-table">
                <table>
                    <thead>
                        <tr>
                            <th>Preview</th>
                            <th>Title & Label</th>
                            <th>Target Slot</th>
                            <th>Targeting</th>
                            <th>Target URL</th>
                            <th>Status</th>
                            <th>Analytics (Imp / Clicks / CTR)</th>
                            <th>Actions</th>
                        </tr>
                    </thead>
                    <tbody>
                        {filteredAds.map(ad => {
                            const impressions = ad.metrics?.impressions || 0;
                            const clicks = ad.metrics?.clicks || 0;
                            const ctr = impressions > 0 ? ((clicks / impressions) * 100).toFixed(2) : '0.00';

                            return (
                                <tr key={ad._id}>
                                    <td style={{ width: '80px', padding: '8px' }}>
                                        <div style={{ width: '70px', height: '40px', overflow: 'hidden', borderRadius: '4px', border: '1px solid var(--border-color)', background: '#111' }}>
                                            <img
                                                src={ad.imageUrl}
                                                alt={ad.title}
                                                style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                                                onError={(e) => { e.target.src = 'https://placehold.co/300x250/111/fff?text=Error'; }}
                                            />
                                        </div>
                                    </td>
                                    <td className="title-cell">
                                        <div style={{ fontWeight: '600', color: 'var(--text-primary)' }}>{ad.title}</div>
                                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px', marginTop: '4px' }}>
                                            {ad.label && (
                                                <span style={{ fontSize: '9px', background: 'rgba(255, 33, 35, 0.1)', border: '1px solid rgba(255, 33, 35, 0.2)', padding: '1px 6px', borderRadius: '4px', color: 'var(--primary)', fontWeight: '600' }}>
                                                    {ad.label}
                                                </span>
                                            )}
                                            {ad.priority > 0 && (
                                                <span style={{ fontSize: '9px', background: 'rgba(33, 150, 243, 0.1)', border: '1px solid rgba(33, 150, 243, 0.2)', padding: '1px 6px', borderRadius: '4px', color: '#2196F3', fontWeight: '600' }}>
                                                    ⭐ P{ad.priority}
                                                </span>
                                            )}
                                        </div>
                                    </td>
                                    <td>
                                        <div style={{ fontWeight: '700', color: 'var(--primary)', fontSize: '13px' }}>{ad.slotId || 'H1'}</div>
                                    </td>
                                    <td>
                                        <div style={{ display: 'flex', flexDirection: 'column', gap: '2px', fontSize: '11px', color: 'var(--text-muted)' }}>
                                            {ad.targeting?.pageTypes?.length > 0 && (
                                                <div>📄 Pages: {ad.targeting.pageTypes.join(', ')}</div>
                                            )}
                                            {ad.targeting?.deviceTypes?.length > 0 && (
                                                <div>📱 Devices: {ad.targeting.deviceTypes.join(', ')}</div>
                                            )}
                                            {ad.targeting?.categories?.length > 0 && (
                                                <div>🎯 Category: {ad.targeting.categories.join(', ')}</div>
                                            )}
                                            {(!ad.targeting?.pageTypes?.length && !ad.targeting?.deviceTypes?.length && !ad.targeting?.categories?.length) && (
                                                <span style={{ color: 'var(--text-muted)', fontStyle: 'italic' }}>Global Fallback</span>
                                            )}
                                        </div>
                                    </td>
                                    <td style={{ maxWidth: '200px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                        <a href={ad.targetUrl} target="_blank" rel="noopener noreferrer" style={{ color: 'var(--primary)', textDecoration: 'none', fontSize: '13px' }}>
                                            {ad.targetUrl}
                                        </a>
                                    </td>
                                    <td>
                                        <span className={`status-badge status-${ad.status || 'active'}`} style={{
                                            padding: '4px 8px',
                                            borderRadius: '12px',
                                            fontSize: '11px',
                                            fontWeight: '600',
                                            textTransform: 'uppercase',
                                            background: ad.status === 'active' ? 'rgba(76, 175, 80, 0.15)' : 'rgba(244, 67, 54, 0.15)',
                                            color: ad.status === 'active' ? '#4CAF50' : '#F44336'
                                        }}>
                                            {ad.status || 'active'}
                                        </span>
                                    </td>
                                    <td>
                                        <div style={{ fontSize: '13px', display: 'flex', flexDirection: 'column', gap: '2px' }}>
                                            <div>👁️ <strong>{impressions}</strong> views</div>
                                            <div>🖱️ <strong>{clicks}</strong> clicks</div>
                                            <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>CTR: {ctr}%</div>
                                        </div>
                                    </td>
                                    <td>
                                        <div className="action-buttons">
                                            <button
                                                onClick={() => {
                                                    setEditingItem(ad);
                                                    setShowCreateModal(true);
                                                }}
                                                className="btn-edit"
                                                title="Edit"
                                            >
                                                ✏️
                                            </button>
                                            <button
                                                onClick={() => handleDelete(ad._id)}
                                                className="btn-delete"
                                                title="Delete"
                                            >
                                                🗑️
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            );
                        })}
                    </tbody>
                </table>

                {filteredAds.length === 0 && (
                    <div className="empty-state">
                        <p>No advertisements found</p>
                    </div>
                )}
            </div>
        </div>
    );
}

// Sponsor Ad Add/Edit Modal
function AdModal({ editingItem, onClose, onSuccess }) {
    const [imageSourceType, setImageSourceType] = useState(editingItem?.imageUrl ? 'url' : 'file');
    const [imageFile, setImageFile] = useState(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    const [formData, setFormData] = useState({
        title: editingItem?.title || '',
        label: editingItem?.label || '',
        targetUrl: editingItem?.targetUrl || '',
        slotId: editingItem?.slotId || 'H1',
        status: editingItem?.status || 'active',
        priority: editingItem?.priority || 0,
        ctaText: editingItem?.ctaText || 'Shop Now',
        altText: editingItem?.altText || 'Advertisement',
        imageUrl: editingItem?.imageUrl || ''
    });

    const [targeting, setTargeting] = useState({
        categories: editingItem?.targeting?.categories || [],
        deviceTypes: editingItem?.targeting?.deviceTypes || [],
        pageTypes: editingItem?.targeting?.pageTypes || []
    });

    const toggleTargeting = (type, value) => {
        setTargeting(prev => {
            const list = prev[type] || [];
            const newList = list.includes(value)
                ? list.filter(v => v !== value)
                : [...list, value];
            return { ...prev, [type]: newList };
        });
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        setError('');

        try {
            if (imageSourceType === 'file' && imageFile) {
                const data = new FormData();
                data.append('title', formData.title);
                data.append('label', formData.label);
                data.append('targetUrl', formData.targetUrl);
                data.append('slotId', formData.slotId);
                data.append('status', formData.status);
                data.append('priority', formData.priority);
                data.append('ctaText', formData.ctaText);
                data.append('altText', formData.altText);
                data.append('targeting', JSON.stringify(targeting));
                data.append('image', imageFile);

                if (editingItem) {
                    await adsAPI.update(editingItem._id, data);
                } else {
                    await adsAPI.create(data);
                }
            } else {
                const data = {
                    title: formData.title,
                    label: formData.label,
                    targetUrl: formData.targetUrl,
                    slotId: formData.slotId,
                    status: formData.status,
                    priority: Number(formData.priority) || 0,
                    ctaText: formData.ctaText,
                    altText: formData.altText,
                    targeting: targeting,
                    imageUrl: formData.imageUrl || editingItem?.imageUrl
                };

                if (!data.imageUrl && !editingItem) {
                    throw new Error('Please provide an image URL or upload an image file');
                }

                if (editingItem) {
                    await adsAPI.update(editingItem._id, data);
                } else {
                    await adsAPI.create(data);
                }
            }

            onSuccess();
        } catch (err) {
            console.error('Ad submit error:', err);
            setError(err.message || 'Failed to save sponsor ad');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="modal-overlay" onClick={onClose}>
            <div className="modal-content" onClick={(e) => e.stopPropagation()}>
                <div className="modal-header">
                    <h2>{editingItem ? '✏️ Edit' : '➕ Create'} Sponsor Ad</h2>
                    <button onClick={onClose} className="modal-close">×</button>
                </div>

                <form onSubmit={handleSubmit} className="modal-form">
                    {error && (
                        <div className="error-message" style={{ background: 'rgba(244, 67, 54, 0.1)', color: '#F44336', padding: '12px', borderRadius: '8px', marginBottom: '15px', fontSize: '14px', border: '1px solid rgba(244, 67, 54, 0.2)' }}>
                            ⚠️ {error}
                        </div>
                    )}

                    <div className="form-group">
                        <label htmlFor="ad-title">Sponsor Title *</label>
                        <input
                            id="ad-title"
                            type="text"
                            value={formData.title}
                            onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                            placeholder="e.g. ZPlus Premium Offer"
                            required
                        />
                    </div>

                    <div className="form-row">
                        <div className="form-group">
                            <label htmlFor="ad-slotId">Placement Target Slot *</label>
                            <select
                                id="ad-slotId"
                                value={formData.slotId}
                                onChange={(e) => setFormData({ ...formData, slotId: e.target.value })}
                                required
                            >
                                <option value="H1">Home Page H1 (Horizontal Banner - 728x90)</option>
                                <option value="H2">Home Page H2 (Sidebar Rectangle - 300x250)</option>
                                <option value="C1">Category/Article C1 (Left Sidebar Skyscraper - 160x600)</option>
                                <option value="C2">Category/Article C2 (Right Sidebar Skyscraper - 160x600)</option>
                                <option value="V1">Video Page V1 (Left Rectangle - 300x250)</option>
                                <option value="V2">Video Page V2 (Right Rectangle - 300x250)</option>
                            </select>
                        </div>

                        <div className="form-group">
                            <label htmlFor="ad-status">Status</label>
                            <select
                                id="ad-status"
                                value={formData.status}
                                onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                            >
                                <option value="active">Active</option>
                                <option value="paused">Paused</option>
                                <option value="expired">Expired</option>
                            </select>
                        </div>
                    </div>

                    <div className="form-group">
                        <label htmlFor="ad-target-url">Target Sponsor Website URL *</label>
                        <input
                            id="ad-target-url"
                            type="url"
                            value={formData.targetUrl}
                            onChange={(e) => setFormData({ ...formData, targetUrl: e.target.value })}
                            placeholder="https://sponsorwebsite.com"
                            required
                        />
                    </div>

                    {/* Advanced Targeting Section */}
                    <div style={{ background: 'rgba(255,255,255,0.02)', padding: '16px', borderRadius: '8px', border: '1px solid var(--border-color)', marginBottom: '15px' }}>
                        <h4 style={{ margin: '0 0 12px 0', fontSize: '14px', fontWeight: '700', color: 'var(--primary)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>🎯 Target Page & Devices</h4>
                        
                        <div className="form-row">
                            <div className="form-group">
                                <label style={{ fontSize: '12px', fontWeight: '600' }}>Pages (Empty = All)</label>
                                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', marginTop: '6px' }}>
                                    {['home', 'category', 'article', 'video'].map(page => (
                                        <button
                                            key={page}
                                            type="button"
                                            onClick={() => toggleTargeting('pageTypes', page)}
                                            style={{
                                                padding: '4px 10px',
                                                fontSize: '12px',
                                                borderRadius: '12px',
                                                border: '1px solid var(--border-color)',
                                                background: targeting.pageTypes.includes(page) ? 'var(--primary)' : 'rgba(255,255,255,0.05)',
                                                color: '#fff',
                                                cursor: 'pointer'
                                            }}
                                        >
                                            {page}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            <div className="form-group">
                                <label style={{ fontSize: '12px', fontWeight: '600' }}>Devices (Empty = All)</label>
                                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', marginTop: '6px' }}>
                                    {['desktop', 'tablet', 'mobile'].map(device => (
                                        <button
                                            key={device}
                                            type="button"
                                            onClick={() => toggleTargeting('deviceTypes', device)}
                                            style={{
                                                padding: '4px 10px',
                                                fontSize: '12px',
                                                borderRadius: '12px',
                                                border: '1px solid var(--border-color)',
                                                background: targeting.deviceTypes.includes(device) ? 'var(--primary)' : 'rgba(255,255,255,0.05)',
                                                color: '#fff',
                                                cursor: 'pointer'
                                            }}
                                        >
                                            {device}
                                        </button>
                                    ))}
                                </div>
                            </div>
                        </div>

                        <div className="form-group" style={{ marginTop: '12px' }}>
                            <label style={{ fontSize: '12px', fontWeight: '600' }}>Category Context (Empty = Global Fallback)</label>
                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '6px', marginTop: '8px', maxHeight: '120px', overflowY: 'auto', padding: '6px', border: '1px solid var(--border-color)', borderRadius: '6px', background: 'rgba(0,0,0,0.1)' }}>
                                {[
                                    { value: 'fake-news', label: 'Fake News' },
                                    { value: 'international', label: 'International' },
                                    { value: 'national', label: 'National' },
                                    { value: 'state', label: 'State' },
                                    { value: 'economics', label: 'Economics' },
                                    { value: 'polity', label: 'Polity' },
                                    { value: 'technology', label: 'Technology' },
                                    { value: 'environment', label: 'Environment' },
                                    { value: 'sports', label: 'Sports' },
                                    { value: 'health', label: 'Health' },
                                    { value: 'defence', label: 'Defence' },
                                    { value: 'culture', label: 'Culture' },
                                    { value: 'spirituality', label: 'Spirituality' },
                                    { value: 'agriculture', label: 'Agriculture' },
                                    { value: 'geography', label: 'Geography' },
                                    { value: 'religion', label: 'Religion' },
                                    { value: 'ai', label: 'AI' }
                                ].map(cat => (
                                    <label key={cat.value} style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '11px', cursor: 'pointer', color: 'var(--text-primary)' }}>
                                        <input
                                            type="checkbox"
                                            checked={targeting.categories.includes(cat.value)}
                                            onChange={() => toggleTargeting('categories', cat.value)}
                                            style={{ margin: 0 }}
                                        />
                                        {cat.label}
                                    </label>
                                ))}
                            </div>
                        </div>
                    </div>

                    {/* Image Upload Option Selector */}
                    <div className="form-group" style={{ marginBottom: '8px' }}>
                        <label>Image Source Option</label>
                        <div style={{ display: 'flex', gap: '10px', marginTop: '5px' }}>
                            <button
                                type="button"
                                className={`btn-secondary ${imageSourceType === 'file' ? 'active' : ''}`}
                                style={{ flex: 1, padding: '10px', background: imageSourceType === 'file' ? 'var(--primary)' : 'rgba(255,255,255,0.05)', color: 'white', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-md)' }}
                                onClick={() => setImageSourceType('file')}
                            >
                                📤 Upload Image File
                            </button>
                            <button
                                type="button"
                                className={`btn-secondary ${imageSourceType === 'url' ? 'active' : ''}`}
                                style={{ flex: 1, padding: '10px', background: imageSourceType === 'url' ? 'var(--primary)' : 'rgba(255,255,255,0.05)', color: 'white', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-md)' }}
                                onClick={() => setImageSourceType('url')}
                            >
                                🔗 Provide Image URL
                            </button>
                        </div>
                    </div>

                    {imageSourceType === 'file' ? (
                        <div className="form-group">
                            <label htmlFor="ad-image-file">Upload Image File {editingItem ? '' : '*'}</label>
                            <input
                                id="ad-image-file"
                                type="file"
                                accept="image/*"
                                onChange={(e) => setImageFile(e.target.files[0])}
                                required={!editingItem}
                                style={{ padding: '8px 12px', border: '1px dashed var(--border-color)', borderRadius: 'var(--radius-md)', background: 'rgba(255,255,255,0.02)', width: '100%' }}
                            />
                            {editingItem?.imageUrl && (
                                <span className="form-hint" style={{ color: 'var(--text-muted)' }}>💡 Current image: {editingItem.imageUrl} (leave empty to keep current image)</span>
                            )}
                        </div>
                    ) : (
                        <div className="form-group">
                            <label htmlFor="ad-image-url">Image URL *</label>
                            <input
                                id="ad-image-url"
                                type="url"
                                value={formData.imageUrl}
                                onChange={(e) => setFormData({ ...formData, imageUrl: e.target.value })}
                                placeholder="https://example.com/ad-banner.jpg"
                                required={!editingItem}
                            />
                        </div>
                    )}

                    <div className="form-row">
                        <div className="form-group">
                            <label htmlFor="ad-label">Ad Tagline / Label</label>
                            <input
                                id="ad-label"
                                type="text"
                                value={formData.label}
                                onChange={(e) => setFormData({ ...formData, label: e.target.value })}
                                placeholder="e.g. SPECIAL OFFER"
                            />
                        </div>

                        <div className="form-group">
                            <label htmlFor="ad-priority">Priority (higher shows first)</label>
                            <input
                                id="ad-priority"
                                type="number"
                                value={formData.priority}
                                onChange={(e) => setFormData({ ...formData, priority: e.target.value })}
                                placeholder="0"
                            />
                        </div>
                    </div>

                    <div className="form-row">
                        <div className="form-group">
                            <label htmlFor="ad-cta-text">CTA Button Text</label>
                            <input
                                id="ad-cta-text"
                                type="text"
                                value={formData.ctaText}
                                onChange={(e) => setFormData({ ...formData, ctaText: e.target.value })}
                                placeholder="e.g. Shop Now"
                            />
                        </div>

                        <div className="form-group">
                            <label htmlFor="ad-alt-text">Alt Text (Accessibility)</label>
                            <input
                                id="ad-alt-text"
                                type="text"
                                value={formData.altText}
                                onChange={(e) => setFormData({ ...formData, altText: e.target.value })}
                                placeholder="e.g. Advertisement image"
                            />
                        </div>
                    </div>

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
