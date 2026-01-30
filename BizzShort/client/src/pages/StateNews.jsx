import CategoryPageLayout from '../components/layout/CategoryPageLayout';

export default function StateNews() {
    return (
        <CategoryPageLayout
            category="state"
            title="State News"
            subtitle="Regional Pulse"
            description="State-level news, local governance, regional developments, and community stories"
            accentColor="#138808"
            heroImage="https://images.unsplash.com/photo-1524492412937-b28074a5d7da?w=1600&q=80"
            iconClass="fa-solid fa-map-location-dot"
        />
    );
}
