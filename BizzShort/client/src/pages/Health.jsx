import CategoryPageLayout from '../components/layout/CategoryPageLayout';

export default function Health() {
    return (
        <CategoryPageLayout
            category="health"
            title="Health"
            subtitle="Wellness & Medicine"
            description="Latest medical updates, health tips, policy news, and wellness research"
            accentColor="#ef4444"
            heroImage="https://images.unsplash.com/photo-1506126613408-eca07ce68773?w=1600&q=80"
            iconClass="fa-solid fa-heart-pulse"
        />
    );
}
