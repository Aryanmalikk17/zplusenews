import { useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import '../../styles/components.css';

export default function TrendingTicker({ items = [] }) {
    const tickerRef = useRef(null);

    // Default trending items
    const trendingItems = items.length > 0 ? items : [
        { title: 'AI Revolution: GPT-5 Expected to Transform Industries in 2026', slug: 'ai-gpt5' },
        { title: 'Tech Giants Report Record Q4 Earnings', slug: 'tech-earnings' },
        { title: 'Indian Startups Raise $15B in 2025', slug: 'indian-startups' },
        { title: 'Quantum Computing Breakthrough Announced', slug: 'quantum-breakthrough' },
        { title: 'Electric Vehicle Sales Surge 40% Globally', slug: 'ev-sales' },
    ];

    // Duplicate items for infinite scroll effect
    const duplicatedItems = [...trendingItems, ...trendingItems];

    return (
        <div className="trending-ticker">
            <div className="container">
                <div className="ticker-wrapper">
                    <span className="ticker-label">
                        <svg viewBox="0 0 24 24" fill="currentColor" width="14" height="14">
                            <path d="M7 2v11h3v9l7-12h-4l4-8z" />
                        </svg>
                        Trending
                    </span>
                    <div className="ticker-content" ref={tickerRef}>
                        {duplicatedItems.map((item, index) => (
                            <span key={index} className="ticker-item">
                                <Link to={`/article/${item.slug}`}>
                                    {item.title}
                                </Link>
                            </span>
                        ))}
                    </div>
                </div>
            </div>
        </div>
    );
}
