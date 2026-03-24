import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useInView } from 'react-intersection-observer';
import { videosAPI } from '../services/api';
import VideoCard from './ui/VideoCard';
import { motion, AnimatePresence } from 'framer-motion';

/**
 * VideoRow Component
 * 
 * Displays a row of latest synced videos on the Home page.
 */
export default function VideoRow({ title = "Video Highlights", path = "/videos" }) {
  const [videos, setVideos] = useState([]);
  const [loading, setLoading] = useState(false);
  const [hasFetched, setHasFetched] = useState(false);

  const { ref, inView } = useInView({
    triggerOnce: true,
    threshold: 0.1,
    rootMargin: '200px 0px',
  });

  useEffect(() => {
    if (inView && !hasFetched) {
      fetchVideos();
    }
  }, [inView, hasFetched]);

  const fetchVideos = async () => {
    setLoading(true);
    try {
      const response = await videosAPI.getAll({ limit: 4 });
      const data = response?.data || response || [];
      setVideos(Array.isArray(data) ? data : []);
      setHasFetched(true);
    } catch (err) {
      console.error('Error fetching videos for row:', err);
    } finally {
      setLoading(false);
    }
  };

  if (hasFetched && videos.length === 0 && !loading) return null;

  return (
    <section className="video-row-section" ref={ref}>
      <div className="container">
        <div className="video-row-header">
          <h2 className="video-row-title">{title}</h2>
          <Link to={path} className="video-row-view-all">
            Watch All <span>&rarr;</span>
          </Link>
        </div>

        <div className="video-row-content">
          <AnimatePresence mode="wait">
            {loading ? (
              <motion.div 
                key="skeleton"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="video-row-grid"
              >
                {[1, 2, 3, 4].map((i) => (
                  <div key={i} className="video-card-skeleton">
                    <div className="skeleton-video-thumb shim"></div>
                    <div className="skeleton-content" style={{ padding: '1rem' }}>
                      <div className="skeleton-title shim" style={{ height: '1.2rem', marginBottom: '0.5rem' }}></div>
                      <div className="skeleton-text shim" style={{ height: '0.8rem', width: '40%' }}></div>
                    </div>
                  </div>
                ))}
              </motion.div>
            ) : (
              <motion.div 
                key="content"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="video-row-grid"
              >
                {videos.map((video, index) => (
                  <VideoCard 
                    key={video._id || index} 
                    video={video} 
                  />
                ))}
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </section>
  );
}
