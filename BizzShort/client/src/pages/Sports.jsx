import CategoryPageLayout from '../components/layout/CategoryPageLayout';

export default function Sports() {
    return (
        <CategoryPageLayout
            category="sports"
            title="Sports"
            subtitle="Game On"
            description="Live sports coverage, match analysis, athlete stories, and tournament updates"
            accentColor="#f97316"
            heroImage="https://images.unsplash.com/photo-1461896836934-ffe607ba8211?w=1600&q=80"
            iconClass="fa-solid fa-trophy"
        />
    );
}
