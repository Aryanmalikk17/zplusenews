import CategoryPageLayout from '../components/layout/CategoryPageLayout';

export default function Technology() {
    return (
        <CategoryPageLayout
            category="technology"
            title="Technology"
            subtitle="Tech Innovations"
            description="Cutting-edge technology news, gadget reviews, AI developments, and digital transformation"
            accentColor="#6366f1"
            heroImage="https://images.unsplash.com/photo-1518770660439-4636190af475?w=1600&q=80"
            iconClass="fa-solid fa-microchip"
        />
    );
}
