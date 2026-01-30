import CategoryPageLayout from '../components/layout/CategoryPageLayout';

export default function Economics() {
    return (
        <CategoryPageLayout
            category="economics"
            title="Economics"
            subtitle="Market Watch"
            description="Financial markets, economic trends, business analysis, and investment insights"
            accentColor="#f59e0b"
            heroImage="https://images.unsplash.com/photo-1611974789855-9c2a0a7236a3?w=1600&q=80"
            iconClass="fa-solid fa-chart-line"
        />
    );
}
