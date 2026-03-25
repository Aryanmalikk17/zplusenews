import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import { videosAPI } from '../services/api';
import VideoCard from './ui/VideoCard';
import '../../styles/video-row.css';

/**
 * VideoRow Component
 * Fetches latest 6 videos from the API and displays them in a responsive row.
 * Includes a "Watch All" button and clean typography.
 */
export default function VideoRow() {
    const [videos, setVideos] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchVideos = async () => {
            try {
                const response = await videosAPI.getAll({ limit: 6 });
                const data = response?.data || response || [];
                // Ensure data is an array
                setVideos(Array.isArray(data) ? data.slice(0, 6) : []);
            } catch (error) {
                console.error('Error fetching videos for row:', error);
                setVideos([]);
            } finally {
                setLoading(false);
            }
        };

        fetchVideos();
    }, []);

    // If no videos are available after loading, don't render the section
    if (!loading && videos.length === 0) return null;

    return (
        <section className="section video-row-section">
            <div className="container">
                <div className="section-header">
                    <div className="header-info">
                        <h2>
                             Latest Video News
                        </h2>
                        <span className="live-badge">
                            <span className="live-dot"></span> LIVE UPDATES
                        </span>
                    </div>
                    <Link to="/video-news" className="view-all">
                        Watch All <i className="fa-solid fa-arrow-right"></i>
                    </Link>
                </div>

                {loading ? (
                    <div className="video-skeleton-row">
                        {[...Array(3)].map((_, i) => (
                            <div key={i} className="video-skeleton-card">
                                <div className="skeleton-thumb"></div>
                                <div className="skeleton-text"></div>
                                <div className="skeleton-text-short"></div>
                            </div>
                        ))}
                    </div>
                ) : (
                    <motion.div 
                        className="video-grid-row"
                        initial={{ opacity: 0, y: 20 }}
                        whileInView={{ opacity: 1, y: 0 }}
                        viewport={{ once: true }}
                        transition={{ duration: 0.6 }}
                    >
                        {videos.map((video, index) => (
                            <motion.div 
                                key={video._id || index}
                                initial={{ opacity: 0, y: 20 }}
                                whileInView={{ opacity: 1, y: 0 }}
                                viewport={{ once: true }}
                                transition={{ duration: 0.4, delay: index * 0.1 }}
                            >
                                <VideoCard video={video} />
                            </motion.div>
                        ))}
                    </motion.div>
                )}
            </div>
            
            {/* Background Accent Gradient */}
            <div className="video-section-accent"></div>
        </section>
    );
}
