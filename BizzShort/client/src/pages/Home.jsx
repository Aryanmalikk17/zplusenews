import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { articlesAPI } from '../services/api';
import TrendingTicker from '../components/ui/TrendingTicker';
import CategoryRow from '../components/CategoryRow';
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
            {/* Trending Ticker */}
            <TrendingTicker />

            {/* ============ FEATURED HERO SECTION ============ */}
            {featuredArticles.length > 0 && (
                <section className="section hero-section">
                    <div className="container">
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
                    </div>
                </section>
            )}

            {/* ============ DYNAMIC CATEGORY ROWS ============ */}
            <div className="category-rows-container">
                {CATEGORIES.map((cat) => (
                    <CategoryRow 
                        key={cat.id}
                        categoryId={cat.id}
                        title={cat.label}
                        path={cat.path}
                    />
                ))}
            </div>

            {/* Optional: Add a "More News" or "Video News" section if needed later */}
        </div>
    );
}
