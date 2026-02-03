import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { videosAPI } from '../services/api';
import VideoCard from '../components/ui/VideoCard';

export default function Videos() {
    const [videos, setVideos] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [activeCategory, setActiveCategory] = useState('all');

    useEffect(() => {
        fetchVideos();
    }, []);

    const fetchVideos = async () => {
        try {
            setLoading(true);
            const response = await videosAPI.getAll();
            const videoData = response.data || response;
            setVideos(Array.isArray(videoData) ? videoData : []);
        } catch (err) {
            console.error('Error fetching videos:', err);
            setError('Failed to load videos');
        } finally {
            setLoading(false);
        }
    };

    const categories = ['all', ...new Set(videos.map(v => v.category?.toLowerCase()).filter(Boolean))];

    const filteredVideos = activeCategory === 'all'
        ? videos
        : videos.filter(v => v.category?.toLowerCase().includes(activeCategory));

    return (
        <div className="page-videos">
            <section className="section">
                <div className="container">
                    <motion.div
                        className="section-header text-center"
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                    >
                        <h1>Video Gallery</h1>
                        <p className="section-subtitle">Watch the latest news and updates</p>
                    </motion.div>

                    {/* Filter Tabs */}
                    {categories.length > 1 && (
                        <div className="category-tabs" style={{ justifyContent: 'center', marginBottom: '3rem' }}>
                            {categories.map(cat => (
                                <button
                                    key={cat}
                                    className={`category-tab ${activeCategory === cat ? 'active' : ''}`}
                                    onClick={() => setActiveCategory(cat)}
                                >
                                    {cat.charAt(0).toUpperCase() + cat.slice(1)}
                                </button>
                            ))}
                        </div>
                    )}

                    {loading ? (
                        <div className="video-grid">
                            {[1, 2, 3, 4, 5, 6].map(i => (
                                <div key={i} className="video-card skeleton" style={{ height: '300px' }} />
                            ))}
                        </div>
                    ) : error ? (
                        <div className="error-message">{error}</div>
                    ) : (
                        <div className="video-news-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '2rem' }}>
                            {filteredVideos.map(video => (
                                <VideoCard key={video._id} video={video} />
                            ))}
                        </div>
                    )}
                </div>
            </section>
        </div>
    );
}
