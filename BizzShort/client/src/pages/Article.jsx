import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { articlesAPI, videosAPI } from '../services/api';
import ArticleCard from '../components/ui/ArticleCard';

export default function Article() {
  const { slug, videoId: routeVideoId } = useParams();
  const [article, setArticle] = useState(null);
  const [video, setVideo] = useState(null);
  const [relatedArticles, setRelatedArticles] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchContent = async () => {
      try {
        // If accessed via /video/:videoId route, fetch video directly
        if (routeVideoId) {
          try {
            const videoData = await videosAPI.getByVideoId(routeVideoId);
            const v = videoData?.data || videoData;
            if (v) {
              setVideo(v);
              setArticle({
                title: v.title,
                content: v.articleContent || v.description || '',
                category: v.category,
                author: v.youtubeChannelTitle || 'ZPluse News',
                date: v.date || v.createdAt,
                image: v.thumbnail,
                views: parseInt(v.views, 10) || 0,
                videoId: v.videoId,
                transcript: v.transcript,
              });
            }
          } catch (videoErr) {
            console.error('Video not found:', routeVideoId);
          }
        } else if (slug) {
          // Try to fetch article by slug first
          const data = await articlesAPI.getBySlug(slug).catch(() => null);

          if (data) {
            setArticle(data);
            if (data._id) {
              articlesAPI.incrementViews(data._id).catch(() => { });
            }
          }

          // Also check if slug is a video MongoDB ID (for video-based articles)
          if (!data) {
            try {
              const videoData = await videosAPI.getById(slug);
              const v = videoData?.data || videoData;
              if (v) {
                setVideo(v);
                setArticle({
                  title: v.title,
                  content: v.articleContent || v.description || '',
                  category: v.category,
                  author: v.youtubeChannelTitle || 'ZPluse News',
                  date: v.date || v.createdAt,
                  image: v.thumbnail,
                  views: parseInt(v.views, 10) || 0,
                  videoId: v.videoId,
                  transcript: v.transcript,
                });
              }
            } catch (videoErr) {
              console.log('Not a video slug either');
            }
          }

          // If article is found and it has no video yet, check if there's a matching video
          if (data && !video) {
            try {
              const allVideos = await videosAPI.getAll();
              const vids = allVideos?.data || allVideos || [];
              if (Array.isArray(vids)) {
                const match = vids.find(v =>
                  v.title?.toLowerCase() === data.title?.toLowerCase()
                );
                if (match) setVideo(match);
              }
            } catch (e) {
              // No matching video
            }
          }
        }

        // Fetch related articles
        const allArticles = await articlesAPI.getAll({ limit: 4 }).catch(() => []);
        const artArr = allArticles?.data || allArticles || [];
        setRelatedArticles(
          Array.isArray(artArr)
            ? artArr.filter(a => a.slug !== slug && a._id !== slug).slice(0, 3)
            : []
        );
      } catch (error) {
        console.error('Error fetching article:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchContent();
  }, [slug]);

  if (loading) {
    return (
      <div className="article-page">
        <div className="container">
          <div className="skeleton" style={{ height: 400, marginBottom: 32, borderRadius: 20 }}></div>
          <div className="skeleton" style={{ height: 40, width: '80%', marginBottom: 16 }}></div>
          <div className="skeleton" style={{ height: 24, width: '40%', marginBottom: 32 }}></div>
          {[...Array(5)].map((_, i) => (
            <div key={i} className="skeleton" style={{ height: 20, marginBottom: 12 }}></div>
          ))}
        </div>
      </div>
    );
  }

  if (!article) {
    return (
      <div className="article-page">
        <div className="container" style={{ textAlign: 'center', padding: '100px 0' }}>
          <h1>Article Not Found</h1>
          <p>The article you&apos;re looking for doesn&apos;t exist.</p>
          <Link to="/" style={{ color: 'var(--primary)', fontWeight: 600 }}>
            ← Back to Home
          </Link>
        </div>
      </div>
    );
  }

  const youtubeVideoId = video?.videoId || article?.videoId;
  const youtubeUrl = youtubeVideoId ? `https://www.youtube.com/watch?v=${youtubeVideoId}` : null;

  const formattedDate = article.date
    ? new Date(article.date).toLocaleDateString('en-US', {
      weekday: 'long',
      month: 'long',
      day: 'numeric',
      year: 'numeric'
    })
    : 'Today';

  return (
    <motion.div
      className="article-page"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.5 }}
    >
      {/* Header Bar */}
      <div className="article-header-bar">
        <div className="container article-header-inner">
          <Link to="/" className="article-logo-link">
            <img
              src="/zplus_black.png"
              alt="ZPluse News"
              className="article-logo"
              onError={(e) => { e.target.style.display = 'none'; }}
            />
            <span className="article-logo-text">ZPluse News</span>
          </Link>
          <span className="article-header-label">Watch Now</span>
        </div>
      </div>

      {/* Video Player Section */}
      {youtubeVideoId && (
        <section className="article-video-section">
          <div className="container">
            <div className="video-player-container">
              <iframe
                src={`https://www.youtube-nocookie.com/embed/${youtubeVideoId}?rel=0`}
                title={article.title}
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
                className="video-iframe"
              ></iframe>
            </div>
            <div className="video-actions">
              <a
                href={youtubeUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="watch-youtube-btn"
              >
                <svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor">
                  <path d="M21.8 8.001c0-.002-.244-1.742-.993-2.508-.949-.996-2.013-1-2.5-1.058C14.818 4.16 12.003 4.16 12.003 4.16h-.006s-2.815 0-6.304.275c-.487.058-1.551.062-2.5 1.058-.749.766-.993 2.506-.993 2.508S2 10.073 2 12.145v1.71c0 2.073.2 4.145.2 4.145s.244 1.742.993 2.507c.949.997 2.196.966 2.75 1.07 1.996.193 8.057.252 8.057.252s2.818-.004 6.307-.279c.487-.058 1.551-.062 2.5-1.058.749-.765.993-2.507.993-2.507s.2-2.072.2-4.145v-1.71c0-2.072-.2-4.144-.2-4.144zM9.996 15.996V8.997l6.003 3.504-6.003 3.495z" />
                </svg>
                Watch on YouTube
              </a>
            </div>
          </div>
        </section>
      )}

      {/* Article Title & Meta */}
      <div className="container">
        <div className="article-content-wrapper">
          {!youtubeVideoId && article.image && (
            <div className="article-hero-img">
              <img src={article.image} alt={article.title} />
            </div>
          )}

          <div className="article-title-block">
            {article.category && (
              <span className="category-badge">{article.category}</span>
            )}
            <h1 className="article-main-title">{article.title}</h1>
            <div className="article-meta">
              <span>By {typeof article.author === 'object' ? article.author?.name : article.author || 'Editorial Team'}</span>
              <span>•</span>
              <span>{formattedDate}</span>
              {article.views > 0 && (
                <>
                  <span>•</span>
                  <span>{article.views.toLocaleString()} views</span>
                </>
              )}
            </div>
          </div>

          {/* Google Translate Widget */}
          <div id="google_translate_element" className="translate-widget"></div>

          {/* Read Article Section */}
          <div className="read-article-section">
            <h2 className="read-article-heading">
              <svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" />
                <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z" />
              </svg>
              Read Article
            </h2>

            <article
              className="article-content"
              dangerouslySetInnerHTML={{
                __html: article.content || '<p>Article content is being generated. Please check back soon.</p>'
              }}
            />
          </div>

          {/* Share Buttons */}
          <div className="article-share">
            <span>Share this article:</span>
            <div className="share-buttons">
              <a
                href={`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(window.location.href)}`}
                target="_blank"
                rel="noopener noreferrer"
                className="share-btn facebook"
              >Facebook</a>
              <a
                href={`https://twitter.com/intent/tweet?url=${encodeURIComponent(window.location.href)}&text=${encodeURIComponent(article.title)}`}
                target="_blank"
                rel="noopener noreferrer"
                className="share-btn twitter"
              >Twitter</a>
              <a
                href={`https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(window.location.href)}`}
                target="_blank"
                rel="noopener noreferrer"
                className="share-btn linkedin"
              >LinkedIn</a>
            </div>
          </div>
        </div>

        {/* Related Articles */}
        {relatedArticles.length > 0 && (
          <section className="related-articles">
            <h2>Related Articles</h2>
            <div className="article-grid">
              {relatedArticles.map((related, index) => (
                <ArticleCard
                  key={related._id || index}
                  article={related}
                  index={index}
                />
              ))}
            </div>
          </section>
        )}
      </div>

      <style>{`
        .article-page {
          padding-bottom: 80px;
          background: var(--bg-primary, #fff);
        }

        /* Header Bar */
        .article-header-bar {
          background: #111;
          padding: 12px 0;
        }
        .article-header-inner {
          display: flex;
          align-items: center;
          justify-content: space-between;
        }
        .article-logo-link {
          display: flex;
          align-items: center;
          gap: 10px;
          text-decoration: none;
        }
        .article-logo {
          height: 36px;
          width: auto;
        }
        .article-logo-text {
          color: #fff;
          font-size: 1.25rem;
          font-weight: 700;
          letter-spacing: -0.5px;
        }
        .article-header-label {
          color: #AA2123;
          font-weight: 700;
          font-size: 0.95rem;
          text-transform: uppercase;
          letter-spacing: 1px;
        }

        /* Video Section */
        .article-video-section {
          background: #000;
          padding: 20px 0;
        }
        .video-player-container {
          position: relative;
          width: 100%;
          max-width: 900px;
          margin: 0 auto;
          aspect-ratio: 16 / 9;
          border-radius: 12px;
          overflow: hidden;
          box-shadow: 0 8px 32px rgba(0,0,0,0.4);
        }
        .video-iframe {
          position: absolute;
          top: 0;
          left: 0;
          width: 100%;
          height: 100%;
          border: none;
        }
        .video-actions {
          max-width: 900px;
          margin: 16px auto 0;
          display: flex;
          justify-content: flex-start;
        }
        .watch-youtube-btn {
          display: inline-flex;
          align-items: center;
          gap: 8px;
          padding: 10px 24px;
          background: #FF0000;
          color: #fff;
          border-radius: 50px;
          font-weight: 600;
          font-size: 14px;
          text-decoration: none;
          transition: all 0.2s ease;
        }
        .watch-youtube-btn:hover {
          background: #cc0000;
          transform: translateY(-1px);
          box-shadow: 0 4px 12px rgba(255,0,0,0.3);
        }

        /* Hero Image (fallback for non-video articles) */
        .article-hero-img {
          border-radius: 16px;
          overflow: hidden;
          margin-bottom: 32px;
        }
        .article-hero-img img {
          width: 100%;
          height: auto;
          max-height: 500px;
          object-fit: cover;
        }

        /* Title Block */
        .article-title-block {
          margin-bottom: 32px;
        }
        .category-badge {
          display: inline-block;
          background: #AA2123;
          color: #fff;
          padding: 4px 14px;
          border-radius: 20px;
          font-size: 12px;
          font-weight: 700;
          text-transform: uppercase;
          letter-spacing: 0.5px;
          margin-bottom: 12px;
        }
        .article-main-title {
          font-size: clamp(1.75rem, 4vw, 2.75rem);
          line-height: 1.2;
          color: var(--text-primary, #111);
          margin: 0 0 16px;
          font-weight: 800;
        }
        .article-meta {
          display: flex;
          flex-wrap: wrap;
          gap: 8px;
          color: var(--text-secondary, #666);
          font-size: 14px;
        }

        /* Translate Widget */
        .translate-widget {
          margin-bottom: 24px;
        }

        /* Read Article Section */
        .read-article-section {
          border-top: 2px solid var(--light-gray, #eee);
          padding-top: 32px;
          margin-top: 8px;
        }
        .read-article-heading {
          display: flex;
          align-items: center;
          gap: 10px;
          font-size: 1.5rem;
          font-weight: 700;
          color: var(--text-primary, #111);
          margin-bottom: 24px;
        }
        .read-article-heading svg {
          color: #AA2123;
        }

        .article-content-wrapper {
          max-width: 800px;
          margin: 0 auto;
          padding: 40px 0;
        }

        .article-content {
          font-size: 18px;
          line-height: 1.9;
          color: var(--text-secondary, #444);
        }
        .article-content h2 {
          font-size: 1.75rem;
          color: var(--text-primary, #111);
          margin: 40px 0 20px;
        }
        .article-content p {
          margin-bottom: 24px;
        }

        /* Share */
        .article-share {
          display: flex;
          align-items: center;
          gap: 20px;
          padding: 30px 0;
          border-top: 1px solid var(--light-gray, #eee);
          margin-top: 40px;
        }
        .share-buttons {
          display: flex;
          gap: 12px;
        }
        .share-btn {
          display: inline-block;
          padding: 10px 20px;
          border-radius: 50px;
          font-size: 13px;
          font-weight: 600;
          color: white;
          text-decoration: none;
          transition: opacity 0.2s;
        }
        .share-btn:hover { opacity: 0.9; }
        .share-btn.facebook { background: #1877f2; }
        .share-btn.twitter { background: #1da1f2; }
        .share-btn.linkedin { background: #0a66c2; }

        /* Related */
        .related-articles {
          padding: 60px 0;
          border-top: 1px solid var(--light-gray, #eee);
        }
        .related-articles h2 {
          margin-bottom: 32px;
        }

        @media (max-width: 768px) {
          .article-video-section {
            padding: 10px 0;
          }
          .video-player-container {
            border-radius: 8px;
          }
          .article-content-wrapper {
            padding: 24px 0;
          }
          .article-share {
            flex-direction: column;
            align-items: flex-start;
          }
        }
      `}</style>
    </motion.div>
  );
}
