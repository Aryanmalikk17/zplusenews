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

    // Convert Instagram post ID or existing URL to embed URL
    const getEmbedUrl = (videoId, source = 'instagram') => {
        // If videoId is already a URL (legacy/migrated data)
        if (videoId.includes('http')) {
            if (videoId.includes('youtube') || videoId.includes('youtu.be')) {
                const match = videoId.match(/(?:youtu\.be\/|youtube\.com\/.*v=|embed\/)([^#&?]*)/);
                const id = match ? match[1] : videoId;
                // Use youtube-nocookie.com with proper parameters to avoid Error 153
                return `https://www.youtube-nocookie.com/embed/${id}?rel=0&modestbranding=1&enablejsapi=1`;
            }
            if (videoId.includes('instagram')) {
                // Instagram doesn't support reliable embedding - return null to trigger fallback
                return null;
            }
            return videoId;
        }

        if (source === 'instagram') {
            // Instagram doesn't support reliable embedding - return null
            return null;
        }
        // YouTube - use youtube-nocookie.com for privacy-enhanced mode
        return `https://www.youtube-nocookie.com/embed/${videoId}?rel=0&modestbranding=1&enablejsapi=1`;
    };

    // Get original source URL for Instagram fallback
    const getSourceUrl = () => {
        if (video.videoUrl) return video.videoUrl;
        if (video.source === 'instagram') {
            return `https://www.instagram.com/p/${video.videoId}/`;
        }
        return `https://www.youtube.com/watch?v=${video.videoId}`;
    };

    // Get thumbnail URL
    const getThumbnailUrl = () => {
        if (video.thumbnail) return video.thumbnail;

        // Handle raw URL in videoId
        let id = video.videoId;
        if (id && id.includes('http')) {
            const match = id.match(/(?:youtu\.be\/|youtube\.com\/.*v=|embed\/)([^#&?]*)/);
            if (match) id = match[1];
        }

        if (video.source === 'instagram') {
            // Instagram doesn't provide easy thumbnail access, use placeholder
            return '/assets/images/video-placeholder.jpg';
        }
        // YouTube thumbnail
        return `https://img.youtube.com/vi/${id}/hqdefault.jpg`;
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
        const embedUrl = getEmbedUrl(video.videoId, video.source);
        if (!embedUrl) {
            // For Instagram or unsupported sources, open in new tab
            window.open(getSourceUrl(), '_blank', 'noopener,noreferrer');
            return;
        }
        setIsPlaying(true);
    };

    const embedUrl = getEmbedUrl(video.videoId, video.source);

    return (
        <motion.article
            className={`video-card ${featured ? 'video-card-featured' : ''}`}
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.4 }}
        >
            <div className="video-card-media">
                {isPlaying && embedUrl ? (
                    <iframe
                        src={embedUrl}
                        className="video-embed"
                        frameBorder="0"
                        allowFullScreen
                        allow="autoplay; encrypted-media; picture-in-picture"
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
