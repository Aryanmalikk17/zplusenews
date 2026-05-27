import { useState, useEffect, useRef } from 'react';
import { useParams, Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import DOMPurify from 'dompurify';
import { articlesAPI, videosAPI } from '../services/api';
import ArticleCard from '../components/ui/ArticleCard';
import '../styles/article-page.css';

/**
 * Extract the 11-char YouTube video ID from any format:
 *   - Full URL: https://www.youtube.com/watch?v=dQw4w9WgXcQ
 *   - Short URL: https://youtu.be/dQw4w9WgXcQ
 *   - Embed URL: https://www.youtube.com/embed/dQw4w9WgXcQ
 *   - Raw ID:   dQw4w9WgXcQ
 */
function extractYouTubeId(raw) {
  if (!raw) return null;
  const str = String(raw).trim();

  // Try URL patterns
  try {
    const url = new URL(str);
    // youtube.com/watch?v=ID
    if (url.searchParams.get('v')) return url.searchParams.get('v');
    // youtu.be/ID or youtube.com/embed/ID
    const parts = url.pathname.split('/').filter(Boolean);
    if (parts.length > 0) return parts[parts.length - 1];
  } catch {
    // Not a URL — treat as raw ID
  }

  // Raw 11-char video ID (alphanumeric, dash, underscore)
  if (/^[a-zA-Z0-9_-]{10,12}$/.test(str)) return str;

  return str; // fallback
}

export default function Article() {
  const { slug, videoId: routeVideoId } = useParams();
  const [article, setArticle] = useState(null);
  const [video, setVideo] = useState(null);
  const [relatedArticles, setRelatedArticles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [readingProgress, setReadingProgress] = useState(0);
  const articleRef = useRef(null);

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
            const actualArticle = data.data || data;
            setArticle(actualArticle);
            if (actualArticle._id) {
              articlesAPI.incrementViews(actualArticle._id).catch(() => { });
            }
          }

          // Also check if slug is a video MongoDB ID (for video-based articles)
          if (!data || !(data.data || data)) {
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

        // Fetch related articles - filtered by the current article's category
        try {
          const currentCategory = article?.category;
          const relatedParams = { limit: 4 };
          if (currentCategory) relatedParams.category = currentCategory;
          const allArticles = await articlesAPI.getAll(relatedParams).catch(() => []);
          const artArr = allArticles?.data || allArticles || [];
          setRelatedArticles(
            Array.isArray(artArr)
              ? artArr.filter(a => a.slug !== slug && a._id !== slug).slice(0, 3)
              : []
          );
        } catch {
          // non-fatal: related articles are optional
        }
      } catch (error) {
        console.error('Error fetching article:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchContent();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [slug, routeVideoId]);

  // Reading progress bar
  useEffect(() => {
    const handleScroll = () => {
      const scrollTop = window.scrollY;
      const docHeight = document.documentElement.scrollHeight - window.innerHeight;
      setReadingProgress(docHeight > 0 ? Math.min(100, (scrollTop / docHeight) * 100) : 0);
    };
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // Open Graph meta tag injection
  useEffect(() => {
    if (!article) return;
    document.title = `${article.title} | ZPluse News`;
    const setMeta = (property, content) => {
      let el = document.querySelector(`meta[property='${property}']`);
      if (!el) {
        el = document.createElement('meta');
        el.setAttribute('property', property);
        document.head.appendChild(el);
      }
      el.setAttribute('content', content);
    };
    setMeta('og:title', article.title);
    setMeta('og:description', article.excerpt || article.content?.substring(0, 160) || '');
    setMeta('og:image', article.image || `${window.location.origin}/assets/images/og-image.png`);
    setMeta('og:url', window.location.href);
    setMeta('og:type', 'article');
  }, [article]);

  // JSON-LD Schema Injection
  useEffect(() => {
    if (!article) return;
    
    // Create script element
    const script = document.createElement('script');
    script.type = 'application/ld+json';
    script.id = 'article-json-ld';
    
    // Build JSON-LD structured data
    const schemaData = {
      "@context": "https://schema.org",
      "@type": "NewsArticle",
      "headline": article.title,
      "image": [
        article.image || article.thumbnail || article.poster || ""
      ],
      "datePublished": article.date || article.createdAt || new Date().toISOString(),
      "dateModified": article.updatedAt || article.date || article.createdAt || new Date().toISOString(),
      "author": [{
        "@type": "Person",
        "name": typeof article.author === 'object' ? article.author?.name || 'Editorial Team' : article.author || 'Editorial Team',
        "url": window.location.origin
      }],
      "publisher": {
        "@type": "Organization",
        "name": "ZPluse News",
        "logo": {
          "@type": "ImageObject",
          "url": `${window.location.origin}/assets/images/logo.png`
        }
      },
      "description": article.excerpt || article.content?.replace(/<[^>]*>/g, '').substring(0, 160) || article.title
    };
    
    script.text = JSON.stringify(schemaData);
    document.head.appendChild(script);
    
    return () => {
      // Remove script element on unmount or when article changes
      const existingScript = document.getElementById('article-json-ld');
      if (existingScript) {
        existingScript.remove();
      }
    };
  }, [article]);

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

  // Extract clean YouTube ID — fixes Error 153 caused by full URLs stored as videoId
  const rawVideoId = video?.videoId || article?.videoId;
  const youtubeVideoId = extractYouTubeId(rawVideoId);
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
      {/* Sticky Reading Progress Bar */}
      <div
        className="reading-progress-bar"
        style={{ width: `${readingProgress}%` }}
        aria-hidden="true"
      />
      {/* Header Bar */}
      <div className="article-header-bar">
        <div className="container article-header-inner">
          <Link to="/" className="article-logo-link">
            <img
              src="/assets/images/logo.png"
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
                src={`https://www.youtube-nocookie.com/embed/${youtubeVideoId}?rel=0&modestbranding=1&origin=${window.location.origin}`}
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
          {/* Hero image: show when NOT a video-only article, or always if there is a cover image */}
          {(article.poster || article.image || article.thumbnail || article.coverImage) && !youtubeVideoId && (
            <div className="article-hero-img">
              <img
                src={article.poster || article.image || article.thumbnail || article.coverImage}
                alt={article.title}
                loading="eager"
                style={{ width: '100%', objectFit: 'cover' }}
                onError={(e) => {
                  e.target.onerror = null;
                  e.target.style.display = 'none';
                }}
              />
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
              ref={articleRef}
              className="article-content"
              dangerouslySetInnerHTML={{
                __html: DOMPurify.sanitize(
                  article.content || '<p>Article content is being generated. Please check back soon.</p>'
                )
              }}
            />
          </div>

          {/* Author Profile Box */}
          {article.author && typeof article.author === 'object' && article.author.name && (article.author.bio || article.author.avatar) && (
            <div className="author-bio-card" style={{ display: 'flex', gap: '20px', padding: '24px', background: 'rgba(255,255,255,0.03)', borderRadius: '16px', marginTop: '40px', marginBottom: '40px', border: '1px solid rgba(255,255,255,0.08)', alignItems: 'center', flexWrap: 'wrap' }}>
              {article.author.avatar ? (
                <img src={article.author.avatar} alt={article.author.name} style={{ width: '80px', height: '80px', borderRadius: '50%', objectFit: 'cover', border: '2px solid var(--primary)' }} />
              ) : (
                <div style={{ width: '80px', height: '80px', borderRadius: '50%', background: 'var(--primary)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '28px', color: '#fff', fontWeight: 'bold' }}>
                  {article.author.name.charAt(0).toUpperCase()}
                </div>
              )}
              <div style={{ flex: 1, minWidth: '250px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
                  <h3 style={{ margin: 0, fontSize: '18px', fontWeight: 700, color: 'var(--text-primary)' }}>{article.author.name}</h3>
                  <span style={{ fontSize: '11px', background: 'rgba(170, 33, 35, 0.15)', color: 'var(--primary)', padding: '2px 8px', borderRadius: '12px', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.5px' }}>Verified Contributor</span>
                </div>
                {article.author.bio && (
                  <p style={{ margin: 0, fontSize: '14px', color: 'var(--text-muted)', lineHeight: '1.6' }}>
                    {article.author.bio}
                  </p>
                )}
                <div style={{ display: 'flex', gap: '16px', marginTop: '4px' }}>
                  {article.author.linkedin && (
                    <a href={article.author.linkedin} target="_blank" rel="noopener noreferrer" style={{ color: '#0077b5', fontSize: '14px', textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '6px', fontWeight: 500 }} className="author-social-link">
                      <i className="fab fa-linkedin" style={{ fontSize: '16px' }}></i> LinkedIn
                    </a>
                  )}
                  {article.author.twitter && (
                    <a href={article.author.twitter} target="_blank" rel="noopener noreferrer" style={{ color: '#1da1f2', fontSize: '14px', textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '6px', fontWeight: 500 }} className="author-social-link">
                      <i className="fab fa-x-twitter" style={{ fontSize: '16px' }}></i> Twitter
                    </a>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Share Buttons */}
          <div className="article-share">
            <span>Share this article:</span>
            <div className="share-buttons">
              <a
                href={`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(window.location.href)}`}
                target="_blank"
                rel="noopener noreferrer"
                className="share-btn facebook"
                title="Share on Facebook"
              >
                <i className="fab fa-facebook-f"></i>
                <span>Facebook</span>
              </a>
              <a
                href={`https://twitter.com/intent/tweet?url=${encodeURIComponent(window.location.href)}&text=${encodeURIComponent(article.title)}`}
                target="_blank"
                rel="noopener noreferrer"
                className="share-btn twitter"
                title="Share on Twitter"
              >
                <i className="fab fa-x-twitter"></i>
                <span>Twitter</span>
              </a>
              <a
                href={`https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(window.location.href)}`}
                target="_blank"
                rel="noopener noreferrer"
                className="share-btn linkedin"
                title="Share on LinkedIn"
              >
                <i className="fab fa-linkedin-in"></i>
                <span>LinkedIn</span>
              </a>
              <a
                href={`https://wa.me/?text=${encodeURIComponent(article.title + ' ' + window.location.href)}`}
                target="_blank"
                rel="noopener noreferrer"
                className="share-btn whatsapp"
                title="Share on WhatsApp"
              >
                <i className="fab fa-whatsapp"></i>
                <span>WhatsApp</span>
              </a>
              <a
                href={`https://t.me/share/url?url=${encodeURIComponent(window.location.href)}&text=${encodeURIComponent(article.title)}`}
                target="_blank"
                rel="noopener noreferrer"
                className="share-btn telegram"
                title="Share on Telegram"
              >
                <i className="fab fa-telegram-plane"></i>
                <span>Telegram</span>
              </a>
              <a
                href={`https://reddit.com/submit?url=${encodeURIComponent(window.location.href)}&title=${encodeURIComponent(article.title)}`}
                target="_blank"
                rel="noopener noreferrer"
                className="share-btn reddit"
                title="Share on Reddit"
              >
                <i className="fab fa-reddit-alien"></i>
                <span>Reddit</span>
              </a>
              <a
                href={`https://pinterest.com/pin/create/button/?url=${encodeURIComponent(window.location.href)}&media=${encodeURIComponent(article.image || '')}&description=${encodeURIComponent(article.title)}`}
                target="_blank"
                rel="noopener noreferrer"
                className="share-btn pinterest"
                title="Share on Pinterest"
              >
                <i className="fab fa-pinterest-p"></i>
                <span>Pinterest</span>
              </a>
              <a
                href={`mailto:?subject=${encodeURIComponent(article.title)}&body=${encodeURIComponent(window.location.href)}`}
                className="share-btn email"
                title="Share via Email"
              >
                <i className="fas fa-envelope"></i>
                <span>Email</span>
              </a>
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
    </motion.div>
  );
}
