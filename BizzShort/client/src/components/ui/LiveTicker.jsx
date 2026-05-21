import { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { tickerAPI } from '../../services/api';
import '../../styles/components.css';

export default function LiveTicker() {
    const tickerRef = useRef(null);
    const [tickerData, setTickerData] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchLiveTicker = async () => {
            try {
                const response = await tickerAPI.getLive();
                // response is already destructured because response interceptor returns response.data
                if (response?.success && response?.data) {
                    setTickerData(response.data);
                }
            } catch (error) {
                console.error('Failed to fetch live ticker:', error);
            } finally {
                setLoading(false);
            }
        };

        fetchLiveTicker();
        
        // Refresh ticker data every 5 minutes (300,000 ms)
        const intervalId = setInterval(fetchLiveTicker, 300000);
        return () => clearInterval(intervalId);
    }, []);

    // Helper to generate the list of items to display in the marquee
    const getMarqueeItems = () => {
        if (!tickerData) return [];

        const items = [];
        const { stocks, commodities, fuel, civic, general, dbCommodity, dbFinancial } = tickerData;

        // 1. Financial / Stocks
        if (stocks && stocks.length > 0) {
            stocks.forEach(stock => {
                items.push({
                    type: 'stock',
                    label: stock.name,
                    value: `₹${stock.price.toLocaleString('en-IN')}`,
                    change: `${stock.change >= 0 ? '+' : ''}${stock.change} (${stock.percentage}%)`,
                    up: stock.up,
                    icon: 'fa-solid fa-chart-line'
                });
            });
        }

        // 2. Commodities (Gold, Silver, and dbCommodity)
        if (commodities && commodities.length > 0) {
            commodities.forEach(item => {
                items.push({
                    type: 'commodity',
                    label: item.name,
                    value: `₹${item.price.toLocaleString('en-IN')}`,
                    change: `${item.change >= 0 ? '+' : ''}${item.change} (${item.percentage}%)`,
                    up: item.up,
                    icon: 'fa-solid fa-coins'
                });
            });
        }

        if (dbCommodity && dbCommodity.length > 0) {
            dbCommodity.forEach(item => {
                items.push({
                    type: 'db-commodity',
                    label: 'Commodity News',
                    title: item.title,
                    link: item.type === 'article' ? `/article/${item.slug}` : `/video/${item.videoId}`,
                    icon: 'fa-solid fa-gem'
                });
            });
        }

        // 3. Fuel Prices
        if (fuel && fuel.length > 0) {
            fuel.forEach(item => {
                items.push({
                    type: 'fuel',
                    label: item.name,
                    value: `₹${item.price.toFixed(2)}/L`,
                    change: `${item.change >= 0 ? '+' : ''}${item.change} (${item.percentage}%)`,
                    up: item.up,
                    icon: 'fa-solid fa-gas-pump'
                });
            });
        }

        // 4. Civic updates
        if (civic && civic.length > 0) {
            civic.forEach(item => {
                items.push({
                    type: 'civic',
                    label: 'Civic Update',
                    title: item.title,
                    link: item.type === 'article' ? `/article/${item.slug}` : `/video/${item.videoId}`,
                    icon: 'fa-solid fa-bullhorn'
                });
            });
        }

        // 5. General breaking updates
        if (general && general.length > 0) {
            general.forEach(item => {
                items.push({
                    type: 'general',
                    label: 'Breaking',
                    title: item.title,
                    link: item.type === 'article' ? `/article/${item.slug}` : `/video/${item.videoId}`,
                    icon: 'fa-solid fa-bolt'
                });
            });
        }

        // 6. DB Financial updates if any
        if (dbFinancial && dbFinancial.length > 0) {
            dbFinancial.forEach(item => {
                items.push({
                    type: 'db-financial',
                    label: 'Financial Update',
                    title: item.title,
                    link: item.type === 'article' ? `/article/${item.slug}` : `/video/${item.videoId}`,
                    icon: 'fa-solid fa-scale-balanced'
                });
            });
        }

        return items;
    };

    const items = getMarqueeItems();

    // Default/Loading items as fallback
    const defaultItems = [
        { type: 'general', label: 'News Ticker', title: 'Zplus Live Ticker - Gathering real-time Indian stock market index values and local commodity updates...', icon: 'fa-solid fa-rss' },
        { type: 'general', label: 'Stocks', title: 'Sensex and Nifty updates loading...', icon: 'fa-solid fa-chart-line' }
    ];

    const displayItems = items.length > 0 ? items : defaultItems;
    // Duplicate the array to ensure seamless infinite looping scroll
    const duplicatedItems = [...displayItems, ...displayItems, ...displayItems];

    return (
        <div className="trending-ticker live-ticker-bar">
            <div className="container">
                <div className="ticker-wrapper">
                    <span className="ticker-label live-badge-label">
                        <span className="live-pulse-dot"></span>
                        <i className="fa-solid fa-clock-rotate-left" style={{ marginRight: '6px' }}></i>
                        {loading ? 'Updating...' : 'Live Ticker'}
                    </span>
                    <div className="ticker-content-container">
                        <div className="ticker-content" ref={tickerRef}>
                            {duplicatedItems.map((item, index) => (
                                <span key={index} className="ticker-item live-ticker-item">
                                    <span className="ticker-item-category">
                                        <i className={`${item.icon} ticker-cat-icon`}></i>
                                        {item.label}:
                                    </span>
                                    {item.value ? (
                                        <span className="ticker-market-value">
                                            <span className="ticker-numeric">{item.value}</span>
                                            <span className={`ticker-change-indicator ${item.up ? 'up' : 'down'}`}>
                                                <i className={`fa-solid ${item.up ? 'fa-caret-up' : 'fa-caret-down'}`}></i>
                                                {item.change}
                                            </span>
                                        </span>
                                    ) : item.link ? (
                                        <Link to={item.link} className="ticker-news-title">
                                            {item.title}
                                            <i className="fa-solid fa-arrow-up-right-from-square ticker-external-icon"></i>
                                        </Link>
                                    ) : (
                                        <span className="ticker-news-title-static">{item.title}</span>
                                    )}
                                    <span className="ticker-divider">•</span>
                                </span>
                            ))}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
