import CategoryPageLayout from '../components/layout/CategoryPageLayout';

export default function PositiveNews() {
    return (
        <CategoryPageLayout
            category="positive"
            title="Positive News"
            subtitle="Good News Only"
            description="Inspiring, uplifting, and positive stories from across the globe"
            accentColor="#10b981"
            heroImage="https://images.unsplash.com/photo-1516627145497-ae6968895b74?w=1600&q=80"
            iconClass="fa-solid fa-face-smile"
        />
    );
}
