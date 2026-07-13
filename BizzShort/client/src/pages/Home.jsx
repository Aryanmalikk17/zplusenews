import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { articlesAPI, adsAPI } from '../services/api';
import LiveTicker from '../components/ui/LiveTicker';
import InteractiveCalendar from '../components/ui/InteractiveCalendar';
import CategoryRow from '../components/CategoryRow';
import VideoRow from '../components/VideoRow';
import ArticleCard from '../components/ui/ArticleCard';
import SponsorAd from '../components/ui/SponsorAd';
import { CATEGORIES } from '../config/categories';
import '../styles/components.css';

export default function Home() {
    const [featuredArticles, setFeaturedArticles] = useState([]);
    const [adsMap, setAdsMap] = useState({});
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchHomeData = async () => {
            try {
                // Fetch 5 latest articles for the Hero section and ads
                const [articlesRes, adsRes] = await Promise.all([
                    articlesAPI.getPublicList({ limit: 5 }),
                    adsAPI.inject({ pageType: 'home' })
                ]);
                
                const articlesData = articlesRes?.data || articlesRes || [];
                setFeaturedArticles(Array.isArray(articlesData) ? articlesData : []);
                
                const adsData = adsRes?.data || adsRes || {};
                setAdsMap(adsData);
            } catch (error) {
                console.error('Error fetching homepage data:', error);
            } finally {
                setLoading(false);
            }
        };

        fetchHomeData();
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

    const adH1 = adsMap['H1'] || adsMap['legacy-banner'];
    const sidebarAd = adsMap['legacy-sidebar'];
    const adH2 = adsMap['H2'];

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

                        {/* Dynamic Inline Sponsor Banner */}
                        {adH1 && (
                            <div className="inline-ad-container glass-card" style={{ margin: '30px 0', padding: '12px', textAlign: 'center', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-lg)', background: 'rgba(255, 255, 255, 0.02)' }}>
                                <span className="ad-label" style={{ display: 'block', fontSize: '10px', textTransform: 'uppercase', color: 'var(--text-muted)', fontWeight: '700', marginBottom: '8px', letterSpacing: '1px' }}>Sponsor Advertisement</span>
                                <div className="inline-ad-wrapper" style={{ height: '90px', maxWidth: '728px', margin: '0 auto', overflow: 'hidden', borderRadius: 'var(--radius-md)' }}>
                                    <SponsorAd ad={adH1} />
                                </div>
                            </div>
                        )}

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
                    
                    {/* Advertisement space (Primary) */}
                    <div className="sidebar-ad-space glass-card">
                        <span className="ad-label">Advertisement</span>
                        <SponsorAd 
                            ad={sidebarAd}
                            fallback={
                                <div className="ad-placeholder">
                                    <i className="fa-solid fa-rectangle-ad" style={{ fontSize: '36px', color: 'var(--primary)', marginBottom: '10px' }}></i>
                                    <p style={{ fontSize: '14px', fontWeight: '600', margin: 0 }}>Zplus Premium Sponsor</p>
                                    <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Ad slots available. Contact sales.</span>
                                </div>
                            }
                        />
                    </div>

                    {/* Advertisement Space 2 (Slot H2) */}
                    {adH2 && (
                        <div className="sidebar-ad-space glass-card" style={{ marginTop: '20px' }}>
                            <span className="ad-label">Sponsored Partner</span>
                            <SponsorAd ad={adH2} />
                        </div>
                    )}
                </aside>
            </div>
        </div>
    );
}
