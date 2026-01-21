import { useState } from 'react';
import { motion } from 'framer-motion';

/**
 * VideoCard - Displays an Instagram video embed card
 * @param {Object} video - Video object with videoId, title, category, etc.
 * @param {boolean} featured - Whether this is a featured video (larger display)
 */
export default function VideoCard({ video, featured = false }) {
    const [isPlaying, setIsPlaying] = useState(false);
    const [imageError, setImageError] = useState(false);

    // Convert Instagram post ID to embed URL
    const getEmbedUrl = (videoId, source = 'instagram') => {
        if (source === 'instagram') {
            return `https://www.instagram.com/p/${videoId}/embed`;
        }
        // YouTube fallback
        return `https://www.youtube.com/embed/${videoId}`;
    };

    // Get thumbnail URL
    const getThumbnailUrl = () => {
        if (video.thumbnail) return video.thumbnail;
        if (video.source === 'instagram') {
            // Instagram doesn't provide easy thumbnail access, use placeholder
            return '/assets/images/video-placeholder.jpg';
        }
        // YouTube thumbnail
        return `https://img.youtube.com/vi/${video.videoId}/hqdefault.jpg`;
    };

    const getCategoryClass = () => {
        const cat = video.category?.toLowerCase() || 'tech';
        return cat.includes('tech') ? 'tech'
            : cat.includes('business') ? 'business'
                : cat.includes('startup') ? 'startups'
                    : cat.includes('market') ? 'markets'
                        : 'innovation';
    };

    const handlePlayClick = () => {
        setIsPlaying(true);
    };

    return (
        <motion.article
            className={`video-card ${featured ? 'video-card-featured' : ''}`}
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.4 }}
        >
            <div className="video-card-media">
                {isPlaying ? (
                    <iframe
                        src={getEmbedUrl(video.videoId, video.source)}
                        className="video-embed"
                        frameBorder="0"
                        allowFullScreen
                        allow="autoplay; encrypted-media"
                        title={video.title}
                    />
                ) : (
                    <>
                        <div className="video-thumbnail">
                            {!imageError ? (
                                <img
                                    src={getThumbnailUrl()}
                                    alt={video.title}
                                    onError={() => setImageError(true)}
                                />
                            ) : (
                                <div className="video-placeholder">
                                    <span className="play-icon-bg">▶</span>
                                </div>
                            )}
                        </div>
                        <button
                            className="play-button"
                            onClick={handlePlayClick}
                            aria-label="Play video"
                        >
                            <svg viewBox="0 0 24 24" fill="currentColor">
                                <path d="M8 5v14l11-7z" />
                            </svg>
                        </button>
                        <span className={`category-badge ${getCategoryClass()}`}>
                            {video.category || 'Video'}
                        </span>
                        {video.duration && (
                            <span className="video-duration">{video.duration}</span>
                        )}
                    </>
                )}
            </div>
            <div className="video-card-content">
                <h3 className="video-title">{video.title}</h3>
                {video.description && !featured && (
                    <p className="video-description">{video.description}</p>
                )}
                <div className="video-meta">
                    <span className="video-source">
                        {video.source === 'instagram' ? '📸 Instagram' : '🎬 YouTube'}
                    </span>
                    {video.date && <span className="video-date">{video.date}</span>}
                    {video.views && video.views !== '0' && (
                        <span className="video-views">{video.views} views</span>
                    )}
                </div>
            </div>
        </motion.article>
    );
}
