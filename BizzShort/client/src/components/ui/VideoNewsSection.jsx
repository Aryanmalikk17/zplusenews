import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { videosAPI } from '../../services/api';
import VideoCard from './VideoCard';

/**
 * VideoNewsSection - Displays a grid of video news items
 * Features Instagram video embeds from the database
 */
export default function VideoNewsSection() {
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
            // Handle both response formats
            const videoData = response.data || response;
            setVideos(Array.isArray(videoData) ? videoData : []);
        } catch (err) {
            console.error('Error fetching videos:', err);
            setError('Failed to load videos');
        } finally {
            setLoading(false);
        }
    };

    // Filter videos by category
    const filteredVideos = activeCategory === 'all'
        ? videos
        : videos.filter(v => v.category?.toLowerCase().includes(activeCategory));

    // Get featured video (first one marked as featured, or first video)
    const featuredVideo = videos.find(v => v.featured) || videos[0];
    const otherVideos = filteredVideos.filter(v => v._id !== featuredVideo?._id).slice(0, 5);

    // Get unique categories from videos
    const categories = ['all', ...new Set(videos.map(v => v.category?.toLowerCase()).filter(Boolean))];

    if (loading) {
        return (
            <section className="section video-news-section">
                <div className="container">
                    <div className="section-header">
                        <h2>Video News</h2>
                    </div>
                    <div className="video-grid">
                        {[1, 2, 3].map(i => (
                            <div key={i} className="video-card skeleton" style={{ height: '300px' }} />
                        ))}
                    </div>
                </div>
            </section>
        );
    }

    if (error || videos.length === 0) {
        return (
            <section className="section video-news-section">
                <div className="container">
                    <div className="section-header">
                        <h2>📹 Video News</h2>
                    </div>
                    <div className="empty-state">
                        <p>No videos yet. Add Instagram videos via the admin panel to display them here.</p>
                    </div>
                </div>
            </section>
        );
    }

    return (
        <section className="section video-news-section">
            <div className="container">
                {/* Section Header */}
                <motion.div
                    className="section-header"
                    initial={{ opacity: 0, y: 20 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                >
                    <h2>📹 Video News</h2>
                    {categories.length > 2 && (
                        <div className="category-tabs">
                            {categories.slice(0, 5).map(cat => (
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
                </motion.div>

                {/* Video Grid */}
                <div className="video-news-grid">
                    {/* Featured Video */}
                    {featuredVideo && (
                        <div className="video-featured-column">
                            <VideoCard video={featuredVideo} featured={true} />
                        </div>
                    )}

                    {/* Other Videos */}
                    {otherVideos.length > 0 && (
                        <div className="video-list-column">
                            {otherVideos.map(video => (
                                <VideoCard key={video._id || video.id} video={video} />
                            ))}
                        </div>
                    )}
                </div>

                {/* View All Link */}
                {videos.length > 6 && (
                    <div className="section-footer">
                        <button className="btn btn-glass">
                            View All Videos →
                        </button>
                    </div>
                )}
            </div>
        </section>
    );
}
