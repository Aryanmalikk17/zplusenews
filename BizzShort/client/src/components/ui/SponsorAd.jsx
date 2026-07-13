import { useEffect, useRef } from 'react';
import { adsAPI } from '../../services/api';

/**
 * SponsorAd Component
 * Renders a clickable sponsor ad poster and handles dynamic impression (scrolled into viewport) and click tracking.
 */
export default function SponsorAd({ ad, fallback, className = "" }) {
  const containerRef = useRef(null);

  useEffect(() => {
    if (!ad || !ad._id) return;

    const observer = new IntersectionObserver((entries) => {
      if (entries[0].isIntersecting) {
        adsAPI.trackImpression(ad._id).catch(err => 
          console.error('Error tracking ad impression:', err)
        );
        // Connect only once per mount
        observer.disconnect();
      }
    }, { threshold: 0.5 }); // 50% visibility threshold

    if (containerRef.current) {
      observer.observe(containerRef.current);
    }

    return () => {
      observer.disconnect();
    };
  }, [ad?._id]);

  if (!ad) return fallback || null;

  const handleClick = () => {
    if (ad._id) {
      adsAPI.trackClick(ad._id).catch(err => 
        console.error('Error tracking ad click:', err)
      );
    }
  };

  return (
    <a
      ref={containerRef}
      href={ad.targetUrl}
      target="_blank"
      rel="noopener noreferrer"
      onClick={handleClick}
      className={`sponsor-ad-link ${className}`}
      title={ad.altText || ad.title}
      style={{ display: 'block', width: '100%', height: '100%', overflow: 'hidden' }}
    >
      <img
        src={ad.imageUrl}
        alt={ad.altText || ad.title || 'Advertisement'}
        style={{
          width: '100%',
          height: '100%',
          objectFit: 'cover',
          display: 'block',
          borderRadius: 'inherit',
          transition: 'transform 0.3s ease'
        }}
        onError={(e) => {
          e.target.style.display = 'none';
        }}
      />
    </a>
  );
}
