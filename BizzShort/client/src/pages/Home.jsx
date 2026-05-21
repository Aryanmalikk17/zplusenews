import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { articlesAPI } from '../services/api';
import LiveTicker from '../components/ui/LiveTicker';
import InteractiveCalendar from '../components/ui/InteractiveCalendar';
import CategoryRow from '../components/CategoryRow';
import VideoRow from '../components/VideoRow';
import ArticleCard from '../components/ui/ArticleCard';
import { CATEGORIES } from '../config/categories';
import '../styles/components.css';

export default function Home() {
    const [featuredArticles, setFeaturedArticles] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchHeroData = async () => {
            try {
                // Fetch 5 latest articles for the Hero section
                const response = await articlesAPI.getPublicList({ limit: 5 });
                const data = response?.data || response || [];
                setFeaturedArticles(Array.isArray(data) ? data : []);
            } catch (error) {
                console.error('Error fetching hero data:', error);
            } finally {
                setLoading(false);
            }
        };

        fetchHeroData();
    }, []);

    if (loading) {
        return (
            <div className="home-page">
                <div className="loading-container">
                    <div className="loading-spinner"></div>
                    <p>Preparing your news feed...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="home-page">
            {/* Live Ticker */}
            <LiveTicker />

            <div className="container home-layout-container">
                {/* Main Content (72%) */}
                <div className="home-main-content">
                    {/* ============ FEATURED HERO SECTION ============ */}
                    {featuredArticles.length > 0 && (
                        <section className="section hero-section" style={{ padding: '20px 0 40px 0' }}>
                            <div className="hero-grid">
                                {/* Main Featured Article */}
                                <div className="hero-main">
                                    <ArticleCard 
                                        article={featuredArticles[0]} 
                                        variant="featured" 
                                    />
                                </div>

                                {/* Secondary Featured List */}
                                <div className="hero-side">
                                    <div className="hero-side-list">
                                        {featuredArticles.slice(1, 4).map((article, index) => (
                                            <ArticleCard 
                                                key={article._id || index} 
                                                article={article} 
                                                variant="compact" 
                                                index={index}
                                            />
                                        ))}
                                    </div>
                                </div>
                            </div>
                        </section>
                    )}

                    {/* ============ DYNAMIC CATEGORY ROWS ============ */}
                    <div className="category-rows-container">
                        {CATEGORIES.slice(0, 2).map((cat) => (
                            <CategoryRow 
                                key={cat.id}
                                categoryId={cat.id}
                                title={cat.label}
                                path={cat.path}
                            />
                        ))}

                        {/* Video Highlights Section */}
                        <VideoRow />

                        {CATEGORIES.slice(2).map((cat) => (
                            <CategoryRow 
                                key={cat.id}
                                categoryId={cat.id}
                                title={cat.label}
                                path={cat.path}
                            />
                        ))}
                    </div>
                </div>

                {/* Sidebar (28%) */}
                <aside className="home-sidebar">
                    <InteractiveCalendar />
                    
                    {/* Advertisement space */}
                    <div className="sidebar-ad-space glass-card">
                        <span className="ad-label">Advertisement</span>
                        <div className="ad-placeholder">
                            <i className="fa-solid fa-rectangle-ad" style={{ fontSize: '36px', color: 'var(--primary)', marginBottom: '10px' }}></i>
                            <p style={{ fontSize: '14px', fontWeight: '600', margin: 0 }}>Zplus Premium Sponsor</p>
                            <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Ad slots available. Contact sales.</span>
                        </div>
                    </div>
                </aside>
            </div>
        </div>
    );
}
