import { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { newsAPI } from '../../services/api';
import '../../styles/components.css';

export default function TrendingTicker({ items = [] }) {
    const tickerRef = useRef(null);
    const [trendingItems, setTrendingItems] = useState([]);
    const [loading, setLoading] = useState(true);

    // Default trending items as fallback
    const defaultItems = [
        { title: 'AI Revolution: GPT-5 Expected to Transform Industries in 2026', slug: 'ai-gpt5' },
        { title: 'Tech Giants Report Record Q4 Earnings', slug: 'tech-earnings' },
        { title: 'Indian Startups Raise $15B in 2025', slug: 'indian-startups' },
        { title: 'Quantum Computing Breakthrough Announced', slug: 'quantum-breakthrough' },
        { title: 'Electric Vehicle Sales Surge 40% Globally', slug: 'ev-sales' },
    ];

    useEffect(() => {
        // If items are passed as props, use them
        if (items.length > 0) {
            setTrendingItems(items);
            setLoading(false);
            return;
        }

        // Fetch trending news from CurrentsAPI
        const fetchTrending = async () => {
            try {
                const response = await newsAPI.getTrending();
                if (response?.data && response.data.length > 0) {
                    const formattedItems = response.data.slice(0, 8).map(article => ({
                        title: article.title,
                        slug: article.slug || article._id,
                        isExternal: article.isExternal,
                        url: article.source?.url,
                    }));
                    setTrendingItems(formattedItems);
                } else {
                    setTrendingItems(defaultItems);
                }
            } catch (error) {
                console.log('Failed to fetch trending, using defaults');
                setTrendingItems(defaultItems);
            } finally {
                setLoading(false);
            }
        };

        fetchTrending();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [items.length]); // Use items.length to prevent infinite loop from array reference changes

    // Duplicate items for infinite scroll effect
    const displayItems = trendingItems.length > 0 ? trendingItems : defaultItems;
    const duplicatedItems = [...displayItems, ...displayItems];

    return (
        <div className="trending-ticker">
            <div className="container">
                <div className="ticker-wrapper">
                    <span className="ticker-label">
                        <svg viewBox="0 0 24 24" fill="currentColor" width="14" height="14">
                            <path d="M7 2v11h3v9l7-12h-4l4-8z" />
                        </svg>
                        {loading ? 'Loading...' : 'Trending'}
                        {!loading && trendingItems.some(item => item.isExternal) && (
                            <span className="live-indicator" title="Live News">
                                <i className="fa-solid fa-signal"></i>
                            </span>
                        )}
                    </span>
                    <div className="ticker-content" ref={tickerRef}>
                        {duplicatedItems.map((item, index) => (
                            <span key={index} className="ticker-item">
                                {item.isExternal ? (
                                    <a
                                        href={item.url}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="external-ticker-link"
                                    >
                                        {item.title}
                                        <i className="fa-solid fa-arrow-up-right-from-square ticker-external-icon"></i>
                                    </a>
                                ) : (
                                    <Link to={`/article/${item.slug}`}>
                                        {item.title}
                                    </Link>
                                )}
                            </span>
                        ))}
                    </div>
                </div>
            </div>
        </div>
    );
}
