import CategoryPageLayout from '../components/layout/CategoryPageLayout';

export default function Agriculture() {
    return (
        <CategoryPageLayout
            category="agriculture"
            title="Agriculture"
            subtitle="Farming & Rural Economy"
            description="Agricultural technology, crop science, farming policies, and rural market trends"
            accentColor="#10b981"
            heroImage="https://images.unsplash.com/photo-1500937386664-56d1590d333c?w=1600&q=80"
            iconClass="fa-solid fa-wheat-awn"
        />
    );
}
