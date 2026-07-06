import CategoryPageLayout from '../components/layout/CategoryPageLayout';

export default function Tourism() {
    return (
        <CategoryPageLayout
            category="tourism"
            title="Tourism & Travel"
            subtitle="Explore the World"
            description="Travel updates, tourism insights, destinations, and cultural highlights"
            accentColor="#e11d48"
            heroImage="https://images.unsplash.com/photo-1488646953014-85cb44e25828?w=1600&q=80"
            iconClass="fa-solid fa-plane-departure"
        />
    );
}
