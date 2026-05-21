import CategoryPageLayout from '../components/layout/CategoryPageLayout';

export default function Geography() {
    return (
        <CategoryPageLayout
            category="geography"
            title="Geography"
            subtitle="Earth & Exploration"
            description="Geographical discoveries, map updates, environmental changes, and regional studies"
            accentColor="#3b82f6"
            heroImage="https://images.unsplash.com/photo-1451187580459-43490279c0fa?w=1600&q=80"
            iconClass="fa-solid fa-map-location-dot"
        />
    );
}
