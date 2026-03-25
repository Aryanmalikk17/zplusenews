import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Link } from 'react-router-dom';
import { videosAPI } from '../services/api';
import VideoCard from './ui/VideoCard';
import '../styles/video-row.css';

/**
 * VideoRow Component
 * 
 * Displays a row of latest synced videos on the Home page.
 * Uses horizontal scrolling on mobile.
 */
export default function VideoRow({ title = "Latest Video News", path = "/video-news" }) {
  const [videos, setVideos] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchVideos = async () => {
      try {
        // Use videosAPI.getAll to fetch the latest videos (limit 8 as requested)
        const response = await videosAPI.getAll({ limit: 8 });
        const data = response?.data || response || [];
        setVideos(Array.isArray(data) ? data : []);
      } catch (err) {
        console.error('Error fetching videos for row:', err);
        setVideos([]);
      } finally {
        setLoading(false);
      }
    };

    fetchVideos();
  }, []);

  if (!loading && videos.length === 0) return null;

  return (
    <section className="section video-row-section">
      <div className="container">
        <div className="section-header">
          <div className="header-info">
            <h2>{title}</h2>
            <span className="live-badge">
              <span className="live-dot"></span> LIVE UPDATES
            </span>
          </div>
          <Link to={path} className="view-all">
            Watch All <i className="fa-solid fa-arrow-right"></i>
          </Link>
        </div>

        {loading ? (
          <div className="video-skeleton-row">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="video-card-skeleton">
                <div className="skeleton-video-thumb shim"></div>
                <div className="skeleton-content" style={{ padding: '1rem' }}>
                  <div className="skeleton-title shim" style={{ height: '1.2rem', marginBottom: '0.5rem' }}></div>
                  <div className="skeleton-text shim" style={{ height: '0.8rem', width: '40%' }}></div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <AnimatePresence mode="wait">
            <motion.div 
              key="content"
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
          </AnimatePresence>
        )}
      </div>
      
      {/* Background Accent Gradient */}
      <div className="video-section-accent"></div>
    </section>
  );
}
