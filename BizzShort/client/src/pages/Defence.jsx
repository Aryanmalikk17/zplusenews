import CategoryPageLayout from '../components/layout/CategoryPageLayout';

export default function Defence() {
    return (
        <CategoryPageLayout
            category="defence"
            title="Defence"
            subtitle="Security & Strategy"
            description="National security, military technology, geopolitical strategy, and armed forces updates"
            accentColor="#1e3a8a"
            heroImage="https://images.unsplash.com/photo-1507679799987-c73779587ccf?w=1600&q=80"
            iconClass="fa-solid fa-shield-halved"
        />
    );
}
