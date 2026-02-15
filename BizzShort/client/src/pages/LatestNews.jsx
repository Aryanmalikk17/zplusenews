import CategoryPageLayout from '../components/layout/CategoryPageLayout';

export default function LatestNews() {
    return (
        <CategoryPageLayout
            category="latest"
            title="Latest Headlines"
            subtitle="Breaking News"
            description="Stay updated with the most recent stories, analysis, and reports from around the world."
            accentColor="#EF4444"
            heroImage="https://images.unsplash.com/photo-1504711434969-e33886168f5c?w=1600&q=80"
            iconClass="fa-solid fa-clock"
        />
    );
}
